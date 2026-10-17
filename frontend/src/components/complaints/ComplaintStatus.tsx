/**
 * Reusable complaint status badge. Pass a complaint status and optional className.
 */

import Badge from "@/components/ui/Badge";
import type { ComplaintStatus as ComplaintStatusValue } from "@/types/complaint";

export interface ComplaintStatusProps {
  status: ComplaintStatusValue;
  className?: string;
}

function getVariant(status: ComplaintStatusValue) {
  switch (status) {
    case "OPEN":
      return "danger";
    case "IN_REVIEW":
      return "warning";
    case "RESOLVED":
      return "success";
    default:
      return "default";
  }
}

export default function ComplaintStatus({ status, className }: ComplaintStatusProps) {
  return (
    <Badge variant={getVariant(status)} className={className}>
      {status.replace("_", " ")}
    </Badge>
  );
}
