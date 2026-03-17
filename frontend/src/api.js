const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const ACCESS_TOKEN_KEY = "cosmobook_access_token";

const listeners = new Set();

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const setAccessToken = (token) => {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  listeners.forEach((listener) => listener(token || null));
};

export const onTokenChange = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const request = async (path, options = {}) => {
  const token = getAccessToken();
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }
  return payload;
};

export const api = {
  auth: {
    me: () => request("/api/auth/me"),
    login: async (email, password) => {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setAccessToken(data.accessToken || null);
      return data;
    },
    register: async (email, password, fullName, role) => {
      const data = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName, role })
      });
      setAccessToken(data.accessToken || null);
      return data;
    },
    logout: async () => {
      try {
        await request("/api/auth/logout", { method: "POST" });
      } finally {
        setAccessToken(null);
      }
    }
  },
  services: {
    list: () => request("/api/services"),
    create: (payload) =>
      request("/api/admin/services", { method: "POST", body: JSON.stringify(payload) })
  },
  appointments: {
    create: (payload) =>
      request("/api/appointments", { method: "POST", body: JSON.stringify(payload) }),
    myList: () => request("/api/appointments/my"),
    myUpdateStatus: (id, status) =>
      request(`/api/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    myDelete: (id) => request(`/api/appointments/${id}`, { method: "DELETE" }),
    adminList: () => request("/api/admin/appointments"),
    adminUpdateStatus: (id, status) =>
      request(`/api/admin/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    adminReschedule: (id, date, time) =>
      request(`/api/admin/appointments/${id}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ date, time })
      })
  }
};
