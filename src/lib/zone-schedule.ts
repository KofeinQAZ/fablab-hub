export type DayHours = { day: number; start: string; end: string };
export type ZoneEvent = {
  id: string;
  zone_id: string;
  title: string;
  kind: "event" | "lesson" | string;
  is_recurring: boolean;
  event_date: string | null;
  day_of_week: number | null;
  start_clock: string;
  end_clock: string;
  repeat_until: string | null;
};

/** Monday-first ordering, values follow JS getDay() (0 = Sunday). */
export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];
export const DAY_SHORT: Record<string, string[]> = {
  ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  kz: ["Жс", "Дс", "Сс", "Ср", "Бс", "Жм", "Сб"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export const DEFAULT_HOURS: DayHours[] = [1, 2, 3, 4, 5].map((day) => ({ day, start: "09:00", end: "21:00" }));

export const toMinutes = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const clock5 = (clock: string) => clock.slice(0, 5);

export const parseHours = (raw: unknown): DayHours[] =>
  Array.isArray(raw)
    ? raw.filter((r): r is DayHours => !!r && typeof r.day === "number" && typeof r.start === "string" && typeof r.end === "string")
    : DEFAULT_HOURS;

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Events happening on a given local date (YYYY-MM-DD), sorted by start. */
export function eventsOn(events: ZoneEvent[], date: string): ZoneEvent[] {
  const dow = new Date(`${date}T00:00:00`).getDay();
  return events
    .filter((e) =>
      e.is_recurring
        ? e.day_of_week === dow && (!e.repeat_until || date <= e.repeat_until) && (!e.event_date || date >= e.event_date)
        : e.event_date === date,
    )
    .sort((a, b) => a.start_clock.localeCompare(b.start_clock));
}

export const hoursFor = (hours: DayHours[], date: string) => {
  const dow = new Date(`${date}T00:00:00`).getDay();
  return hours.find((h) => h.day === dow) ?? null;
};
