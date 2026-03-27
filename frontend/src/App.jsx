import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  HomePage,
  ServicesPage,
  BookingPage,
  MyAppointmentsPage,
  LoginPage,
  AdminDashboardPage,
  AdminSchedulePage,
  AdminAppointmentsPage,
  AdminServicesPage,
  NotFoundPage
} from "./pages.jsx";
import { api, getAccessToken, onTokenChange, setAuthInterceptors } from "./api.js";

// Редирект на /login при входе в админку без авторизации
const AdminGuard = ({ children }) => {
  const { user, role, authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { state: { from: location.pathname }, replace: true });
      return;
    }
    if (role !== "admin" && role !== "cosmetologist") {
      navigate("/", { replace: true });
    }
  }, [user, role, authLoading, navigate, location.pathname]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
        Загрузка...
      </div>
    );
  }
  if (!user || (role !== "admin" && role !== "cosmetologist")) return null;
  return children;
};

// Контекст уведомлений
const NotificationsContext = createContext(null);
export const useNotifications = () => useContext(NotificationsContext);

// Контекст авторизации backend Auth (через Supabase на сервере)
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const AppLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, unreadCount, clearNotifications } = useNotifications();
  const { user, role, authLoading, signOut } = useAuth();

  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium rounded-full transition ${
      isActive
        ? "bg-emerald-500 text-slate-950"
        : "text-slate-200 hover:bg-slate-800 hover:text-white"
    }`;

  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 group"
          >
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center group-hover:bg-emerald-500/20 transition">
              <span className="text-emerald-400 text-xl font-semibold">C</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold tracking-tight">CosmoBook</span>
              <span className="text-[11px] text-slate-400 leading-none">
                онлайн-запись к косметологу
              </span>
            </div>
          </button>

          <nav className="flex-1 flex items-center justify-center gap-1 max-w-xl">
            <NavLink to="/services" className={navLinkClass}>
              Услуги
            </NavLink>
            <NavLink to="/booking" className={navLinkClass}>
              Записаться
            </NavLink>
            {user && (
              <NavLink to="/my-appointments" className={navLinkClass}>
                Мои записи
              </NavLink>
            )}
            {user ? (
              <>
                <span className="px-3 py-2 text-sm text-slate-300 truncate max-w-[140px]" title={user.email}>
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    navigate("/");
                  }}
                  className="px-3 py-2 text-sm font-medium rounded-full text-slate-200 hover:bg-slate-800 hover:text-white transition"
                >
                  Выйти
                </button>
              </>
            ) : (
              <NavLink to="/login" className={navLinkClass}>
                Войти
              </NavLink>
            )}
            {user && (role === "admin" || role === "cosmetologist") && (
              <NavLink to="/admin" className={navLinkClass}>
                Для косметолога
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <button
              className="relative p-2 rounded-full hover:bg-slate-800 transition"
              onClick={clearNotifications}
              title="Уведомления"
            >
              <span className="sr-only">Открыть уведомления</span>
              <svg
                className="h-5 w-5 text-slate-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                  d="M14.857 17.657A2 2 0 0113 19H11a2 2 0 01-1.857-1.343M18 8a6 6 0 10-12 0c0 1.657-.895 3.09-1.789 4.222A1 1 0 005.02 14h13.96a1 1 0 00.81-1.578C18.895 11.09 18 9.657 18 8z"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-1 rounded-full bg-emerald-500 text-[10px] font-semibold flex items-center justify-center text-slate-950">
                  {unreadCount}
                </span>
              )}
            </button>
            {isAdminRoute ? (
              <span className="text-xs px-2 py-1 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/40">
                Режим косметолога
              </span>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                Режим клиента
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/80">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} CosmoBook. Все права защищены.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-200 transition">
              Контакты
            </a>
            <a href="#" className="hover:text-slate-200 transition">
              Политика конфиденциальности
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const ToastContainer = () => {
  const { notifications } = useNotifications();

  if (!notifications.length) return null;

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`max-w-xs rounded-xl border px-4 py-3 shadow-lg text-sm ${
            n.type === "error"
              ? "bg-rose-950/90 border-rose-700 text-rose-100"
              : "bg-slate-900/95 border-slate-700 text-slate-50"
          }`}
        >
          <div className="font-semibold mb-1">
            {n.type === "error" ? "Ошибка" : "Уведомление"}
          </div>
          <div className="text-xs opacity-90">{n.message}</div>
        </div>
      ))}
    </div>
  );
};

const AuthInterceptorSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pushNotification } = useNotifications();

  const navRef = useRef(navigate);
  const locRef = useRef(location);
  const notifyRef = useRef(pushNotification);
  useEffect(() => { navRef.current = navigate; }, [navigate]);
  useEffect(() => { locRef.current = location; }, [location]);
  useEffect(() => { notifyRef.current = pushNotification; }, [pushNotification]);

  useEffect(() => {
    setAuthInterceptors({
      on401: () => {
        if (locRef.current.pathname !== "/login") {
          navRef.current("/login", { replace: true });
        }
      },
      on403: (message) => {
        notifyRef.current(message || "Нет прав", "error");
      }
    });
    return () => setAuthInterceptors({ on401: null, on403: null });
  }, []);

  return null;
};

const METRIKA_ID = 108270425;

const YandexMetrikaHit = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.ym === "function") {
      window.ym(METRIKA_ID, "hit", window.location.href, {
        title: document.title
      });
    }
  }, [location]);

  return null;
};

const App = () => {
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState("client");
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const refreshMe = async () => {
      const token = getAccessToken();
      if (!token) {
        setSession(null);
        setUser(null);
        setRole("client");
        setAuthLoading(false);
        return;
      }
      try {
        const payload = await api.auth.me();
        setSession({ access_token: token });
        setUser(payload.user || null);
        setRole(payload.role || "client");
      } catch (_err) {
        setSession(null);
        setUser(null);
        setRole("client");
      } finally {
        setAuthLoading(false);
      }
    };

    refreshMe();
    const unsubscribe = onTokenChange(() => {
      refreshMe();
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      const data = await api.auth.login(email, password);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  const signUp = useCallback(async (email, password, fullName, nextRole) => {
    try {
      const data = await api.auth.register(email, password, fullName, nextRole);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    await api.auth.logout();
    setSession(null);
    setUser(null);
    setRole("client");
  }, []);

  const pushNotification = useCallback((message, type = "info") => {
    setNotifications((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), message, type }
    ]);
    setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 3500);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const notificationsValue = {
    notifications,
    unreadCount: notifications.length,
    pushNotification,
    clearNotifications
  };

  const authValue = {
    user,
    session,
    role,
    authLoading,
    signIn,
    signUp,
    signOut
  };

  return (
    <NotificationsContext.Provider value={notificationsValue}>
      <AuthContext.Provider value={authValue}>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/my-appointments" element={<MyAppointmentsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminGuard><AdminDashboardPage /></AdminGuard>} />
            <Route path="/admin/schedule" element={<AdminGuard><AdminSchedulePage /></AdminGuard>} />
            <Route path="/admin/appointments" element={<AdminGuard><AdminAppointmentsPage /></AdminGuard>} />
            <Route path="/admin/services" element={<AdminGuard><AdminServicesPage /></AdminGuard>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppLayout>
        <ToastContainer />
        <AuthInterceptorSetup />
        <YandexMetrikaHit />
      </AuthContext.Provider>
    </NotificationsContext.Provider>
  );
};

export default App;

