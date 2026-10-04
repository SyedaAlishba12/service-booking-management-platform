export const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

export function isValidFileSize(
  file: File,
  maxSize = DEFAULT_MAX_FILE_SIZE
): boolean {
  return file.size <= maxSize;
}

export function isValidFileType(
  file: File,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(file.type);
}

export function getFileExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const units = ["Bytes", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}