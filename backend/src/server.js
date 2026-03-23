const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env"), override: true });

const { supabaseAdmin, supabaseAuth } = require("./supabase");
const {
  getTelegramIntegrationStatus,
  sendAppointmentNotification,
  sendTestTelegramMessage
} = require("./telegram");
const {
  authRequired,
  requireAdminRole,
  validateBody,
  validateParam,
  EMAIL_RE,
  UUID_RE,
  DATE_RE,
  TIME_RE,
  VALID_STATUSES,
  VALID_ROLES
} = require("./middleware");

const app = express();
const port = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === "production";
const configuredOrigins = String(process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set(
  isProduction
    ? configuredOrigins
    : [...configuredOrigins, "http://localhost:5173", "http://localhost:5174"]
);
const localhostOriginPattern = /^http:\/\/localhost:\d+$/;
const getPublicErrorMessage = (error, fallback) =>
  !isProduction && error?.message ? error.message : fallback;
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX = 10;
const authRateLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Слишком много попыток входа или регистрации. Попробуйте снова через 15 минут."
  }
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const isAllowedLocalhost = !isProduction && localhostOriginPattern.test(origin);
      if (allowedOrigins.has(origin) || isAllowedLocalhost) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  })
);
app.use(express.json());
app.use((req, res, next) => {
  const startedAt = Date.now();
  const requestId = `${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
  // eslint-disable-next-line no-console
  console.log(`[HTTP] -> id=${requestId} method=${req.method} path=${req.originalUrl} ip=${req.ip}`);
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(
      `[HTTP] <- id=${requestId} method=${req.method} path=${req.originalUrl} status=${res.statusCode} duration_ms=${durationMs}`
    );
  });
  next();
});

const normalizeTime = (value) => String(value || "").slice(0, 5);

const addMinutesToTime = (startTime, minutesToAdd) => {
  const normalized = normalizeTime(startTime);
  const [hoursStr, minutesStr] = normalized.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  const duration = Number(minutesToAdd);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return null;
  }

  const endTotalMinutes = hours * 60 + minutes + duration;
  if (endTotalMinutes >= 24 * 60) {
    return null;
  }

  const endHours = Math.floor(endTotalMinutes / 60);
  const endMinutes = endTotalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
};

const mapAppointmentNotificationData = (row) => {
  if (!row) return null;
  return {
    appointmentId: row.id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    serviceName: row.service?.name || null
  };
};

const getAppointmentNotificationData = async (appointmentId) => {
  if (!appointmentId) return null;
  const result = await supabaseAdmin
    .from("appointments")
    .select(
      `
      id,
      date,
      start_time,
      end_time,
      status,
      client_name,
      client_phone,
      service:services ( name )
    `
    )
    .eq("id", appointmentId)
    .maybeSingle();
  if (result.error || !result.data) return null;
  return mapAppointmentNotificationData(result.data);
};

const notifyAppointmentEventNonBlocking = async (eventType, appointmentId, fallbackData = null) => {
  try {
    const payload = (await getAppointmentNotificationData(appointmentId)) || fallbackData;
    if (!payload) {
      // eslint-disable-next-line no-console
      console.warn(
        `[TELEGRAM] notification skipped event=${eventType} appointment_id=${appointmentId || "unknown"} reason=no_payload`
      );
      return;
    }
    await sendAppointmentNotification(eventType, payload);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `[TELEGRAM] notification failed event=${eventType} appointment_id=${appointmentId || "unknown"} error=${error.message}`
    );
  }
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/admin/integrations/telegram/status", authRequired, requireAdminRole, (_req, res) => {
  const status = getTelegramIntegrationStatus();
  res.json({ telegram: status });
});

app.post("/api/admin/integrations/telegram/test", authRequired, requireAdminRole, async (req, res) => {
  const { message } = req.body || {};
  const status = getTelegramIntegrationStatus();
  if (!status.enabled) {
    return res.status(400).json({ error: "Telegram уведомления отключены (TELEGRAM_NOTIFICATIONS_ENABLED=false)" });
  }
  if (!status.configured) {
    return res
      .status(400)
      .json({ error: `Telegram не настроен. Отсутствуют ключи: ${status.missing.join(", ")}` });
  }
  try {
    await sendTestTelegramMessage(message);
    res.json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[TELEGRAM] test message failed error=${error.message}`);
    res.status(502).json({ error: getPublicErrorMessage(error, "Telegram сервис недоступен") });
  }
});

