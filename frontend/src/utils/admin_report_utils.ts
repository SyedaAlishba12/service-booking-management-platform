export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
}

export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return num.toString();
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30); // Last 30 days ending today
  return {
    from: toIsoDate(from),
    to: toIsoDate(to),
  };
}

export function validateRange(from: string, to: string): string | null {
  if (!from || !to) return null; // If not provided, it's valid (will just omit or fail on backend)
  
  const fromDate = new Date(from);
  const toDate = new Date(to);
  
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return "Invalid date format.";
  }
  
  if (fromDate > toDate) {
    return "date_from must be before or equal to date_to";
  }
  
  const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  if (diffDays > 366) {
    return "date range cannot exceed 366 days";
  }
  
  return null;
}
