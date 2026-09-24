"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";

import { TOAST_EVENT, type ToastType } from "@/lib/toast";

type ToastItem = {
  id: number;
  type: ToastType;
  title: string;
  message: string;
  duration: number;
};

function getToastStyle(type: ToastType) {
  switch (type) {
    case "error":
      return {
        border: "border-red-200",
        iconBg: "bg-red-100",
        iconText: "text-red-600",
        title: "text-red-700",
        Icon: AlertCircle,
      };

    case "warning":
      return {
        border: "border-amber-200",
        iconBg: "bg-amber-100",
        iconText: "text-amber-600",
        title: "text-amber-700",
        Icon: TriangleAlert,
      };

    case "info":
      return {
        border: "border-blue-200",
        iconBg: "bg-blue-100",
        iconText: "text-blue-600",
        title: "text-blue-700",
        Icon: Info,
      };

    default:
      return {
        border: "border-emerald-200",
        iconBg: "bg-emerald-100",
        iconText: "text-emerald-600",
        title: "text-emerald-700",
        Icon: CheckCircle2,
      };
  }
}

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<{
        type?: ToastType;
        title: string;
        message?: string;
        duration?: number;
      }>;

      const detail = customEvent.detail;

      if (!detail?.title) return;

      const id = Date.now() + Math.random();

      const toast: ToastItem = {
        id,
        type: detail.type ?? "success",
        title: detail.title,
        message: detail.message ?? "",
        duration: detail.duration ?? 4500,
      };

      setToasts((current) => [...current, toast].slice(-3));

      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, toast.duration);
    }

    window.addEventListener(TOAST_EVENT, handleToast);

    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast);
    };
  }, []);

  function dismissToast(id: number) {
    setToasts((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div
      className="
        pointer-events-none fixed inset-x-0 top-3 z-[10050]
        flex flex-col items-center gap-2 px-3
        sm:left-auto sm:right-5 sm:top-5 sm:w-[430px] sm:px-0
      "
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const style = getToastStyle(toast.type);
        const Icon = style.Icon;

        return (
          <div
            key={toast.id}
            role={toast.type === "error" ? "alert" : "status"}
            className={`
              pointer-events-auto w-full
              rounded-xl border bg-white shadow-xl
              ${style.border}
              sm:rounded-2xl
            `}
          >
            <div className="flex items-start gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3.5">
              <div
                className={`
                  mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center
                  rounded-lg ${style.iconBg} ${style.iconText}
                  sm:h-9 sm:w-9 sm:rounded-xl
                `}
              >
                <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`
                    text-xs font-bold leading-4 sm:text-sm sm:leading-5
                    ${style.title}
                  `}
                >
                  {toast.title}
                </p>

                {toast.message && (
                  <p className="mt-0.5 line-clamp-3 text-[11px] leading-4 text-slate-600 sm:mt-1 sm:text-sm sm:leading-5">
                    {toast.message}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Tutup notifikasi"
                className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
