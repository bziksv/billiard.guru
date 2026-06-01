"use client";

import {
  WEEKDAYS,
  type PriceTier,
  type Weekday,
  type WeeklyHoursSlot,
} from "@/lib/club-schedule";

const DAY_LABELS: Record<Weekday, string> = {
  mon: "Пн",
  tue: "Вт",
  wed: "Ср",
  thu: "Чт",
  fri: "Пт",
  sat: "Сб",
  sun: "Вс",
};

export function ClubWeeklyHoursFields({
  slots,
  onChange,
}: {
  slots: WeeklyHoursSlot[];
  onChange: (next: WeeklyHoursSlot[]) => void;
}) {
  function updateSlot(index: number, patch: Partial<WeeklyHoursSlot>) {
    onChange(slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  function toggleDay(index: number, day: Weekday) {
    const slot = slots[index]!;
    const days = slot.days.includes(day)
      ? slot.days.filter((d) => d !== day)
      : [...slot.days, day].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
    updateSlot(index, { days });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">График работы по дням недели</p>
      {slots.map((slot, index) => (
        <div key={index} className="rounded-lg border border-zinc-800 p-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(index, day)}
                className={
                  slot.days.includes(day)
                    ? "rounded-md bg-emerald-600 px-2 py-1 text-xs text-white"
                    : "rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400"
                }
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-zinc-400">
              с
              <input
                type="time"
                value={slot.open}
                onChange={(e) => updateSlot(index, { open: e.target.value })}
                className="site-input ml-2"
              />
            </label>
            <label className="text-xs text-zinc-400">
              до
              <input
                type="time"
                value={slot.close}
                onChange={(e) => updateSlot(index, { close: e.target.value })}
                className="site-input ml-2"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={Boolean(slot.closesAfterMidnight)}
                onChange={(e) => updateSlot(index, { closesAfterMidnight: e.target.checked })}
              />
              после полуночи
            </label>
          </div>
          {slots.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(slots.filter((_, i) => i !== index))}
              className="text-xs text-red-400 hover:underline"
            >
              Удалить строку
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...slots,
            { days: ["mon"], open: "12:00", close: "23:00", closesAfterMidnight: false },
          ])
        }
        className="text-sm text-emerald-400 hover:underline"
      >
        + Добавить интервал
      </button>
    </div>
  );
}

const DAY_PRESETS = [
  { value: "all", label: "Ежедневно" },
  { value: "weekdays", label: "Будни" },
  { value: "weekend", label: "Выходные" },
] as const;

export function ClubPriceTiersFields({
  tiers,
  onChange,
}: {
  tiers: PriceTier[];
  onChange: (next: PriceTier[]) => void;
}) {
  function updateTier(index: number, patch: Partial<PriceTier>) {
    onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">Тарифы — можно указать разное время и цену</p>
      {tiers.map((tier, index) => (
        <div key={index} className="rounded-lg border border-zinc-800 p-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-zinc-400">
              Название
              <input
                value={tier.label}
                onChange={(e) => updateTier(index, { label: e.target.value })}
                placeholder="День / Вечер"
                className="site-input mt-1 w-full"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Цена
              <input
                value={tier.price}
                onChange={(e) => updateTier(index, { price: e.target.value })}
                placeholder="400 ₽/ч"
                className="site-input mt-1 w-full"
              />
            </label>
          </div>
          <label className="block text-xs text-zinc-400">
            Дни
            <select
              value={
                tier.days === "weekdays" || tier.days === "weekend" || tier.days === "all"
                  ? tier.days
                  : "custom"
              }
              onChange={(e) => {
                const value = e.target.value;
                if (value === "custom") {
                  updateTier(index, { days: ["mon"] });
                } else {
                  updateTier(index, { days: value as PriceTier["days"] });
                }
              }}
              className="site-input mt-1 w-full"
            >
              {DAY_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
              <option value="custom">Выбранные дни</option>
            </select>
          </label>
          {Array.isArray(tier.days) && (
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const days = tier.days as Weekday[];
                    const next = days.includes(day)
                      ? days.filter((d) => d !== day)
                      : [...days, day].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
                    updateTier(index, { days: next.length ? next : ["mon"] });
                  }}
                  className={
                    (tier.days as Weekday[]).includes(day)
                      ? "rounded-md bg-emerald-600 px-2 py-1 text-xs text-white"
                      : "rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400"
                  }
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-zinc-400">
              с
              <input
                type="time"
                value={tier.timeFrom ?? ""}
                onChange={(e) => updateTier(index, { timeFrom: e.target.value || undefined })}
                className="site-input ml-2"
              />
            </label>
            <label className="text-xs text-zinc-400">
              до
              <input
                type="time"
                value={tier.timeTo ?? ""}
                onChange={(e) => updateTier(index, { timeTo: e.target.value || undefined })}
                className="site-input ml-2"
              />
            </label>
          </div>
          <label className="block text-xs text-zinc-400">
            Примечание
            <input
              value={tier.note ?? ""}
              onChange={(e) => updateTier(index, { note: e.target.value || undefined })}
              placeholder="скидка 20%"
              className="site-input mt-1 w-full"
            />
          </label>
          <button
            type="button"
            onClick={() => onChange(tiers.filter((_, i) => i !== index))}
            className="text-xs text-red-400 hover:underline"
          >
            Удалить тариф
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...tiers,
            { label: "Новый тариф", days: "all", price: "400 ₽/ч" },
          ])
        }
        className="text-sm text-emerald-400 hover:underline"
      >
        + Добавить тариф
      </button>
      <p className="text-xs text-zinc-500">
        На сайте подсветится тариф, который действует прямо сейчас по дню и времени.
      </p>
    </div>
  );
}

export const DEMO_WEEKLY_HOURS: WeeklyHoursSlot[] = [
  { days: ["mon", "tue", "wed", "thu"], open: "12:00", close: "23:00" },
  { days: ["fri"], open: "12:00", close: "01:00", closesAfterMidnight: true },
  { days: ["sat", "sun"], open: "11:00", close: "01:00", closesAfterMidnight: true },
];

export const DEMO_PRICE_TIERS: PriceTier[] = [
  {
    label: "День",
    days: "weekdays",
    timeFrom: "12:00",
    timeTo: "17:00",
    price: "400 ₽/ч",
    note: "скидка 20%",
  },
  {
    label: "Вечер",
    days: "weekdays",
    timeFrom: "17:00",
    timeTo: "23:00",
    price: "500 ₽/ч",
  },
  {
    label: "Пятница",
    days: ["fri"],
    timeFrom: "12:00",
    timeTo: "01:00",
    closesAfterMidnight: true,
    price: "550 ₽/ч",
  },
  {
    label: "Выходные",
    days: "weekend",
    timeFrom: "11:00",
    timeTo: "01:00",
    closesAfterMidnight: true,
    price: "550 ₽/ч",
  },
  {
    label: "Абонемент",
    days: "all",
    price: "3 500 ₽",
    note: "10 часов",
  },
];
