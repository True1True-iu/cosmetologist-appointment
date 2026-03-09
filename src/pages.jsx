import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useNotifications } from "./App.jsx";

// ---- Моковые данные для услуг и записей ----

const SERVICES = [
  {
    id: "facial-clean",
    name: "Чистка лица",
    category: "лицо",
    durationMin: 60,
    price: 3500,
    description: "Глубокая очищающая процедура для здоровой и свежей кожи.",
    image:
      "https://images.pexels.com/photos/3738341/pexels-photo-3738341.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
  {
    id: "facial-anti-age",
    name: "Anti-age уход",
    category: "лицо",
    durationMin: 75,
    price: 4800,
    description: "Комплексный уход, направленный на улучшение упругости и тона кожи.",
    image:
      "https://images.pexels.com/photos/3738344/pexels-photo-3738344.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
  {
    id: "body-massage",
    name: "Расслабляющий массаж тела",
    category: "тело",
    durationMin: 90,
    price: 5200,
    description: "Глубокое расслабление мышц и снятие напряжения после рабочего дня.",
    image:
      "https://images.pexels.com/photos/3738342/pexels-photo-3738342.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
  {
    id: "depilation",
    name: "Депиляция воском",
    category: "депиляция",
    durationMin: 45,
    price: 2600,
    description: "Быстрая и аккуратная депиляция с длительным результатом.",
    image:
      "https://images.pexels.com/photos/3738343/pexels-photo-3738343.jpeg?auto=compress&cs=tinysrgb&w=800"
  }
];

const INITIAL_APPOINTMENTS = [
  {
    id: "a1",
    serviceId: "facial-clean",
    serviceName: "Чистка лица",
    date: "2026-03-10",
    startTime: "11:00",
    endTime: "12:00",
    status: "подтверждена",
    clientName: "Анна",
    clientPhone: "+7 900 000-00-01",
    comment: "Чувствительная кожа"
  },
  {
    id: "a2",
    serviceId: "body-massage",
    serviceName: "Расслабляющий массаж тела",
    date: "2026-03-09",
    startTime: "18:00",
    endTime: "19:30",
    status: "завершена",
    clientName: "Мария",
    clientPhone: "+7 900 000-00-02",
    comment: ""
  }
];

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
  const navigate = useNavigate();

  const categories = useMemo(
    () => ["all", "лицо", "тело", "депиляция"],
    []
  );

  const filteredServices = SERVICES.filter((s) => {
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

      {filteredServices.length === 0 && (
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
  const [selectedServiceId, setSelectedServiceId] = useState(
    serviceIdFromUrl || SERVICES[0]?.id
  );
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

  const { pushNotification } = useNotifications();
  const navigate = useNavigate();

  const selectedService = SERVICES.find((s) => s.id === selectedServiceId);

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
    if (step === 1 && !selectedService) {
      pushNotification("Выберите услугу, чтобы продолжить", "error");
      return;
    }
    if (step === 2 && (!selectedDate || !selectedTime)) {
      pushNotification("Выберите дату и время записи", "error");
      return;
    }
    if (step === 3 && (!clientData.name || !clientData.phone || !clientData.consentData)) {
      pushNotification("Заполните обязательные поля и согласие на обработку данных", "error");
      return;
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleConfirm = () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    const newAppointment = {
      id: `local-${Date.now()}`,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      date: selectedDate,
      startTime: selectedTime,
      endTime: "", // можно высчитать по длительности
      status: "ожидает подтверждения",
      clientName: clientData.name,
      clientPhone: clientData.phone,
      comment: clientData.comment
    };
    setCreatedAppointment(newAppointment);
    pushNotification("Запись успешно создана! Мы напомним о визите.", "info");
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
          {step === 1 && (
            <StepSelectService
              selectedServiceId={selectedServiceId}
              setSelectedServiceId={setSelectedServiceId}
            />
          )}
          {step === 2 && (
            <StepSelectDateTime
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              slots={slots}
            />
          )}
          {step === 3 && (
            <StepClientData clientData={clientData} setClientData={setClientData} />
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
                    className="text-xs px-3 py-2 rounded-full bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition"
                  >
                    Подтвердить запись
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

const StepSelectService = ({ selectedServiceId, setSelectedServiceId }) => {
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
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-400"
      >
        {SERVICES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} • {s.durationMin} мин • {s.price.toLocaleString()} ₽
          </option>
        ))}
      </select>

      {selectedServiceId && (
        <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs space-y-1">
          <div className="font-semibold">
            {SERVICES.find((s) => s.id === selectedServiceId)?.name}
          </div>
          <div className="text-slate-400">
            {SERVICES.find((s) => s.id === selectedServiceId)?.description}
          </div>
        </div>
      )}
    </div>
  );
};

const StepSelectDateTime = ({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  slots
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

      {!selectedDate && (
        <p className="text-[11px] text-amber-300/90">
          Сначала выберите дату, затем время.
        </p>
      )}
    </div>
  );
};

const StepClientData = ({ clientData, setClientData }) => {
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
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-slate-300">Телефон *</label>
          <input
            value={clientData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+7 ..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
          />
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
              ? `${selectedDate} в ${selectedTime}`
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
            ? `${selectedDate} в ${selectedTime}`
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
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const { pushNotification } = useNotifications();

  const nowDate = "2026-03-09";

  const splitAppointments = useMemo(() => {
    const upcoming = [];
    const past = [];
    const canceled = [];
    for (const a of appointments) {
      if (a.status === "отменена") {
        canceled.push(a);
      } else if (a.date >= nowDate && a.status !== "завершена") {
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

  const updateStatus = (id, status) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    if (status === "отменена") {
      pushNotification("Запись отменена", "info");
    }
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

      {currentList.length === 0 ? (
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
                  {a.date} • {a.startTime}
                </div>
                <div className="text-slate-400">
                  {a.clientName} • {a.clientPhone}
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-2">
                <Badge
                  tone={
                    a.status === "подтверждена"
                      ? "success"
                      : a.status === "отменена"
                      ? "danger"
                      : "warning"
                  }
                >
                  {a.status}
                </Badge>
                <div className="flex gap-2">
                  {a.status !== "отменена" && (
                    <button
                      onClick={() => updateStatus(a.id, "отменена")}
                      className="px-3 py-1.5 rounded-full border border-slate-700 text-slate-100 hover:bg-slate-900 transition"
                    >
                      Отменить
                    </button>
                  )}
                  <button className="px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900 transition">
                    Перенести
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---- 5. Вход / выбор роли ----

export const LoginPage = () => {
  const [role, setRole] = useState("client");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (role === "client") {
      navigate("/my-appointments");
    } else {
      navigate("/admin");
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-1">Вход / выбор роли</h2>
        <p className="text-xs text-slate-400">
          Для демонстрации интерфейса можно переключаться между ролями клиента и
          косметолога без настоящей авторизации.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4 text-xs">
        <div className="flex gap-2">
          <button
            onClick={() => setRole("client")}
            className={`flex-1 px-3 py-2 rounded-full border ${
              role === "client"
                ? "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                : "border-slate-800 text-slate-200 hover:border-slate-700"
            }`}
          >
            Я клиент
          </button>
          <button
            onClick={() => setRole("admin")}
            className={`flex-1 px-3 py-2 rounded-full border ${
              role === "admin"
                ? "border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-100"
                : "border-slate-800 text-slate-200 hover:border-slate-700"
            }`}
          >
            Я косметолог
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {role === "admin" && (
            <>
              <div className="space-y-1.5">
                <label className="text-slate-300">Логин</label>
                <input
                  placeholder="demo"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-fuchsia-400 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-300">Пароль</label>
                <input
                  placeholder="demo"
                  type="password"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-fuchsia-400 text-xs"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Для V1 это заглушка: при нажатии кнопки вы просто попадаете в панель
                косметолога.
              </p>
            </>
          )}

          <button
            type="submit"
            className="w-full px-4 py-2.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition"
          >
            Продолжить
          </button>
        </form>
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
  const todayAppointments = INITIAL_APPOINTMENTS.filter(
    (a) => a.date === "2026-03-09"
  );

  return (
    <AdminShell
      title="Панель косметолога"
      description="Центральный экран для управления сегодняшним днём: ближайшие приёмы и быстрые действия."
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-slate-400 mb-1">Записей сегодня</div>
            <div className="text-xl font-semibold text-slate-100">
              {todayAppointments.length}
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
          <h3 className="text-sm font-semibold">Записи на сегодня</h3>
          <div className="space-y-2 text-xs">
            {todayAppointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/70 p-4 text-slate-400">
                На сегодня пока нет записей. Свободные слоты можно открыть в разделе
                &laquo;Расписание&raquo;.
              </div>
            ) : (
              todayAppointments.map((a) => (
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
                  <div className="flex items-center gap-2">
                    <Badge tone="success">подтверждена</Badge>
                    <button className="px-3 py-1.5 rounded-full border border-slate-700 text-slate-100 hover:bg-slate-900 transition">
                      Отменить
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

export const AdminAppointmentsPage = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = INITIAL_APPOINTMENTS.filter((a) => {
    const byStatus = statusFilter === "all" || a.status === statusFilter;
    const bySearch =
      !search ||
      a.clientName.toLowerCase().includes(search.toLowerCase()) ||
      a.serviceName.toLowerCase().includes(search.toLowerCase());
    return byStatus && bySearch;
  });

  return (
    <AdminShell
      title="Все записи"
      description="Полный список записей клиентов с фильтрами и поиском."
    >
      <div className="space-y-3 text-xs">
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
          >
            <option value="all">Все статусы</option>
            <option value="подтверждена">Подтверждённые</option>
            <option value="ожидает подтверждения">Ожидают подтверждения</option>
            <option value="отменена">Отменённые</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени клиента или услуге"
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400 flex-1 min-w-[160px]"
          />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="text-left px-3 py-2 font-normal">Дата</th>
                <th className="text-left px-3 py-2 font-normal">Время</th>
                <th className="text-left px-3 py-2 font-normal">Клиент</th>
                <th className="text-left px-3 py-2 font-normal">Услуга</th>
                <th className="text-left px-3 py-2 font-normal">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-slate-800/80">
                  <td className="px-3 py-2">{a.date}</td>
                  <td className="px-3 py-2">{a.startTime}</td>
                  <td className="px-3 py-2">{a.clientName}</td>
                  <td className="px-3 py-2">{a.serviceName}</td>
                  <td className="px-3 py-2">
                    <Badge
                      tone={
                        a.status === "подтверждена"
                          ? "success"
                          : a.status === "отменена"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {a.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-slate-400 border-t border-slate-800/80"
                  >
                    Записей по выбранным фильтрам не найдено.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
};

export const AdminServicesPage = () => {
  const [services] = useState(SERVICES);

  return (
    <AdminShell
      title="Услуги для клиентов"
      description="Каталог процедур, которые видит клиент при записи. В V1 это только список без настоящего редактирования."
    >
      <div className="space-y-3 text-xs">
        <div className="flex justify-between items-center">
          <div className="text-slate-400">
            Всего услуг: <span className="text-slate-100">{services.length}</span>
          </div>
          <button className="px-3 py-2 rounded-full bg-slate-900 border border-slate-700 text-slate-100 hover:bg-slate-800 transition">
            Добавить услугу
          </button>
        </div>
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

