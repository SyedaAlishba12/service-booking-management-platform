import type { ProviderAvailability } from "@/types/provider";

const toMinutes = (t: string) => {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
};

export interface AvailabilitySummary {
  workingDays: number;
  weeklyHours: number;
  nextDayOff: string | null; // YYYY-MM-DD
}

/** Working days, weekly bookable hours (breaks subtracted) and the next day off. */
export function summarizeAvailability(av: ProviderAvailability, today: string): AvailabilitySummary {
  const work = av.weekly.filter((r) => !r.is_break);
  const days = new Set(work.map((r) => r.day_of_week));
  const span = (rows: typeof work) =>
    rows.reduce((sum, r) => sum + toMinutes(r.end_time) - toMinutes(r.start_time), 0);
  const breaksOnWorkDays = av.weekly.filter((r) => r.is_break && days.has(r.day_of_week));
  const minutes = Math.max(0, span(work) - span(breaksOnWorkDays));
  const nextOff = av.exceptions
    .filter((e) => e.is_day_off && e.exception_date >= today)
    .map((e) => e.exception_date)
    .sort()[0];
  return {
    workingDays: days.size,
    weeklyHours: Math.round((minutes / 60) * 10) / 10,
    nextDayOff: nextOff ?? null,
  };
}

/** Local date as YYYY-MM-DD (not UTC, so "today" matches the user's calendar). */
export function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
