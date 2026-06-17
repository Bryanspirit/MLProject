import type { ConfidenceLevel } from "../api/client";

/** Derive a level from a 0-100 score, matching the backend thresholds. */
export function levelFromScore(score: number): ConfidenceLevel {
  if (score >= 85) return "high";
  if (score >= 60) return "medium";
  if (score > 0) return "low";
  return "missing";
}

const STYLES: Record<ConfidenceLevel, { label: string; cls: string }> = {
  high: { label: "High", cls: "text-tertiary bg-tertiary-container/20 border-tertiary/30" },
  medium: { label: "Medium", cls: "text-primary bg-primary-container/20 border-primary/30" },
  low: { label: "Low", cls: "text-error bg-error-container/30 border-error/30" },
  missing: {
    label: "Missing",
    cls: "text-on-surface-variant bg-surface-variant border-outline-variant",
  },
};

interface ConfidenceBadgeProps {
  /** Pass an explicit level, or a numeric score to have it derived. */
  level?: ConfidenceLevel;
  confidence?: number;
  /** Show the numeric percentage alongside the label. */
  showValue?: boolean;
  className?: string;
}

/** Compact pill conveying extraction confidence with a consistent color scale. */
export default function ConfidenceBadge({
  level,
  confidence,
  showValue = false,
  className = "",
}: ConfidenceBadgeProps) {
  const resolved = level ?? levelFromScore(confidence ?? 0);
  const { label, cls } = STYLES[resolved];
  return (
    <span
      className={`inline-flex items-center gap-1 font-label-caps text-label-caps px-2 py-0.5 rounded border whitespace-nowrap ${cls} ${className}`}
      title={confidence !== undefined ? `${Math.round(confidence)}% confidence` : label}
    >
      {label}
      {showValue && confidence !== undefined && (
        <span className="opacity-70">{Math.round(confidence)}%</span>
      )}
    </span>
  );
}