app.post(
  "/api/auth/register",
  authRateLimiter,
  validateBody({
    email:    { required: true, type: "string", regex: EMAIL_RE, regexMsg: "Некорректный формат email" },
    password: { required: true, type: "string", minLength: 6 },
    role:     { required: false, oneOf: VALID_ROLES }
  }),
  async (req, res) => {
  const { email, password, fullName, role } = req.body || {};

  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || undefined } }
  });

  if (error) {
    return res.status(400).json({ error: getPublicErrorMessage(error, "Не удалось зарегистрироваться") });
  }

  const user = data?.user || null;
  const session = data?.session || null;

  if (user) {
    await supabaseAdmin.from("profiles").upsert(
      {
        user_id: user.id,
        full_name: fullName || null,
        role: role === "admin" ? "cosmetologist" : "client"
      },
      { onConflict: "user_id" }
    );
  }

  return res.json({
    user,
    session,
    accessToken: session?.access_token || null
  });
});

app.post(
  "/api/auth/login",
  authRateLimiter,
  validateBody({
    email:    { required: true, type: "string", regex: EMAIL_RE, regexMsg: "Некорректный формат email" },
    password: { required: true, type: "string" }
  }),
  async (req, res) => {
  const { email, password } = req.body || {};

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ error: getPublicErrorMessage(error, "Неверный email или пароль") });
  }

  let role = "client";
  if (data?.user?.id) {
    const roleResult = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (roleResult.data?.role) {
      role = roleResult.data.role;
    }
  }

  return res.json({
    user: data.user,
    session: data.session,
    accessToken: data.session?.access_token || null,
    role
  });
});

app.post("/api/auth/logout", (_req, res) => {
  // Stateless auth in frontend token store.
  res.json({ ok: true });
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, full_name")
    .eq("user_id", req.user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: getPublicErrorMessage(error, "Не удалось получить профиль пользователя") });
  }

  return res.json({
    user: req.user,
    profile: data || null,
    role: data?.role || "client"
  });
});

app.get("/api/services", async (_req, res) => {
  const TIMEOUT_MS = 8000;

  try {
    const result = await Promise.race([
      supabaseAdmin
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Supabase timeout")), TIMEOUT_MS)
      ),
    ]);

    if (result.error) {
      return res.status(500).json({ error: getPublicErrorMessage(result.error, "Не удалось загрузить услуги") });
    }

    res.json({ services: result.data || [] });
  } catch (err) {
    res.status(504).json({ error: getPublicErrorMessage(err, "Сервер не ответил вовремя") });
  }
});

app.post(
  "/api/appointments",
  authRequired,
  validateBody({
    serviceId:   { required: true, type: "string", regex: UUID_RE, regexMsg: "serviceId должен быть валидным UUID" },
    clientName:  { required: true, type: "string" },
    clientPhone: { required: true, type: "string" },
    date:        { required: true, type: "string", regex: DATE_RE, regexMsg: "Дата должна быть в формате YYYY-MM-DD", notInPast: true },
    startTime:   { required: true, type: "string", regex: TIME_RE, regexMsg: "Время должно быть в формате HH:MM" }
  }),
  async (req, res) => {
  const { serviceId, clientName, clientPhone, comment, date, startTime } = req.body || {};

  const serviceResult = await supabaseAdmin
    .from("services")
    .select("duration_min, is_active")
    .eq("id", serviceId)
    .maybeSingle();
  if (serviceResult.error || !serviceResult.data) {
    return res.status(400).json({ error: "Услуга не найдена" });
  }
  if (!serviceResult.data.is_active) {
    return res.status(400).json({ error: "Услуга неактивна" });
  }

  const endTime = addMinutesToTime(startTime, serviceResult.data.duration_min);
  if (!endTime) {
    return res.status(400).json({ error: "Некорректное время начала или длительность услуги" });
  }

  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", req.user.id)
    .maybeSingle();
  if (profileResult.error || !profileResult.data?.id) {
    return res.status(400).json({ error: "Профиль не найден" });
  }

  const payload = {
    service_id: serviceId,
    client_profile_id: profileResult.data.id,
    client_name: clientName,
    client_phone: clientPhone,
    comment: comment || null,
    date,
    start_time: startTime,
    end_time: endTime,
    status: "pending"
  };

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .insert([payload])
    .select("id, date, start_time, end_time, status, client_name, client_phone, comment")
    .single();

  if (error) {
    return res.status(400).json({ error: getPublicErrorMessage(error, "Не удалось создать запись") });
  }

  void notifyAppointmentEventNonBlocking("appointment_created", data?.id || null);

  res.json({ appointment: data });
});

