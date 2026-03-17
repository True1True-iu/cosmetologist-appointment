const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env"), override: true });

const { supabaseAdmin, supabaseAuth } = require("./supabase");
const { authRequired, requireAdminRole } = require("./middleware");

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const allowedOrigins = new Set([clientOrigin, "http://localhost:5173", "http://localhost:5174"]);
const localhostOriginPattern = /^http:\/\/localhost:\d+$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.has(origin) || localhostOriginPattern.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password, fullName, role } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || undefined } }
  });

  if (error) {
    return res.status(400).json({ error: error.message });
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

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ error: error.message });
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
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    user: req.user,
    profile: data || null,
    role: data?.role || "client"
  });
});

app.get("/api/services", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ services: data || [] });
});

app.post("/api/appointments", authRequired, async (req, res) => {
  const { serviceId, clientName, clientPhone, comment, date, startTime } = req.body || {};
  if (!serviceId || !clientName || !clientPhone || !date || !startTime) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", req.user.id)
    .maybeSingle();
  if (profileResult.error || !profileResult.data?.id) {
    return res.status(400).json({ error: "Profile not found" });
  }

  const payload = {
    service_id: serviceId,
    client_profile_id: profileResult.data.id,
    client_name: clientName,
    client_phone: clientPhone,
    comment: comment || null,
    date,
    start_time: startTime,
    end_time: startTime,
    status: "pending"
  };

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .insert([payload])
    .select("id, date, start_time, end_time, status, client_name, client_phone, comment")
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ appointment: data });
});

app.get("/api/appointments/my", authRequired, async (req, res) => {
  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", req.user.id)
    .maybeSingle();
  if (profileResult.error || !profileResult.data?.id) {
    return res.status(400).json({ error: "Profile not found" });
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
    return res.status(500).json({ error: error.message });
  }

  res.json({ appointments: data || [] });
});

app.patch("/api/appointments/:id/status", authRequired, async (req, res) => {
  const { status } = req.body || {};
  const appointmentId = req.params.id;
  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", req.user.id)
    .maybeSingle();
  if (profileResult.error || !profileResult.data?.id) {
    return res.status(400).json({ error: "Profile not found" });
  }

  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .eq("client_profile_id", profileResult.data.id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ ok: true });
});

app.delete("/api/appointments/:id", authRequired, async (req, res) => {
  const appointmentId = req.params.id;

  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", req.user.id)
    .maybeSingle();
  if (profileResult.error || !profileResult.data?.id) {
    return res.status(400).json({ error: "Profile not found" });
  }

  const { error } = await supabaseAdmin
    .from("appointments")
    .delete()
    .eq("id", appointmentId)
    .eq("client_profile_id", profileResult.data.id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

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
    return res.status(500).json({ error: error.message });
  }

  res.json({ appointments: data || [] });
});

app.patch("/api/admin/appointments/:id/status", authRequired, requireAdminRole, async (req, res) => {
  const { status } = req.body || {};
  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }
  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status })
    .eq("id", req.params.id);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.json({ ok: true });
});

app.patch(
  "/api/admin/appointments/:id/reschedule",
  authRequired,
  requireAdminRole,
  async (req, res) => {
    const { date, time } = req.body || {};
    if (!date || !time) {
      return res.status(400).json({ error: "Date and time are required" });
    }

    const { error } = await supabaseAdmin
      .from("appointments")
      .update({ date, start_time: time, end_time: time })
      .eq("id", req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ ok: true });
  }
);

app.post("/api/admin/services", authRequired, requireAdminRole, async (req, res) => {
  const { name, category, durationMin, price, description, image } = req.body || {};
  if (!name || !durationMin || !price) {
    return res.status(400).json({ error: "Name, duration and price are required" });
  }

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
    return res.status(400).json({ error: error.message });
  }

  res.json({ ok: true });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend API is running on http://localhost:${port}`);
});
