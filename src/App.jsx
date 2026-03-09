import React, { createContext, useContext, useState, useCallback } from "react";
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

// Простейший контекст для глобальных уведомлений
const NotificationsContext = createContext(null);

export const useNotifications = () => useContext(NotificationsContext);

const AppLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, unreadCount, clearNotifications } = useNotifications();

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
            <NavLink to="/my-appointments" className={navLinkClass}>
              Мои записи
            </NavLink>
            <NavLink to="/login" className={navLinkClass}>
              Войти
            </NavLink>
            <NavLink to="/admin" className={navLinkClass}>
              Для косметолога
            </NavLink>
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
            <a href="#" className="hover:text-slate-200 transition">
              Instagram
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

const App = () => {
  const [notifications, setNotifications] = useState([]);

  const pushNotification = useCallback((message, type = "info") => {
    setNotifications((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), message, type }
    ]);
    // Автоочистка последних уведомлений
    setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 3500);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const contextValue = {
    notifications,
    unreadCount: notifications.length,
    pushNotification,
    clearNotifications
  };

  return (
    <NotificationsContext.Provider value={contextValue}>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/my-appointments" element={<MyAppointmentsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/schedule" element={<AdminSchedulePage />} />
          <Route path="/admin/appointments" element={<AdminAppointmentsPage />} />
          <Route path="/admin/services" element={<AdminServicesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppLayout>
      <ToastContainer />
    </NotificationsContext.Provider>
  );
};

export default App;

