"use client";

import { useMemo, useState } from "react";

interface CalendarProps {
  value?: string;
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
}

const weekDays = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function ChevronIcon({
  direction,
}: {
  direction: "left" | "right";
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4.5 w-4.5"
    >
      <path
        d={
          direction === "left"
            ? "M12.5 4.5L7 10L12.5 15.5"
            : "M7.5 4.5L13 10L7.5 15.5"
        }
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
}: CalendarProps) {
  const initialDate = value
    ? new Date(`${value}T00:00:00`)
    : new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      1,
    ),
  );

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(
      year,
      month + 1,
      0,
    ).getDate();

    const cells: Array<Date | null> = [];

    for (let index = 0; index < firstDay; index++) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(year, month, day));
    }

    return cells;
  }, [currentMonth]);

  const isDisabled = (date: Date) => {
    const formatted = formatDate(date);

    if (minDate && formatted < minDate) {
      return true;
    }

    if (maxDate && formatted > maxDate) {
      return true;
    }

    return false;
  };

  const monthLabel = currentMonth.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1,
      ),
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1,
      ),
    );
  };

  return (
    <div className="rounded-3xl border border-line bg-surface p-4 shadow-[0_8px_30px_rgba(8,45,110,0.05)]">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={goToPreviousMonth}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-brand-soft hover:text-brand"
        >
          <ChevronIcon direction="left" />
        </button>

        <h3 className="text-base font-bold tracking-tight text-foreground">
          {monthLabel}
        </h3>

        <button
          type="button"
          aria-label="Next month"
          onClick={goToNextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-brand-soft hover:text-brand"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-1.5 text-xs font-semibold text-muted"
          >
            {day}
          </div>
        ))}

        {days.map((date, index) => {
          if (!date) {
            return (
              <div
                key={`empty-${index}`}
                className="aspect-square"
              />
            );
          }

          const formatted = formatDate(date);
          const selected = value === formatted;
          const disabled = isDisabled(date);

          return (
            <button
              key={formatted}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(formatted)}
              className={[
                "aspect-square rounded-md text-sm font-medium",
                "transition-colors duration-150",
                "disabled:cursor-not-allowed disabled:opacity-30",
                selected
                  ? "bg-brand text-white"
                  : "text-foreground hover:bg-brand-soft hover:text-brand",
              ].join(" ")}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}