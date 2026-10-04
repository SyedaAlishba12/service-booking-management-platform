import type { Status } from "@/components/ui/StatusBadge";

export interface DashboardAppointment {
  day: string;
  month: string;
  dateLabel?: string;
  time: string;
  service: string;
  provider: string;
  status: Status;
  price: string;
  paymentStatus?: string;
}

export interface DashboardStat {
  label: string;
  value: string;
  detail: string;
  trend?: "up" | "neutral" | "down";
}

export interface DashboardActivity {
  title: string;
  description: string;
  time: string;
  type: string;
}

export interface QuickAction {
  label: string;
  description: string;
  href: string;
  primary?: boolean;
}