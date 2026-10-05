export function cleanFilters<T extends Record<string, unknown>>(
  filters: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0)
    )
  ) as Partial<T>;
}

export function buildQueryString(
  params: Record<string, unknown>
): string {
  const cleaned = cleanFilters(params);
  const searchParams = new URLSearchParams();

  Object.entries(cleaned).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
    } else {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
}

export function clearFilters<T extends Record<string, unknown>>(
  filters: T
): Partial<T> {
  return Object.fromEntries(
    Object.keys(filters).map((key) => [key, undefined])
  ) as Partial<T>;
}