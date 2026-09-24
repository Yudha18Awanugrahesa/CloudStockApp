export type ToastType = "success" | "error" | "warning" | "info";

export type ToastOptions = {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
};

export const TOAST_EVENT = "cloud-stock:toast";

export function showToast(options: ToastOptions) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: {
        type: options.type ?? "success",
        title: options.title,
        message: options.message ?? "",
        duration: options.duration ?? 4500,
      },
    }),
  );
}