app.get("/api/appointments/my", authRequired, async (req, res) => {
  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", req.user.id)
    .maybeSingle();
  if (profileResult.error || !profileResult.data?.id) {
    return res.status(400).json({ error: "Профиль не найден" });
  }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select(
      `
      id,
      date,
      start_time,
      end_time,
      status,
      client_name,
      client_phone,
      comment,
      service:services ( name )
    `
    )
    .eq("client_profile_id", profileResult.data.id)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return res.status(500).json({ error: getPublicErrorMessage(error, "Не удалось загрузить записи") });
  }

  res.json({ appointments: data || [] });
});

app.patch(
  "/api/appointments/:id/status",
  authRequired,
  validateParam("id"),
  validateBody({ status: { required: true, oneOf: VALID_STATUSES } }),
  async (req, res) => {
  const { status } = req.body || {};
  const appointmentId = req.params.id;

  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", req.user.id)
    .maybeSingle();
  if (profileResult.error || !profileResult.data?.id) {
    return res.status(400).json({ error: "Профиль не найден" });
  }

  const existing = await supabaseAdmin
    .from("appointments")
    .select(
      `
      id,
      date,
      start_time,
      end_time,
      status,
      client_name,
      client_phone,
      client_profile_id,
      service:services ( name )
    `
    )
    .eq("id", appointmentId)
    .maybeSingle();
  if (existing.error || !existing.data) {
    return res.status(404).json({ error: "Запись не найдена" });
  }
  if (existing.data.client_profile_id !== profileResult.data.id) {
    return res.status(403).json({ error: "Нельзя изменить чужую запись" });
  }

  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) {
    return res.status(400).json({ error: getPublicErrorMessage(error, "Не удалось обновить статус записи") });
  }

  void notifyAppointmentEventNonBlocking(
    "appointment_status_changed",
    appointmentId,
    mapAppointmentNotificationData({ ...existing.data, status })
  );

  res.json({ ok: true });
});

app.patch(
  "/api/appointments/:id/reschedule",
  authRequired,
  validateParam("id"),
  validateBody({
    date: {
      required: true,
      type: "string",
      regex: DATE_RE,
      regexMsg: "Дата должна быть в формате YYYY-MM-DD",
      notInPast: true
    },
    time: { required: true, type: "string", regex: TIME_RE, regexMsg: "Время должно быть в формате HH:MM" }
  }),
  async (req, res) => {
    const appointmentId = req.params.id;
    const { date, time } = req.body || {};

    const profileResult = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (profileResult.error || !profileResult.data?.id) {
      return res.status(400).json({ error: "Профиль не найден" });
    }

    const existing = await supabaseAdmin
      .from("appointments")
      .select("id, client_profile_id, status, service:services(duration_min)")
      .eq("id", appointmentId)
      .maybeSingle();
    if (existing.error || !existing.data) {
      return res.status(404).json({ error: "Запись не найдена" });
    }
    if (existing.data.client_profile_id !== profileResult.data.id) {
      return res.status(403).json({ error: "Нельзя перенести чужую запись" });
    }
    if (existing.data.status === "completed") {
      return res.status(400).json({ error: "Нельзя перенести завершенную запись" });
    }
    if (!existing.data.service?.duration_min) {
      return res.status(400).json({ error: "Не удалось определить длительность услуги" });
    }

    const endTime = addMinutesToTime(time, existing.data.service.duration_min);
    if (!endTime) {
      return res.status(400).json({ error: "Некорректное время начала или длительность услуги" });
    }

    const { error } = await supabaseAdmin
      .from("appointments")
      .update({ date, start_time: time, end_time: endTime, status: "pending" })
      .eq("id", appointmentId);
    if (error) {
      return res.status(400).json({ error: getPublicErrorMessage(error, "Не удалось перенести запись") });
    }

    void notifyAppointmentEventNonBlocking("appointment_rescheduled", appointmentId);
    res.json({ ok: true });
  }
);

