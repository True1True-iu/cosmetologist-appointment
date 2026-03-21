const TELEGRAM_API_BASE = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";
const TELEGRAM_TIMEOUT_MS = Number(process.env.TELEGRAM_REQUEST_TIMEOUT_MS || 5000);
const TELEGRAM_RETRY_COUNT = Math.max(0, Number(process.env.TELEGRAM_RETRY_COUNT || 2));
const { execFile } = require("child_process");

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  const normalized = String(value).toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return defaultValue;
};

const formatValue = (value) => (value === undefined || value === null || value === "" ? "—" : String(value));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const execFileAsync = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });

const getTelegramConfig = () => {
  const enabled = parseBoolean(process.env.TELEGRAM_NOTIFICATIONS_ENABLED, true);
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || "";
  const missing = [];
  if (!botToken) missing.push("TELEGRAM_BOT_TOKEN");
  if (!adminChatId) missing.push("TELEGRAM_ADMIN_CHAT_ID");

  return {
    enabled,
    botToken,
    adminChatId,
    missing,
    timeoutMs: Number.isFinite(TELEGRAM_TIMEOUT_MS) ? TELEGRAM_TIMEOUT_MS : 5000,
    retryCount: Number.isFinite(TELEGRAM_RETRY_COUNT) ? TELEGRAM_RETRY_COUNT : 2
  };
};

const getTelegramIntegrationStatus = () => {
  const config = getTelegramConfig();
  return {
    enabled: config.enabled,
    configured: config.missing.length === 0,
    missing: config.missing
  };
};

const composeAppointmentMessage = (eventType, details) => {
  const statusLabels = {
    pending: "ожидает подтверждения",
    confirmed: "подтверждена",
    cancelled: "отменена",
    completed: "завершена"
  };
  const eventLabels = {
    appointment_created: "Новая запись",
    appointment_cancelled: "Запись отменена",
    appointment_rescheduled: "Запись перенесена",
    appointment_status_changed: "Статус записи обновлён"
  };
  const statusLabel = statusLabels[String(details?.status || "").toLowerCase()] || formatValue(details?.status);

  const header = eventLabels[eventType] || "Событие по записи";
  return [
    `*${header}*`,
    "",
    `Услуга: ${formatValue(details?.serviceName)}`,
    `Дата: ${formatValue(details?.date)}`,
    `Время: ${formatValue(details?.startTime)}${details?.endTime ? ` – ${details.endTime}` : ""}`,
    `Клиент: ${formatValue(details?.clientName)}`,
    `Телефон: ${formatValue(details?.clientPhone)}`,
    `Статус: ${statusLabel}`
  ].join("\n");
};

const sendTelegramRequest = async (method, payload) => {
  const config = getTelegramConfig();
  if (!config.enabled) {
    throw new Error("Telegram notifications are disabled");
  }
  if (config.missing.length > 0) {
    throw new Error(`Telegram is not configured. Missing: ${config.missing.join(", ")}`);
  }

  const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/${method}`;
  const maxAttempts = config.retryCount + 1;
  let lastError = null;

  const trySendViaPowerShell = async () => {
    const timeoutSec = Math.max(5, Math.ceil(config.timeoutMs / 1000));
    const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    const script = [
      `$payloadJson = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${payloadBase64}'))`,
      `$response = Invoke-RestMethod -Method Post -Uri '${url}' -Body $payloadJson -ContentType 'application/json; charset=utf-8' -TimeoutSec ${timeoutSec}`,
      `$response | ConvertTo-Json -Depth 15 -Compress`
    ].join("\n");

    const { stdout } = await execFileAsync(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      {
        timeout: config.timeoutMs + 5000,
        windowsHide: true,
        maxBuffer: 2 * 1024 * 1024
      }
    );

    const text = String(stdout || "").trim();
    if (!text) {
      throw new Error("PowerShell transport returned empty response");
    }
    const parsed = JSON.parse(text);
    if (!parsed?.ok) {
      throw new Error(parsed?.description || "PowerShell transport returned non-ok response");
    }
    // eslint-disable-next-line no-console
    console.log(`[TELEGRAM] <- method=${method} transport=powershell body=${text.slice(0, 300)}`);
    return parsed.result;
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      // eslint-disable-next-line no-console
      console.log(
        `[TELEGRAM] -> method=${method} attempt=${attempt}/${maxAttempts} payload=${JSON.stringify({
          ...payload,
          text: payload?.text ? `${String(payload.text).slice(0, 180)}...` : ""
        })}`
      );

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const raw = await response.text();
      let parsed = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch (_err) {
        parsed = null;
      }

      // eslint-disable-next-line no-console
      console.log(
        `[TELEGRAM] <- method=${method} attempt=${attempt}/${maxAttempts} status=${response.status} body=${raw.slice(
          0,
          300
        )}`
      );

      if (!response.ok || !parsed?.ok) {
        const error = new Error(parsed?.description || `Telegram request failed with status ${response.status}`);
        error.status = response.status;
        throw error;
      }

      clearTimeout(timeoutId);
      return parsed.result;
    } catch (error) {
      clearTimeout(timeoutId);
      let currentError = error;

      const errorCode = currentError?.cause?.code || currentError?.code || "";
      const shouldUseWindowsFallback =
        process.platform === "win32" &&
        (String(currentError.message || "").toLowerCase().includes("fetch failed") ||
          String(errorCode).includes("UND_ERR_CONNECT_TIMEOUT"));

      if (shouldUseWindowsFallback) {
        try {
          // eslint-disable-next-line no-console
          console.warn(`[TELEGRAM] trying windows powershell fallback method=${method} attempt=${attempt}/${maxAttempts}`);
          const result = await trySendViaPowerShell();
          return result;
        } catch (fallbackError) {
          currentError = fallbackError;
        }
      }

      lastError = currentError;

      const retryableStatus = Number(currentError?.status);
      const isRetryableStatus = Number.isFinite(retryableStatus) && retryableStatus >= 500;
      const isTimeout = currentError?.name === "AbortError";
      const isNetworkError = !Number.isFinite(retryableStatus);
      const shouldRetry = attempt < maxAttempts && (isTimeout || isNetworkError || isRetryableStatus);

      // eslint-disable-next-line no-console
      console.error(
        `[TELEGRAM] !! method=${method} attempt=${attempt}/${maxAttempts} error=${currentError.message} retry=${shouldRetry}`
      );

      if (!shouldRetry) break;
      await sleep(Math.min(1000 * attempt, 5000));
    }
  }

  throw lastError || new Error("Telegram request failed");
};

const sendAppointmentNotification = async (eventType, details) => {
  const config = getTelegramConfig();
  const text = composeAppointmentMessage(eventType, details);
  return sendTelegramRequest("sendMessage", {
    chat_id: config.adminChatId,
    text,
    parse_mode: "Markdown"
  });
};

const sendTestTelegramMessage = async (message) => {
  const config = getTelegramConfig();
  return sendTelegramRequest("sendMessage", {
    chat_id: config.adminChatId,
    text: message || "Тестовое сообщение от CosmoBook",
    parse_mode: "Markdown"
  });
};

module.exports = {
  getTelegramIntegrationStatus,
  sendAppointmentNotification,
  sendTestTelegramMessage
};
