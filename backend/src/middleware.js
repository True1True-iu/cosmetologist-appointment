const { supabaseAuth, supabaseAdmin } = require("./supabase");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const VALID_STATUSES = new Set(["pending", "confirmed", "cancelled", "completed"]);
const VALID_ROLES = new Set(["client", "admin"]);
const isProduction = process.env.NODE_ENV === "production";
const getPublicErrorMessage = (error, fallback) =>
  !isProduction && error?.message ? error.message : fallback;

function validateBody(rules) {
  return (req, res, next) => {
    const body = req.body || {};
    for (const [field, checks] of Object.entries(rules)) {
      const raw = body[field];
      const value = typeof raw === "string" ? raw.trim() : raw;

      if (checks.required && (value === undefined || value === null || value === "")) {
        return res.status(400).json({ error: `Поле "${field}" обязательно для заполнения` });
      }

      if (value === undefined || value === null || value === "") continue;

      if (checks.type === "string" && typeof value !== "string") {
        return res.status(400).json({ error: `Поле "${field}" должно быть строкой` });
      }

      if (checks.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
        return res.status(400).json({ error: `Поле "${field}" должно быть числом` });
      }

      if (checks.type === "integer" && (!Number.isInteger(value))) {
        return res.status(400).json({ error: `Поле "${field}" должно быть целым числом` });
      }

      if (checks.regex && !checks.regex.test(String(value))) {
        return res.status(400).json({ error: checks.regexMsg || `Поле "${field}" имеет неверный формат` });
      }

      if (checks.minLength && String(value).length < checks.minLength) {
        return res.status(400).json({ error: `Поле "${field}" должно содержать минимум ${checks.minLength} символов` });
      }

      if (checks.min !== undefined && value < checks.min) {
        return res.status(400).json({ error: `Поле "${field}" должно быть не менее ${checks.min}` });
      }

      if (checks.oneOf && !checks.oneOf.has(String(value))) {
        const allowed = [...checks.oneOf].join(", ");
        return res.status(400).json({ error: `Поле "${field}" должно быть одним из: ${allowed}` });
      }

      if (checks.notInPast) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(value) < today) {
          return res.status(400).json({ error: `Поле "${field}" не может быть в прошлом` });
        }
      }
    }
    next();
  };
}

function validateParam(paramName) {
  return (req, res, next) => {
    if (!UUID_RE.test(req.params[paramName])) {
      return res.status(400).json({ error: `Параметр "${paramName}" должен быть валидным UUID` });
    }
    next();
  };
}

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }

    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Недействительный токен авторизации" });
    }

    req.user = data.user;
    req.accessToken = token;
    next();
  } catch (_err) {
    res.status(500).json({ error: "Auth middleware failed" });
  }
}

async function requireAdminRole(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: getPublicErrorMessage(error, "Не удалось проверить роль пользователя") });
    }

    const role = data?.role || "client";
    if (role !== "admin" && role !== "cosmetologist") {
      return res.status(403).json({ error: "Доступ запрещён: недостаточно прав" });
    }

    req.role = role;
    next();
  } catch (_err) {
    res.status(500).json({ error: "Role middleware failed" });
  }
}

module.exports = {
  UUID_RE,
  EMAIL_RE,
  DATE_RE,
  TIME_RE,
  VALID_STATUSES,
  VALID_ROLES,
  validateBody,
  validateParam,
  authRequired,
  requireAdminRole
};
