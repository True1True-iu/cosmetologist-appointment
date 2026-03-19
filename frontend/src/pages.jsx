import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useNotifications, useAuth } from "./App.jsx";
import { api } from "./api.js";

// ---- Вспомогательные хуки для Supabase ----

const useServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchServices = async () => {
      setLoading(true);
      let data = [];
      let err = null;
      try {
        const payload = await api.services.list();
        data = payload.services || [];
      } catch (error) {
        err = error;
      }

      if (!isMounted) return;

      if (err) {
        setError(err.message);
        setServices([]);
      } else {
        // Приводим поля к формату, который уже использует UI
        const normalized =
          (data || []).map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            durationMin: s.duration_min,
            price: Number(s.price),
            description: s.description,
            image: s.image_url
          })) ?? [];
        setServices(normalized);
        setError(null);
      }
      setLoading(false);
    };
    fetchServices();
    return () => {
      isMounted = false;
    };
  }, []);

  return { services, loading, error };
};

const mapStatusLabel = (status) => {
  switch (status) {
    case "confirmed":
      return "подтверждена";
    case "cancelled":
      return "отменена";
    case "completed":
      return "завершена";
    case "pending":
    default:
      return "ожидает подтверждения";
  }
};

const mapStatusTone = (status) => {
  switch (status) {
    case "confirmed":
      return "success";
    case "cancelled":
      return "danger";
    default:
      return "warning";
  }
};

const formatDateRu = (isoDate) => {
  if (!isoDate || typeof isoDate !== "string") return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
};

// ---- Вспомогательные компоненты ----

