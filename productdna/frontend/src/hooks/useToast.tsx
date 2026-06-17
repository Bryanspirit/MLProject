import React, { createContext, useCallback, useContext, useState } from "react";
import Icon from "../components/Icon";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastApi {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** App-wide toast notifications. Throws if used outside <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const VARIANTS: Record<ToastVariant, { icon: string; cls: string }> = {
  success: { icon: "check_circle", cls: "border-tertiary/40 text-tertiary" },
  error: { icon: "error", cls: "border-error/40 text-error" },
  info: { icon: "info", cls: "border-primary/40 text-primary" },
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const v = VARIANTS[toast.variant];
  return (
    <div
      role="status"
      className={`flex items-start gap-2 bg-surface-container-high border ${v.cls} rounded-lg shadow-lg px-4 py-3 animate-[fadeIn_0.15s_ease-out]`}
    >
      <Icon name={v.icon} size={18} className={v.cls} />
      <p className="font-body-sm text-body-sm text-on-surface flex-1">{toast.message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextId++;
      setToasts((t) => [...t, { id, variant, message }]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  const api: ToastApi = {
    toast,
    success: (m) => toast(m, "success"),
    error: (m) => toast(m, "error"),
    info: (m) => toast(m, "info"),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onClose={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