app.delete("/api/appointments/:id", authRequired, validateParam("id"), async (req, res) => {
  const appointmentId = req.params.id;

  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", req.user.id)
    .maybeSingle();
  if (profileResult.error || !profileResult.data?.id) {
    return res.status(400).json({ error: "Профиль не найден" });
  }

  const existing = await supabaseAdmin
    .from("appointments")
    .select(
      `
      id,
      date,
      start_time,
      end_time,
      status,
      client_name,
      client_phone,
      client_profile_id,
      service:services ( name )
    `
    )
    .eq("id", appointmentId)
    .maybeSingle();
  if (existing.error || !existing.data) {
    return res.status(404).json({ error: "Запись не найдена" });
  }
  if (existing.data.client_profile_id !== profileResult.data.id) {
    return res.status(403).json({ error: "Нельзя удалить чужую запись" });
  }

  const { error } = await supabaseAdmin
    .from("appointments")
    .delete()
    .eq("id", appointmentId);

  if (error) {
    return res.status(400).json({ error: getPublicErrorMessage(error, "Не удалось удалить запись") });
  }

  void notifyAppointmentEventNonBlocking(
    "appointment_cancelled",
    null,
    mapAppointmentNotificationData({ ...existing.data, status: "cancelled" })
  );

  res.json({ ok: true });
});

app.get("/api/admin/appointments", authRequired, requireAdminRole, async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select(
      `
      id,
      date,
      start_time,
      end_time,
      status,
      client_name,
      client_phone,
      comment,
      service:services ( name )
    `
    )
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return res.status(500).json({ error: getPublicErrorMessage(error, "Не удалось загрузить записи") });
  }

  res.json({ appointments: data || [] });
});

app.patch(
  "/api/admin/appointments/:id/status",
  authRequired,
  requireAdminRole,
  validateParam("id"),
  validateBody({ status: { required: true, oneOf: VALID_STATUSES } }),
  async (req, res) => {
  const { status } = req.body || {};
  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status })
    .eq("id", req.params.id);
  if (error) {
    return res.status(400).json({ error: getPublicErrorMessage(error, "Не удалось обновить статус записи") });
  }

  void notifyAppointmentEventNonBlocking("appointment_status_changed", req.params.id);
  res.json({ ok: true });
});

app.patch(
  "/api/admin/appointments/:id/reschedule",
  authRequired,
  requireAdminRole,
  validateParam("id"),
  validateBody({
    date: { required: true, type: "string", regex: DATE_RE, regexMsg: "Дата должна быть в формате YYYY-MM-DD" },
    time: { required: true, type: "string", regex: TIME_RE, regexMsg: "Время должно быть в формате HH:MM" }
  }),
  async (req, res) => {
    const { date, time } = req.body || {};

    const appointmentResult = await supabaseAdmin
      .from("appointments")
      .select("service:services(duration_min)")
      .eq("id", req.params.id)
      .maybeSingle();
    if (appointmentResult.error || !appointmentResult.data?.service?.duration_min) {
      return res.status(404).json({ error: "Запись не найдена" });
    }

    const endTime = addMinutesToTime(time, appointmentResult.data.service.duration_min);
    if (!endTime) {
      return res.status(400).json({ error: "Некорректное время начала или длительность услуги" });
    }

    const { error } = await supabaseAdmin
      .from("appointments")
      .update({ date, start_time: time, end_time: endTime })
      .eq("id", req.params.id);

    if (error) {
      return res.status(400).json({ error: getPublicErrorMessage(error, "Не удалось перенести запись") });
    }

    void notifyAppointmentEventNonBlocking("appointment_rescheduled", req.params.id);

    res.json({ ok: true });
  }
);

app.post(
  "/api/admin/services",
  authRequired,
  requireAdminRole,
  validateBody({
    name:        { required: true, type: "string" },
    durationMin: { required: true, type: "integer", min: 1 },
    price:       { required: true, type: "number", min: 0 }
  }),
  async (req, res) => {
  const { name, category, durationMin, price, description, image } = req.body || {};

  const { error } = await supabaseAdmin.from("services").insert([
    {
      name: name.trim(),
      category: category?.trim() || null,
      duration_min: durationMin,
      price,
      description: description?.trim() || null,
      image_url: image?.trim() || null,
      is_active: true
    }
  ]);

  if (error) {
    return res.status(400).json({ error: getPublicErrorMessage(error, "Не удалось создать услугу") });
  }

  res.json({ ok: true });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend API is running on http://localhost:${port}`);
});
