export function isRequired(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== null && value !== undefined;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[0-9\s-]{7,20}$/.test(phone.trim());
}

export function minLength(
  value: string,
  length: number
): boolean {
  return value.trim().length >= length;
}

export function maxLength(
  value: string,
  length: number
): boolean {
  return value.trim().length <= length;
}