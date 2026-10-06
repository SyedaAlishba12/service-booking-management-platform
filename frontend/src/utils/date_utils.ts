const DEFAULT_LOCALE = "en-US";

export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
  locale = DEFAULT_LOCALE
): string {
  const parsedDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, options).format(parsedDate);
}

export function formatDateShort(date: Date | string): string {
  return formatDate(date, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateLong(date: Date | string): string {
  return formatDate(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMonthYear(date: Date | string): string {
  return formatDate(date, {
    month: "long",
    year: "numeric",
  });
}

export function formatTime(
  date: Date | string,
  locale = DEFAULT_LOCALE
): string {
  return formatDate(
    date,
    {
      hour: "numeric",
      minute: "2-digit",
    },
    locale
  );
}

export function isValidDate(date: Date | string): boolean {
  const parsedDate = date instanceof Date ? date : new Date(date);
  return !Number.isNaN(parsedDate.getTime());
}

export function toDate(value: Date | string): Date | null {
  const parsedDate = value instanceof Date ? value : new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}