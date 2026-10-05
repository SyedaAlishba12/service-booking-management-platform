import Badge from "./Badge";

export type Status =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "expired"
  | "no_show"
  | "paid"
  | "failed"
  | "refunded"
  | "partial"
  | "active"
  | "inactive"
  | "approved"
  | "rejected";

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

const statusConfig: Record<
  Status,
  {
    label: string;
    variant:
      | "default"
      | "success"
      | "warning"
      | "danger"
      | "info"
      | "plum";
  }
> = {
  pending: {
    label: "Pending",
    variant: "warning",
  },
  confirmed: {
    label: "Confirmed",
    variant: "success",
  },
  completed: {
    label: "Completed",
    variant: "success",
  },
  cancelled: {
    label: "Cancelled",
    variant: "danger",
  },
  expired: {
    label: "Expired",
    variant: "danger",
  },
  no_show: {
    label: "No Show",
    variant: "danger",
  },
  paid: {
    label: "Paid",
    variant: "success",
  },
  failed: {
    label: "Failed",
    variant: "danger",
  },
  refunded: {
    label: "Refunded",
    variant: "plum",
  },
  partial: {
    label: "Partially Paid",
    variant: "warning",
  },
  active: {
    label: "Active",
    variant: "success",
  },
  inactive: {
    label: "Inactive",
    variant: "default",
  },
  approved: {
    label: "Approved",
    variant: "success",
  },
  rejected: {
    label: "Rejected",
    variant: "danger",
  },
};

export default function StatusBadge({
  status,
  label,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant}>
      {label ?? config.label}
    </Badge>
  );
}