const Badge = ({ children, tone = "default" }) => {
  const tones = {
    default: "bg-slate-800/70 text-slate-100 border border-slate-700/70",
    success: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40",
    warning: "bg-amber-500/15 text-amber-300 border border-amber-500/40",
    danger: "bg-rose-500/15 text-rose-200 border border-rose-500/40"
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] ${tones[tone]}`}>
      {children}
    </span>
  );
};

// ---- 1. Главная страница ----

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-10">
      <section className="grid gap-8 md:grid-cols-[1.2fr,1fr] items-center">
        <div className="space-y-6">
          <Badge tone="success">Новый удобный формат записи</Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
            Онлайн-запись к косметологу{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
              в пару кликов
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl">
            Выбирайте удобное время, услугу и мастера без звонков и ожидания. Сервис
            подскажет свободные окна и отправит напоминание о записи.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/booking")}
              className="inline-flex items-center px-5 py-2.5 rounded-full bg-emerald-500 text-slate-950 text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition"
            >
              Записаться сейчас
              <span className="ml-2 text-lg">→</span>
            </button>
            <button
              onClick={() => navigate("/services")}
              className="inline-flex items-center px-5 py-2.5 rounded-full border border-slate-700 text-slate-100 text-sm font-semibold hover:bg-slate-900 transition"
            >
              Посмотреть услуги
            </button>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-300 text-xs">
                24/7
              </span>
              Онлайн-запись в любое время
            </div>
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-300 text-xs">
                ✓
              </span>
              Напоминания о приёме
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/25 via-sky-500/15 to-fuchsia-500/25 blur-3xl opacity-60" />
          <div className="relative rounded-3xl border border-slate-800 bg-slate-950/70 p-4 shadow-xl shadow-emerald-500/15 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                Ближайшие свободные слоты
              </span>
              <Badge>сегодня</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {["10:30", "12:00", "15:15", "18:00"].map((time) => (
                <button
                  key={time}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2 hover:border-emerald-400/60 hover:bg-slate-900 transition text-left"
                  onClick={() => navigate(`/booking?time=${encodeURIComponent(time)}`)}
                >
                  <div className="font-semibold text-slate-100">{time}</div>
                  <div className="text-[11px] text-slate-400">Чистка лица · 60 мин</div>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">Ваш косметолог</div>
                <div className="text-xs font-medium text-slate-100">
                  Елена • 5 лет опыта
                </div>
              </div>
              <Link
                to="/booking"
                className="text-[11px] font-semibold text-emerald-300 hover:text-emerald-200"
              >
                Открыть календарь →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
          <div className="text-sm font-semibold">Онлайн-запись 24/7</div>
          <p className="text-xs text-slate-400">
            Выбирайте услугу и время в удобном интерфейсе без звонков и ожидания ответа в
            мессенджерах.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
          <div className="text-sm font-semibold">Напоминания о визите</div>
          <p className="text-xs text-slate-400">
            Сервис напоминает о записи и помогает сократить количество пропусков и
            переносов.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
          <div className="text-sm font-semibold">Удобно для косметолога</div>
          <p className="text-xs text-slate-400">
            Панель мастера показывает все записи на день, свободные окна и позволяет
            быстро управлять расписанием.
          </p>
        </div>
      </section>
    </div>
  );
};

// ---- 2. Страница списка услуг ----

export const ServicesPage = () => {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const { services, loading, error } = useServices();
  const navigate = useNavigate();

  const categories = useMemo(
    () => ["all", "лицо", "тело", "депиляция"],
    []
  );

  const filteredServices = services.filter((s) => {
    const byCategory = category === "all" || s.category === category;
    const bySearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    return byCategory && bySearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-1">Услуги и процедуры</h2>
          <p className="text-xs text-slate-400">
            Выберите услугу, чтобы перейти к записи на удобное время.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-800 rounded-full px-3 py-1.5">
            <span className="text-[11px] text-slate-400">Категория</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-transparent text-xs text-slate-100 outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-slate-900">
                  {c === "all" ? "Все" : c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-800 rounded-full px-3 py-1.5">
            <svg
              className="h-3.5 w-3.5 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
                d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию"
              className="bg-transparent text-xs text-slate-100 placeholder:text-slate-500 outline-none w-40 sm:w-56"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-xs text-slate-400">Загрузка услуг...</div>
      )}
      {error && !loading && (
        <div className="text-xs text-rose-400">
          Не удалось загрузить услуги: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => (
          <article
            key={service.id}
            className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden flex flex-col"
          >
            <div className="relative h-32 overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${service.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{service.name}</h3>
                <Badge>{service.category}</Badge>
              </div>
              <p className="text-xs text-slate-400 line-clamp-3">{service.description}</p>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{service.durationMin} мин</span>
                <span className="font-semibold">{service.price.toLocaleString()} ₽</span>
              </div>
              <button
                onClick={() =>
                  navigate(`/booking?serviceId=${encodeURIComponent(service.id)}`)
                }
                className="mt-1 inline-flex items-center justify-center px-3 py-2 rounded-full bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition"
              >
                Записаться
              </button>
            </div>
          </article>
        ))}
        </div>
      )}

      {!loading && !error && filteredServices.length === 0 && (
        <div className="text-xs text-slate-400">
          По выбранным фильтрам услуг не найдено. Попробуйте изменить категорию или запрос.
        </div>
      )}
    </div>
  );
};

// ---- 3. Страница записи (wizard) ----

export const BookingPage = () => {
  const [searchParams] = useSearchParams();
  const serviceIdFromUrl = searchParams.get("serviceId");
  const timeFromUrl = searchParams.get("time");

  const [step, setStep] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState(serviceIdFromUrl || "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState(timeFromUrl || "");
  const [clientData, setClientData] = useState({
    name: "",
    phone: "",
    email: "",
    comment: "",
    consentData: false,
    consentMarketing: false
  });
  const [createdAppointment, setCreatedAppointment] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const { pushNotification } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { services, loading: servicesLoading, error: servicesError } = useServices();

  useEffect(() => {
    if (!selectedServiceId && services.length) {
      setSelectedServiceId(serviceIdFromUrl || services[0].id);
    }
  }, [services, selectedServiceId, serviceIdFromUrl]);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  const slots = useMemo(
    () => [
      "10:00",
      "11:30",
      "13:00",
      "15:00",
      "17:30",
      "19:00"
    ],
    []
  );

  const handleNext = () => {
    // Валидация по шагам: формируем объект ошибок и блокируем переход, если он не пустой
    if (step === 1) {
      const stepErrors = {};
      if (!selectedService) {
        stepErrors.service = "Выберите услугу, чтобы продолжить";
      }
      setErrors(stepErrors);
      if (Object.keys(stepErrors).length > 0) return;
    }
    if (step === 2) {
      const stepErrors = {};
      if (!selectedDate) {
        stepErrors.date = "Выберите дату записи";
      }
      if (!selectedTime) {
        stepErrors.time = "Выберите время записи";
      }
      setErrors(stepErrors);
      if (Object.keys(stepErrors).length > 0) return;
    }
    if (step === 3) {
      const stepErrors = {};
      if (!clientData.name.trim()) {
        stepErrors.name = "Укажите ваше имя";
      }
      const phoneDigits = clientData.phone.replace(/\D/g, "");
      if (!clientData.phone.trim()) {
        stepErrors.phone = "Укажите номер телефона";
      } else if (phoneDigits.length < 10 || phoneDigits.length > 12) {
        stepErrors.phone = "Проверьте номер телефона (обычно 10–11 цифр без кода страны или с +7)";
      }
      if (!clientData.consentData) {
        stepErrors.consentData = "Необходимо согласие на обработку данных";
      }
      setErrors(stepErrors);
      if (Object.keys(stepErrors).length > 0) return;
    }
    setErrors({});
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleConfirm = () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      pushNotification("Заполнение шагов записи не завершено", "error");
      return;
    }
    if (!user) {
      pushNotification("Войдите в аккаунт, чтобы записаться", "error");
      navigate("/login");
      return;
    }
      const create = async () => {
      setSubmitting(true);
        try {
          const response = await api.appointments.create({
            serviceId: selectedService.id,
            clientName: clientData.name,
            clientPhone: clientData.phone,
            comment: clientData.comment || null,
            date: selectedDate,
            startTime: selectedTime
          });
          setCreatedAppointment(response.appointment);
          pushNotification("Запись успешно создана! Мы напомним о визите.", "info");
        } catch (error) {
          pushNotification("Не удалось создать запись: " + error.message, "error");
        } finally {
          setSubmitting(false);
        }
      };

    create();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-1">Новая запись</h2>
          <p className="text-xs text-slate-400">
            Пройдите 4 шага: выберите услугу, дату и время, укажите свои данные и
            подтвердите бронь.
          </p>
        </div>
        <BookingStepsIndicator step={step} />
      </div>

      <div className="grid md:grid-cols-[minmax(0,2fr),minmax(0,1fr)] gap-6 items-start">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
          {servicesLoading && (
            <p className="text-xs text-slate-400">Загрузка услуг...</p>
          )}
          {servicesError && (
            <p className="text-xs text-rose-400">
              Не удалось загрузить услуги: {servicesError}
            </p>
          )}
          {!servicesLoading && !servicesError && services.length === 0 && (
            <p className="text-xs text-slate-400">
              Услуги пока не настроены. Обратитесь к администратору.
            </p>
          )}

          {!servicesLoading && !servicesError && services.length > 0 && step === 1 && (
            <StepSelectService
              services={services}
              selectedServiceId={selectedServiceId}
              setSelectedServiceId={setSelectedServiceId}
              error={errors.service}
            />
          )}
          {step === 2 && (
            <StepSelectDateTime
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              slots={slots}
              errors={{ date: errors.date, time: errors.time }}
            />
          )}
          {step === 3 && (
            <StepClientData
              clientData={clientData}
              setClientData={setClientData}
              errors={{
                name: errors.name,
                phone: errors.phone,
                consentData: errors.consentData
              }}
            />
          )}
          {step === 4 && (
            <StepConfirmation
              appointment={createdAppointment}
              selectedService={selectedService}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              clientData={clientData}
            />
          )}
          {step === 4 && !user && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Чтобы подтвердить запись, нужно{" "}
              <Link to="/login" className="font-semibold underline hover:text-amber-100">
                войти в аккаунт
              </Link>
              .
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className="text-xs text-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed hover:text-slate-100"
            >
              ← Назад
            </button>
            <div className="flex gap-2">
              {step === 4 ? (
                <>
                  <button
                    onClick={() => navigate("/my-appointments")}
                    className="text-xs px-3 py-2 rounded-full border border-slate-700 text-slate-100 hover:bg-slate-900 transition"
                  >
                    Мои записи
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="text-xs px-3 py-2 rounded-full bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition"
                  >
                    {submitting ? "Создание..." : "Подтвердить запись"}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleNext}
                  className="text-xs px-3 py-2 rounded-full bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition"
                >
                  Далее →
                </button>
              )}
            </div>
          </div>
        </div>

        <SummaryPanel
          selectedService={selectedService}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          clientData={clientData}
        />
      </div>
    </div>
  );
};

const BookingStepsIndicator = ({ step }) => {
  const steps = [
    "Услуга",
    "Дата и время",
    "Данные клиента",
    "Подтверждение"
  ];
  return (
    <ol className="flex items-center gap-1 text-[11px] bg-slate-950/80 border border-slate-800 rounded-full px-2 py-1.5">
      {steps.map((label, index) => {
        const current = index + 1;
        const isActive = current === step;
        const isDone = current < step;
        return (
          <li
            key={label}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
              isActive
                ? "bg-emerald-500 text-slate-950"
                : isDone
                ? "text-emerald-300"
                : "text-slate-400"
            }`}
          >
            <span
              className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] border ${
                isActive
                  ? "border-emerald-700 bg-emerald-100/90"
                  : isDone
                  ? "border-emerald-500 bg-emerald-500/15"
                  : "border-slate-700"
              }`}
            >
              {isDone ? "✓" : current}
            </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
};

const StepSelectService = ({ services, selectedServiceId, setSelectedServiceId, error }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Шаг 1. Выбор услуги</h3>
      <p className="text-xs text-slate-400">
        Выберите услугу, на которую хотите записаться. Это поможет рассчитать длительность
        и подобрать свободные окна.
      </p>
      <select
        value={selectedServiceId}
        onChange={(e) => setSelectedServiceId(e.target.value)}
        className={`w-full bg-slate-900 rounded-xl px-3 py-2 text-xs outline-none ${
          error
            ? "border border-rose-500 focus:border-rose-400"
            : "border border-slate-700 focus:border-emerald-400"
        }`}
      >
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} • {s.durationMin} мин • {s.price.toLocaleString()} ₽
          </option>
        ))}
      </select>

      {selectedServiceId && (
        <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs space-y-1">
          <div className="font-semibold">
            {services.find((s) => s.id === selectedServiceId)?.name}
          </div>
          <div className="text-slate-400">
            {services.find((s) => s.id === selectedServiceId)?.description}
          </div>
        </div>
      )}
      {error && <p className="text-[11px] text-rose-400 mt-1">{error}</p>}
    </div>
  );
};

const StepSelectDateTime = ({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  slots,
  errors
}) => {
  const today = new Date();
  const nextSevenDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const formatDate = (d) => d.toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Шаг 2. Дата и время</h3>
      <p className="text-xs text-slate-400">
        Выберите удобный день и одно из свободных временных окон.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {nextSevenDays.map((d) => {
          const value = formatDate(d);
          const isSelected = selectedDate === value;
          const weekday = d.toLocaleDateString("ru-RU", { weekday: "short" });
          const day = d.getDate();
          return (
            <button
              key={value}
              onClick={() => setSelectedDate(value)}
              className={`min-w-[70px] rounded-xl border px-3 py-2 text-center text-[11px] ${
                isSelected
                  ? "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                  : "border-slate-800 bg-slate-900/70 text-slate-200 hover:border-slate-700"
              }`}
            >
              <div className="uppercase">{weekday}</div>
              <div className="text-base font-semibold">{day}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
        {slots.map((time) => {
          const isSelected = selectedTime === time;
          return (
            <button
              key={time}
              onClick={() => setSelectedTime(time)}
              className={`rounded-xl border px-2.5 py-2 text-center ${
                isSelected
                  ? "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                  : "border-slate-800 bg-slate-900/70 text-slate-200 hover:border-slate-700"
              }`}
            >
              {time}
            </button>
          );
        })}
      </div>
      {(errors?.date || errors?.time) && (
        <p className="text-[11px] text-rose-400">
          {errors.date || errors.time}
        </p>
      )}
    </div>
  );
};

const StepClientData = ({ clientData, setClientData, errors }) => {
  const handleChange = (field, value) => {
    setClientData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Шаг 3. Ваши данные</h3>
      <p className="text-xs text-slate-400">
        Эти данные нужны, чтобы подтвердить запись и напомнить о визите.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1.5">
          <label className="text-slate-300">Имя *</label>
          <input
            value={clientData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={`w-full bg-slate-900 rounded-xl px-3 py-2 outline-none ${
              errors?.name
                ? "border border-rose-500 focus:border-rose-400"
                : "border border-slate-700 focus:border-emerald-400"
            }`}
          />
          {errors?.name && (
            <p className="text-[11px] text-rose-400">{errors.name}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-slate-300">Телефон *</label>
          <input
            value={clientData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+7 ..."
            className={`w-full bg-slate-900 rounded-xl px-3 py-2 outline-none ${
              errors?.phone
                ? "border border-rose-500 focus:border-rose-400"
                : "border border-slate-700 focus:border-emerald-400"
            }`}
          />
          {errors?.phone && (
            <p className="text-[11px] text-rose-400">{errors.phone}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-slate-300">E-mail</label>
          <input
            value={clientData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-slate-300">Комментарий к записи</label>
          <input
            value={clientData.comment}
            onChange={(e) => handleChange("comment", e.target.value)}
            placeholder="Например: чувствительная кожа"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
          />
        </div>
      </div>

      <div className="space-y-1.5 text-[11px] text-slate-300">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={clientData.consentData}
            onChange={(e) => handleChange("consentData", e.target.checked)}
            className="mt-[2px]"
          />
          <span>
            Я согласен(на) на обработку персональных данных и подтверждаю, что ознакомлен(а) с
            политикой конфиденциальности.
          </span>
        </label>
        {errors?.consentData && (
          <p className="text-[11px] text-rose-400">{errors.consentData}</p>
        )}
        <label className="flex items-start gap-2 text-slate-400">
          <input
            type="checkbox"
            checked={clientData.consentMarketing}
            onChange={(e) => handleChange("consentMarketing", e.target.checked)}
            className="mt-[2px]"
          />
          <span>Я согласен(на) получать новости и специальные предложения.</span>
        </label>
      </div>
    </div>
  );
};

const StepConfirmation = ({
  appointment,
  selectedService,
  selectedDate,
  selectedTime,
  clientData
}) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Шаг 4. Подтверждение записи</h3>
      <p className="text-xs text-slate-400">
        Проверьте данные перед подтверждением. После подтверждения вы увидите запись в разделе
        &laquo;Мои записи&raquo;.
      </p>

      <div className="space-y-2 text-xs">
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
          <div className="font-semibold text-slate-100">Услуга</div>
          <div className="text-slate-200">
            {selectedService?.name || "Услуга не выбрана"}
          </div>
          {selectedService && (
            <div className="text-slate-400">
              {selectedService.durationMin} мин • {selectedService.price.toLocaleString()} ₽
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
          <div className="font-semibold text-slate-100">Дата и время</div>
          <div className="text-slate-200">
            {selectedDate && selectedTime
              ? `${formatDateRu(selectedDate)} в ${selectedTime}`
              : "Дата и время не выбраны"}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
          <div className="font-semibold text-slate-100">Ваши данные</div>
          <div className="text-slate-200">
            {clientData.name || "Имя не указано"} • {clientData.phone || "Телефон не указан"}
          </div>
          {clientData.email && (
            <div className="text-slate-400">E-mail: {clientData.email}</div>
          )}
        </div>
      </div>

      {appointment && (
        <div className="mt-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-100 space-y-1.5">
          <div className="font-semibold">Запись создана локально</div>
          <p>
            В реальном приложении на этом шаге данные отправились бы на сервер, а вы получили
            бы SMS / e-mail с подтверждением.
          </p>
        </div>
      )}
    </div>
  );
};

const SummaryPanel = ({ selectedService, selectedDate, selectedTime, clientData }) => {
  return (
    <aside className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 text-xs">
      <h4 className="text-sm font-semibold">Резюме записи</h4>
      <div className="space-y-1.5">
        <div className="text-slate-400">Услуга</div>
        <div className="text-slate-100">
          {selectedService?.name || "Вы ещё не выбрали услугу"}
        </div>
        {selectedService && (
          <div className="text-slate-400">
            {selectedService.durationMin} мин • {selectedService.price.toLocaleString()} ₽
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="text-slate-400">Дата и время</div>
        <div className="text-slate-100">
          {selectedDate && selectedTime
            ? `${formatDateRu(selectedDate)} в ${selectedTime}`
            : "Вы ещё не выбрали дату и время"}
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="text-slate-400">Контакты</div>
        <div className="text-slate-100">
          {clientData.name || "Имя не указано"} • {clientData.phone || "Телефон не указан"}
        </div>
      </div>
    </aside>
  );
};

// ---- 4. Страница "Мои записи" ----

export const MyAppointmentsPage = () => {
  const [tab, setTab] = useState("upcoming");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { pushNotification } = useNotifications();

  const nowDate = "2026-03-09";

  useEffect(() => {
    let isMounted = true;
    const fetchAppointments = async () => {
      setLoading(true);
      let data = [];
      let err = null;
      try {
        const payload = await api.appointments.myList();
        data = payload.appointments || [];
      } catch (error) {
        err = error;
      }

      if (!isMounted) return;

      if (err) {
        setError(err.message);
        setAppointments([]);
      } else {
        const normalized =
          (data || []).map((a) => ({
            id: a.id,
            date: a.date,
            startTime: a.start_time,
            endTime: a.end_time,
            status: a.status,
            statusLabel: mapStatusLabel(a.status),
            serviceName: a.service?.name || "Услуга",
            clientName: a.client_name,
            clientPhone: a.client_phone,
            comment: a.comment
          })) ?? [];
        setAppointments(normalized);
        setError(null);
      }
      setLoading(false);
    };
    fetchAppointments();
    return () => {
      isMounted = false;
    };
  }, []);

  const splitAppointments = useMemo(() => {
    const upcoming = [];
    const past = [];
    const canceled = [];
    for (const a of appointments) {
      if (a.status === "cancelled") {
        canceled.push(a);
      } else if (a.date >= nowDate && a.status !== "completed") {
        upcoming.push(a);
      } else {
        past.push(a);
      }
    }
    return { upcoming, past, canceled };
  }, [appointments]);

  const currentList =
    tab === "upcoming"
      ? splitAppointments.upcoming
      : tab === "past"
      ? splitAppointments.past
      : splitAppointments.canceled;

  const updateStatus = async (id, status) => {
    try {
      await api.appointments.myUpdateStatus(id, status);
    } catch (error) {
      pushNotification("Не удалось обновить запись: " + error.message, "error");
      return;
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    if (status === "cancelled") {
      pushNotification("Запись отменена", "info");
    }
  };

  const deleteAppointment = async (id) => {
    try {
      await api.appointments.myDelete(id);
    } catch (error) {
      pushNotification("Не удалось удалить запись: " + error.message, "error");
      return;
    }
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    pushNotification("Прошедшая запись удалена из списка", "info");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-1">Мои записи</h2>
          <p className="text-xs text-slate-400">
            Здесь отображаются все ваши будущие, прошедшие и отменённые записи.
          </p>
        </div>
        <div className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950/80 p-1 text-[11px]">
          <button
            onClick={() => setTab("upcoming")}
            className={`px-3 py-1.5 rounded-full ${
              tab === "upcoming" ? "bg-emerald-500 text-slate-950" : "text-slate-300"
            }`}
          >
            Будущие
          </button>
          <button
            onClick={() => setTab("past")}
            className={`px-3 py-1.5 rounded-full ${
              tab === "past" ? "bg-emerald-500 text-slate-950" : "text-slate-300"
            }`}
          >
            Прошедшие
          </button>
          <button
            onClick={() => setTab("canceled")}
            className={`px-3 py-1.5 rounded-full ${
              tab === "canceled" ? "bg-emerald-500 text-slate-950" : "text-slate-300"
            }`}
          >
            Отменённые
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-xs text-slate-400">Загрузка ваших записей...</div>
      )}
      {error && !loading && (
        <div className="text-xs text-rose-400">
          Не удалось загрузить записи: {error}
        </div>
      )}

      {!loading && !error && (
        currentList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-6 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-200 mb-1">
                У вас пока нет записей в этом разделе
              </div>
              <p>
                Запишитесь на удобное время, и здесь появится список ваших процедур и
                статусы броней.
              </p>
            </div>
            <Link
              to="/booking"
              className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition"
            >
              Записаться →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {currentList.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-slate-100">{a.serviceName}</div>
                  <div className="text-slate-300">
                    {formatDateRu(a.date)} • {a.startTime}
                  </div>
                  <div className="text-slate-400">
                    {a.clientName} • {a.clientPhone}
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <Badge tone={mapStatusTone(a.status)}>{a.statusLabel}</Badge>
                  {tab === "upcoming" && (
                    <div className="flex gap-2">
                      {a.status !== "cancelled" && (
                        <button
                          onClick={() => updateStatus(a.id, "cancelled")}
                          className="px-3 py-1.5 rounded-full border border-slate-700 text-slate-100 hover:bg-slate-900 transition"
                        >
                          Отменить
                        </button>
                      )}
                      <button className="px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900 transition">
                        Перенести
                      </button>
                    </div>
                  )}
                  {tab === "past" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteAppointment(a.id)}
                        className="px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-rose-600/20 hover:border-rose-500/60 hover:text-rose-100 transition"
                      >
                        Удалить запись
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

// ---- 5. Вход через Supabase Auth ----

export const LoginPage = () => {
  const [mode, setMode] = useState("login");
  const [accountRole, setAccountRole] = useState("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, user, role: userRole } = useAuth();
  const { pushNotification } = useNotifications();

  useEffect(() => {
    if (!user) return;
    if (userRole === "cosmetologist" || userRole === "admin") {
      navigate("/admin");
    } else {
      navigate("/my-appointments");
    }
  }, [user, userRole, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!email.trim()) {
      nextErrors.email = "Введите email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Некорректный формат email";
    }
    if (!password) {
      nextErrors.password = "Введите пароль";
    } else if (mode === "register" && password.length < 6) {
      nextErrors.password = "Пароль не менее 6 символов";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setErrors({});

    if (mode === "register") {
      const { data, error } = await signUp(
        email.trim(),
        password,
        fullName.trim(),
        accountRole
      );
      setSubmitting(false);
      if (error) {
        setErrors({ form: error.message });
        return;
      }
      if (data?.user && !data.session) {
        pushNotification("Проверьте почту: отправлена ссылка для подтверждения.", "info");
        setMode("login");
        setPassword("");
        return;
      }
      pushNotification("Регистрация успешна.", "info");
    } else {
      const { error } = await signIn(email.trim(), password);
      setSubmitting(false);
      if (error) {
        setErrors({ form: error.message });
        return;
      }
      // Редирект произойдёт в useEffect при обновлении user
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-1">Вход</h2>
        <p className="text-xs text-slate-400">
          Войдите как клиент или косметолог. После входа вы попадёте в свой раздел в зависимости от роли.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4 text-xs">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setAccountRole("client"); setErrors({}); }}
            className={`flex-1 px-3 py-2 rounded-full border ${
              accountRole === "client"
                ? "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                : "border-slate-800 text-slate-200 hover:border-slate-700"
            }`}
          >
            Я клиент
          </button>
          <button
            type="button"
            onClick={() => { setAccountRole("admin"); setErrors({}); }}
            className={`flex-1 px-3 py-2 rounded-full border ${
              accountRole === "admin"
                ? "border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-100"
                : "border-slate-800 text-slate-200 hover:border-slate-700"
            }`}
          >
            Я косметолог
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <div className="space-y-1.5">
              <label className="text-slate-300">Имя</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Как к вам обращаться"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none text-xs focus:border-emerald-400"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-slate-300">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className={`w-full bg-slate-900 rounded-xl px-3 py-2 outline-none text-xs ${
                errors.email ? "border border-rose-500" : "border border-slate-700 focus:border-emerald-400"
              }`}
            />
            {errors.email && <p className="text-[11px] text-rose-400">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-300">Пароль *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full bg-slate-900 rounded-xl px-3 py-2 outline-none text-xs ${
                errors.password ? "border border-rose-500" : "border border-slate-700 focus:border-emerald-400"
              }`}
            />
            {errors.password && <p className="text-[11px] text-rose-400">{errors.password}</p>}
          </div>
          {errors.form && (
            <p className="text-[11px] text-rose-400">{errors.form}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition disabled:opacity-60"
          >
            {submitting ? "Проверка..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <div className="border-t border-slate-800 pt-3 text-center">
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setErrors({}); }}
            className="text-slate-400 hover:text-slate-200 text-[11px]"
          >
            {mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- 6–9. Админские страницы ----

const AdminShell = ({ title, description, children }) => {
  const location = useLocation();

  const linkClass = (path) =>
    `w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between ${
      location.pathname === path
        ? "bg-slate-900 text-slate-100 border border-slate-700"
        : "text-slate-300 hover:bg-slate-900/60 border border-transparent"
    }`;

  return (
    <div className="grid md:grid-cols-[minmax(0,1.1fr),minmax(0,2fr)] gap-5">
      <aside className="space-y-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-1">{title}</h2>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 space-y-2">
          <Link to="/admin" className={linkClass("/admin")}>
            <span>Дашборд</span>
            <span className="text-[10px] text-slate-500">сегодня</span>
          </Link>
          <Link to="/admin/schedule" className={linkClass("/admin/schedule")}>
            <span>Расписание</span>
          </Link>
          <Link to="/admin/appointments" className={linkClass("/admin/appointments")}>
            <span>Все записи</span>
          </Link>
          <Link to="/admin/services" className={linkClass("/admin/services")}>
            <span>Услуги</span>
          </Link>
        </div>
      </aside>
      <section>{children}</section>
    </div>
  );
};

export const AdminDashboardPage = () => {
  const [appointmentsForDate, setAppointmentsForDate] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { pushNotification } = useNotifications();

  const fetchForDate = useCallback(async () => {
    setLoading(true);
    let data = [];
    let err = null;
    try {
      const payload = await api.appointments.adminList();
      data = (payload.appointments || []).filter((item) => item.date === selectedDate);
    } catch (error) {
      err = error;
    }

    if (err) {
      setError(err.message);
      setAppointmentsForDate([]);
    } else {
      const normalized =
        (data || []).map((a) => ({
          id: a.id,
          date: a.date,
          startTime: a.start_time,
          endTime: a.end_time,
          status: a.status,
          statusLabel: mapStatusLabel(a.status),
          serviceName: a.service?.name || "Услуга",
          clientName: a.client_name,
          clientPhone: a.client_phone
        })) ?? [];
      setAppointmentsForDate(normalized);
      setError(null);
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchForDate();
  }, [fetchForDate]);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.appointments.adminUpdateStatus(id, newStatus);
    } catch (error) {
      pushNotification("Не удалось обновить запись: " + error.message, "error");
      return;
    }
    setAppointmentsForDate((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus, statusLabel: mapStatusLabel(newStatus) } : a))
    );
    if (newStatus === "confirmed") pushNotification("Запись подтверждена", "info");
    if (newStatus === "cancelled") pushNotification("Запись отменена", "info");
  };

  return (
    <AdminShell
      title="Панель косметолога"
      description="Центральный экран для управления записями клиентов по выбранной дате."
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-xs flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="text-slate-300">Фильтр даты записей</div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              lang="ru-RU"
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
            />
            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              className="px-3 py-2 rounded-full border border-slate-700 text-slate-100 hover:bg-slate-900 transition"
            >
              Сегодня
            </button>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-slate-400 mb-1">Записей на выбранную дату</div>
            <div className="text-xl font-semibold text-slate-100">
              {appointmentsForDate.length}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-slate-400 mb-1">Свободных слотов</div>
            <div className="text-xl font-semibold text-slate-100">4</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-slate-400 mb-1">Отмен</div>
            <div className="text-xl font-semibold text-slate-100">0</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            to="/booking"
            className="px-3 py-2 rounded-full bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition"
          >
            Добавить запись вручную
          </Link>
          <Link
            to="/admin/schedule"
            className="px-3 py-2 rounded-full border border-slate-700 text-slate-100 hover:bg-slate-900 transition"
          >
            Открыть расписание
          </Link>
          <Link
            to="/admin/services"
            className="px-3 py-2 rounded-full border border-slate-700 text-slate-100 hover:bg-slate-900 transition"
          >
            Управление услугами
          </Link>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Записи на {formatDateRu(selectedDate)}</h3>
          <div className="space-y-2 text-xs">
            {loading && (
              <div className="text-slate-400">Загрузка записей...</div>
            )}
            {error && !loading && (
              <div className="text-rose-400">
                Не удалось загрузить записи: {error}
              </div>
            )}
            {!loading && !error && appointmentsForDate.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/70 p-4 text-slate-400">
                На выбранную дату пока нет записей. Свободные слоты можно открыть в разделе
                &laquo;Расписание&raquo;.
              </div>
            ) : (
              appointmentsForDate.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-slate-100">
                      {a.startTime} • {a.serviceName}
                    </div>
                    <div className="text-slate-400">
                      {a.clientName} • {a.clientPhone}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={mapStatusTone(a.status)}>{a.statusLabel}</Badge>
                    {a.status === "pending" && (
                      <button
                        onClick={() => updateStatus(a.id, "confirmed")}
                        className="px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/30 transition text-[11px]"
                      >
                        Подтвердить
                      </button>
                    )}
                    {a.status !== "cancelled" && (
                      <button
                        onClick={() => updateStatus(a.id, "cancelled")}
                        className="px-3 py-1.5 rounded-full border border-slate-700 text-slate-100 hover:bg-slate-900 transition text-[11px]"
                      >
                        Отменить
                      </button>
                    )}
                    <button className="px-3 py-1.5 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-900 transition text-[11px]">
                      Перенести
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

export const AdminSchedulePage = () => {
  const [workStart, setWorkStart] = useState("10:00");
  const [workEnd, setWorkEnd] = useState("19:00");
  const [breakStart, setBreakStart] = useState("14:00");
  const [breakEnd, setBreakEnd] = useState("15:00");

  const { pushNotification } = useNotifications();

  const handleSave = () => {
    // Простая валидация временных интервалов
    const allFilled = workStart && workEnd && breakStart && breakEnd;
    if (!allFilled) {
      pushNotification("Заполните все поля рабочего времени и перерыва", "error");
      return;
    }
    if (workStart >= workEnd) {
      pushNotification("Время начала работы должно быть раньше времени окончания", "error");
      return;
    }
    if (!(breakStart >= workStart && breakEnd <= workEnd && breakStart < breakEnd)) {
      pushNotification(
        "Перерыв должен находиться внутри рабочего времени и иметь корректный интервал",
        "error"
      );
      return;
    }
    pushNotification("Расписание сохранено (пока только на фронтенде).", "info");
  };

  const timeline = [
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00"
  ];

  return (
    <AdminShell
      title="Расписание"
      description="Настройте рабочие часы и перерывы. В V1 это демо-визуализация без сохранения на сервер."
    >
      <div className="space-y-4 text-xs">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-slate-300">Рабочее время с</label>
            <input
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-300">до</label>
            <input
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-300">Перерыв с</label>
            <input
              value={breakStart}
              onChange={(e) => setBreakStart(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-300">до</label>
            <input
              value={breakEnd}
              onChange={(e) => setBreakEnd(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-full bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition"
        >
          Сохранить расписание
        </button>

        <div className="space-y-2 mt-3">
          <h3 className="text-sm font-semibold">Визуализация дня</h3>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 space-y-2">
            <div className="flex justify-between text-[10px] text-slate-500">
              {timeline.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="h-10 rounded-xl bg-slate-900 flex overflow-hidden">
              <div className="flex-1 bg-emerald-500/15" />
            </div>
            <p className="text-[11px] text-slate-400">
              В реальном приложении здесь отображались бы занятые слоты и перерывы поверх
              рабочей шкалы времени.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

const todayDate = () => new Date().toISOString().slice(0, 10);

export const AdminAppointmentsPage = () => {
  const [tab, setTab] = useState("upcoming");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { pushNotification } = useNotifications();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    let data = [];
    let err = null;
    try {
      const payload = await api.appointments.adminList();
      data = payload.appointments || [];
    } catch (error) {
      err = error;
    }

    if (err) {
      setError(err.message);
      setAppointments([]);
    } else {
      const normalized =
        (data || []).map((a) => ({
          id: a.id,
          date: a.date,
          startTime: a.start_time,
          status: a.status,
          statusLabel: mapStatusLabel(a.status),
          serviceName: a.service?.name || "Услуга",
          clientName: a.client_name,
          clientPhone: a.client_phone
        })) ?? [];
      setAppointments(normalized);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.appointments.adminUpdateStatus(id, newStatus);
    } catch (error) {
      pushNotification("Не удалось обновить запись: " + error.message, "error");
      return;
    }
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus, statusLabel: mapStatusLabel(newStatus) } : a))
    );
    if (newStatus === "confirmed") pushNotification("Запись подтверждена", "info");
    if (newStatus === "cancelled") pushNotification("Запись отменена", "info");
  };

  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const RESCHEDULE_SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  const openReschedule = (a) => {
    setRescheduleAppointment(a);
    setRescheduleDate(a.date);
    setRescheduleTime(a.startTime);
  };

  const saveReschedule = async () => {
    if (!rescheduleAppointment || !rescheduleDate || !rescheduleTime) {
      pushNotification("Выберите дату и время", "error");
      return;
    }
    setRescheduleSaving(true);
    let err = null;
    try {
      await api.appointments.adminReschedule(
        rescheduleAppointment.id,
        rescheduleDate,
        rescheduleTime
      );
    } catch (error) {
      err = error;
    }
    setRescheduleSaving(false);
    if (err) {
      pushNotification("Не удалось перенести запись: " + err.message, "error");
      return;
    }
    pushNotification("Запись перенесена на " + rescheduleDate + " в " + rescheduleTime, "info");
    setRescheduleAppointment(null);
    fetchAll();
  };

  const now = todayDate();
  const byTab = useMemo(() => {
    const upcoming = [];
    const past = [];
    const cancelled = [];
    for (const a of appointments) {
      if (a.status === "cancelled") cancelled.push(a);
      else if (a.date >= now) upcoming.push(a);
      else past.push(a);
    }
    return { upcoming, past, cancelled };
  }, [appointments, now]);

  const list = tab === "upcoming" ? byTab.upcoming : tab === "past" ? byTab.past : byTab.cancelled;
  const filtered = list.filter((a) => {
    const byStatus = statusFilter === "all" || a.status === statusFilter;
    const bySearch =
      !search ||
      a.clientName.toLowerCase().includes(search.toLowerCase()) ||
      a.serviceName.toLowerCase().includes(search.toLowerCase());
    return byStatus && bySearch;
  });

  const isPastTab = tab === "past";

  return (
    <AdminShell
      title="Все записи"
      description="Полный список записей клиентов. Вкладки: будущие, прошедшие, отменённые."
    >
      <div className="space-y-3 text-xs">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="inline-flex rounded-full border border-slate-800 bg-slate-950/80 p-1 text-[11px]">
              <button
                type="button"
                onClick={() => setTab("upcoming")}
                className={`px-3 py-1.5 rounded-full ${tab === "upcoming" ? "bg-emerald-500 text-slate-950" : "text-slate-300"}`}
              >
                Будущие
              </button>
              <button
                type="button"
                onClick={() => setTab("past")}
                className={`px-3 py-1.5 rounded-full ${tab === "past" ? "bg-emerald-500 text-slate-950" : "text-slate-300"}`}
              >
                Прошедшие
              </button>
              <button
                type="button"
                onClick={() => setTab("cancelled")}
                className={`px-3 py-1.5 rounded-full ${tab === "cancelled" ? "bg-emerald-500 text-slate-950" : "text-slate-300"}`}
              >
                Отменённые
              </button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
            >
              <option value="all">Все статусы</option>
              <option value="confirmed">Подтверждённые</option>
              <option value="pending">Ожидают подтверждения</option>
              <option value="cancelled">Отменённые</option>
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени или услуге"
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400 flex-1 min-w-[140px]"
            />
          </div>
          {!isPastTab && (
            <Link
              to="/booking"
              className="px-3 py-2 rounded-full bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition whitespace-nowrap"
            >
              Добавить запись
            </Link>
          )}
        </div>

        {loading && <div className="text-slate-400">Загрузка записей...</div>}
        {error && !loading && (
          <div className="text-rose-400">Не удалось загрузить записи: {error}</div>
        )}

        {!loading && !error && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-900/80 text-slate-400">
                <tr>
                  <th className="text-left px-3 py-2 font-normal">Дата</th>
                  <th className="text-left px-3 py-2 font-normal">Время</th>
                  <th className="text-left px-3 py-2 font-normal">Клиент</th>
                  <th className="text-left px-3 py-2 font-normal">Услуга</th>
                  <th className="text-left px-3 py-2 font-normal">Статус</th>
                  <th className="text-left px-3 py-2 font-normal">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-t border-slate-800/80">
                    <td className="px-3 py-2">{formatDateRu(a.date)}</td>
                    <td className="px-3 py-2">{a.startTime}</td>
                    <td className="px-3 py-2">{a.clientName}</td>
                    <td className="px-3 py-2">{a.serviceName}</td>
                    <td className="px-3 py-2">
                      <Badge tone={mapStatusTone(a.status)}>{a.statusLabel}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {a.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(a.id, "confirmed")}
                            className="px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/30 transition"
                          >
                            Подтвердить
                          </button>
                        )}
                        {a.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(a.id, "cancelled")}
                            className="px-2 py-1 rounded-full border border-slate-700 text-slate-100 hover:bg-slate-900 transition"
                          >
                            Отменить
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openReschedule(a)}
                          className="px-2 py-1 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-900 transition"
                        >
                          Перенести
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-slate-400 border-t border-slate-800/80"
                    >
                      Записей по выбранным фильтрам не найдено.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {rescheduleAppointment && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80"
            onClick={() => !rescheduleSaving && setRescheduleAppointment(null)}
          >
            <div
              className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-slate-100 mb-2">
                Перенести запись: {rescheduleAppointment.clientName}
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Новая дата</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    min={now}
                    lang="ru-RU"
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Время</label>
                  <div className="flex flex-wrap gap-1.5">
                    {RESCHEDULE_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setRescheduleTime(slot)}
                        className={`px-2 py-1 rounded-lg border transition ${
                          rescheduleTime === slot
                            ? "bg-emerald-500 border-emerald-500 text-slate-950"
                            : "border-slate-600 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={saveReschedule}
                  disabled={rescheduleSaving || !rescheduleDate || !rescheduleTime}
                  className="px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {rescheduleSaving ? "Сохранение…" : "Сохранить"}
                </button>
                <button
                  type="button"
                  onClick={() => !rescheduleSaving && setRescheduleAppointment(null)}
                  className="px-3 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
};

export const AdminServicesPage = () => {
  const { services, loading, error } = useServices();
  const { pushNotification } = useNotifications();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    durationMin: "",
    price: "",
    description: "",
    image: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddService = async (event) => {
    event.preventDefault();
    const errors = {};

    if (!form.name.trim()) {
      errors.name = "Введите название услуги";
    }
    const duration = parseInt(form.durationMin, 10);
    if (Number.isNaN(duration) || duration <= 0) {
      errors.durationMin = "Укажите длительность в минутах";
    }
    const price = parseFloat(form.price.toString().replace(",", "."));
    if (Number.isNaN(price) || price <= 0) {
      errors.price = "Укажите корректную цену";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    let err = null;
    try {
      await api.services.create({
        name: form.name.trim(),
        category: form.category.trim() || null,
        durationMin: duration,
        price,
        description: form.description.trim() || null,
        image: form.image.trim() || null
      });
    } catch (error) {
      err = error;
    }
    setSubmitting(false);

    if (err) {
      pushNotification("Не удалось добавить услугу: " + err.message, "error");
      return;
    }

    pushNotification("Услуга успешно добавлена", "info");
    setShowForm(false);
    setForm({
      name: "",
      category: "",
      durationMin: "",
      price: "",
      description: "",
      image: ""
    });
    // Для простоты перезагрузим страницу, чтобы перечитать список услуг
    window.location.reload();
  };

  return (
    <AdminShell
      title="Услуги для клиентов"
      description="Каталог процедур, которые видит клиент при записи."
    >
      <div className="space-y-3 text-xs">
        <div className="flex justify-between items-center">
          <div className="text-slate-400">
            Всего услуг: <span className="text-slate-100">{services.length}</span>
          </div>
          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="px-3 py-2 rounded-full bg-slate-900 border border-slate-700 text-slate-100 hover:bg-slate-800 transition"
          >
            {showForm ? "Скрыть форму" : "Добавить услугу"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleAddService}
            className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3"
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-slate-300 text-[11px]">Название *</label>
                <input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={`w-full bg-slate-900 rounded-xl px-3 py-2 outline-none text-xs ${
                    formErrors.name
                      ? "border border-rose-500 focus:border-rose-400"
                      : "border border-slate-700 focus:border-emerald-400"
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-400">{formErrors.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-300 text-[11px]">Категория</label>
                <input
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  placeholder="лицо, тело, депиляция..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none text-xs focus:border-emerald-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-300 text-[11px]">Длительность (мин) *</label>
                <input
                  value={form.durationMin}
                  onChange={(e) => handleChange("durationMin", e.target.value)}
                  className={`w-full bg-slate-900 rounded-xl px-3 py-2 outline-none text-xs ${
                    formErrors.durationMin
                      ? "border border-rose-500 focus:border-rose-400"
                      : "border border-slate-700 focus:border-emerald-400"
                  }`}
                />
                {formErrors.durationMin && (
                  <p className="text-[11px] text-rose-400">{formErrors.durationMin}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-300 text-[11px]">Цена (₽) *</label>
                <input
                  value={form.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  className={`w-full bg-slate-900 rounded-xl px-3 py-2 outline-none text-xs ${
                    formErrors.price
                      ? "border border-rose-500 focus:border-rose-400"
                      : "border border-slate-700 focus:border-emerald-400"
                  }`}
                />
                {formErrors.price && (
                  <p className="text-[11px] text-rose-400">{formErrors.price}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 text-[11px]">Описание</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none text-xs focus:border-emerald-400 resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 text-[11px]">Ссылка на изображение</label>
              <input
                value={form.image}
                onChange={(e) => handleChange("image", e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none text-xs focus:border-emerald-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-2 rounded-full border border-slate-700 text-slate-100 hover:bg-slate-900 transition"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-2 rounded-full bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition disabled:opacity-60"
              >
                {submitting ? "Сохранение..." : "Сохранить услугу"}
              </button>
            </div>
          </form>
        )}

        {loading && (
          <div className="text-slate-400">Загрузка услуг...</div>
        )}
        {error && !loading && (
          <div className="text-rose-400">Не удалось загрузить услуги: {error}</div>
        )}
        {!loading && !error && (
          <div className="space-y-2">
            {services.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{s.name}</span>
                    <Badge>{s.category}</Badge>
                  </div>
                  <div className="text-slate-400">
                    {s.durationMin} мин • {s.price.toLocaleString()} ₽
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-full border border-slate-700 text-slate-100 hover:bg-slate-900 transition">
                    Редактировать
                  </button>
                  <button className="px-3 py-1.5 rounded-full border border-slate-800 text-slate-300 hover:bg-slate-900 transition">
                    Скрыть
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
};

// ---- 11. Страница 404 ----

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="max-w-md mx-auto text-center space-y-4">
      <div className="text-6xl">404</div>
      <div className="text-sm font-semibold">Страница не найдена</div>
      <p className="text-xs text-slate-400 break-all">
        Адрес <span className="text-slate-200">{location.pathname}</span> не существует.
      </p>
      <button
        onClick={() => navigate("/")}
        className="px-4 py-2.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition"
      >
        Вернуться на главную
      </button>
    </div>
  );
};

