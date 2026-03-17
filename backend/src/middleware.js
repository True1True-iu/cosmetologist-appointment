const { supabaseAuth, supabaseAdmin } = require("./supabase");

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid token" });
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
      return res.status(500).json({ error: error.message });
    }

    const role = data?.role || "client";
    if (role !== "admin" && role !== "cosmetologist") {
      return res.status(403).json({ error: "Forbidden" });
    }

    req.role = role;
    next();
  } catch (_err) {
    res.status(500).json({ error: "Role middleware failed" });
  }
}

module.exports = {
  authRequired,
  requireAdminRole
};
