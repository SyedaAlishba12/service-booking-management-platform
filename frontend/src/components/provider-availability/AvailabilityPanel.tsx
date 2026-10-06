"use client";

import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { DAY_LABELS } from "@/constants/provider";
import {
  useAddAvailability,
  useAddException,
  useDeleteAvailability,
  useDeleteException,
  useMyAvailability,
} from "@/hooks/useProviderProfile";
import { getApiErrorMessage } from "@/utils/api_error_handler";
import ExceptionModal from "./ExceptionModal";
import HoursModal from "./HoursModal";

const hhmm = (t: string) => t.slice(0, 5);

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Notice {
  variant: "success" | "error";
  message: string;
}

export default function AvailabilityPanel() {
  const availability = useMyAvailability(true);
  const addHours = useAddAvailability();
  const removeHours = useDeleteAvailability();
  const addException = useAddException();
  const removeException = useDeleteException();

  const [hoursDay, setHoursDay] = useState<number | null>(null);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  if (availability.isLoading) return <LoadingState message="Loading your availability..." />;
  if (availability.isError || !availability.data) {
    return (
      <ErrorState
        message={getApiErrorMessage(availability.error)}
        action={<Button onClick={() => availability.refetch()}>Try again</Button>}
      />
    );
  }

  const { weekly, exceptions, timezone, slot_interval_minutes, buffer_minutes } = availability.data;

  const remove = (kind: "hours" | "exception", id: string, label: string) => {
    if (!window.confirm(`Remove ${label}?`)) return;
    const mutation = kind === "hours" ? removeHours : removeException;
    mutation.mutate(id, {
      onSuccess: () => setNotice({ variant: "success", message: "Removed." }),
      onError: (e) => setNotice({ variant: "error", message: getApiErrorMessage(e) }),
    });
  };

  return (
    <div className="space-y-5">
      {notice && (
        <Alert variant={notice.variant} onClose={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}

      <Alert variant="info">
        Times are in <strong>{timezone}</strong>. Customers can book every {slot_interval_minutes} minutes
        {buffer_minutes > 0 ? `, with ${buffer_minutes} minutes of rest between bookings` : ""}. Change these in the
        Profile tab.
      </Alert>

      {/* ---------- weekly schedule ---------- */}
      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-foreground">Weekly schedule</h3>
          <Button size="sm" onClick={() => setHoursDay(0)}>
            Add hours
          </Button>
        </CardHeader>
        <CardContent className="divide-y divide-line">
          {DAY_LABELS.map((dayLabel, day) => {
            const rows = weekly.filter((r) => r.day_of_week === day);
            return (
              <div key={dayLabel} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-6">
                <div className="w-28 shrink-0 pt-1 text-sm font-semibold text-foreground">{dayLabel}</div>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {rows.length === 0 && <span className="text-sm text-muted">Not working</span>}
                  {rows.map((row) => (
                    <span key={row.id} className="inline-flex items-center gap-2">
                      <Badge variant={row.is_break ? "warning" : "info"}>
                        {row.is_break ? "Break " : ""}
                        {hhmm(row.start_time)} – {hhmm(row.end_time)}
                      </Badge>
                      <button
                        type="button"
                        aria-label={`Remove ${dayLabel} ${hhmm(row.start_time)} to ${hhmm(row.end_time)}`}
                        className="text-muted transition hover:text-danger"
                        onClick={() => remove("hours", row.id, `${dayLabel} ${hhmm(row.start_time)}–${hhmm(row.end_time)}`)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setHoursDay(day)}>
                  + Add
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ---------- exceptions ---------- */}
      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-foreground">Days off and special hours</h3>
          <Button size="sm" onClick={() => setExceptionOpen(true)}>
            Add date
          </Button>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <p className="text-sm text-muted">No days off added. Add holidays or one-off changes here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {exceptions.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{formatDate(ex.exception_date)}</p>
                    <p className="text-sm text-muted">
                      {ex.is_day_off
                        ? "Day off"
                        : `Special hours ${hhmm(ex.start_time ?? "")} – ${hhmm(ex.end_time ?? "")}`}
                      {ex.reason ? ` · ${ex.reason}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => remove("exception", ex.id, formatDate(ex.exception_date))}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <HoursModal
        open={hoursDay !== null}
        onClose={() => setHoursDay(null)}
        defaultDay={hoursDay ?? 0}
        isSaving={addHours.isPending}
        errorMessage={addHours.isError ? getApiErrorMessage(addHours.error) : undefined}
        onSubmit={(payload) =>
          addHours.mutate(payload, {
            onSuccess: () => {
              setHoursDay(null);
              setNotice({ variant: "success", message: "Hours added." });
            },
          })
        }
      />

      <ExceptionModal
        open={exceptionOpen}
        onClose={() => setExceptionOpen(false)}
        isSaving={addException.isPending}
        errorMessage={addException.isError ? getApiErrorMessage(addException.error) : undefined}
        onSubmit={(payload) =>
          addException.mutate(payload, {
            onSuccess: () => {
              setExceptionOpen(false);
              setNotice({ variant: "success", message: "Date added." });
            },
          })
        }
      />
    </div>
  );
}
