interface IconProps {
  name: string;
  className?: string;
  size?: number;
  /** Render the filled variant of the symbol. */
  fill?: boolean;
}

/** Thin wrapper around Google Material Symbols (font loaded in index.html). */
export default function Icon({ name, className = "", size = 20, fill = false }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size, ...(fill ? { fontVariationSettings: "'FILL' 1" } : {}) }}
    >
      {name}
    </span>
  );
}
