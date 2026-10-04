export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  type: ToastType;
  title: string;
  message?: string;
}

export const toastMessages = {
  success: (message: string): ToastMessage => ({
    type: "success",
    title: "Success",
    message,
  }),

  error: (message: string): ToastMessage => ({
    type: "error",
    title: "Error",
    message,
  }),

  warning: (message: string): ToastMessage => ({
    type: "warning",
    title: "Warning",
    message,
  }),

  info: (message: string): ToastMessage => ({
    type: "info",
    title: "Information",
    message,
  }),
};