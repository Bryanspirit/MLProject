import Icon from "./Icon";

interface StateMessageProps {
  variant: "loading" | "error" | "empty";
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const presets = {
  loading: { icon: "progress_activity", spin: true, title: "Loading…" },
  error: { icon: "error", spin: false, title: "Something went wrong" },
  empty: { icon: "inbox", spin: false, title: "Nothing here yet" },
} as const;

/** Consistent loading / error / empty placeholder for data-backed views. */
export default function StateMessage({
  variant,
  title,
  message,
  onRetry,
  className = "",
}: StateMessageProps) {
  const preset = presets[variant];
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-2 py-12 px-6 ${className}`}
    >
      <Icon
        name={preset.icon}
        size={28}
        className={`${variant === "error" ? "text-error" : "text-on-surface-variant"} ${
          preset.spin ? "animate-spin" : ""
        }`}
      />
      <p className="font-body-base text-body-base text-on-surface">{title ?? preset.title}</p>
      {message && (
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{message}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 border border-outline-variant text-on-surface font-body-sm px-4 py-1.5 rounded hover:bg-surface-container transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
