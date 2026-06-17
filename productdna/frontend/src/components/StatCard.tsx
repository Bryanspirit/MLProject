import React from "react";
import Icon from "./Icon";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  hint?: string;
  href?: string;
  special?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, hint, href, special = false }) => {
  const interactive = Boolean(href);
  const body = (
    <>
      <div className="flex items-center justify-between">
        <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
          {title}
        </h3>
        {icon && (
          <span
            className={`w-8 h-8 rounded-lg grid place-items-center ${
              special ? "bg-tertiary-container/30 text-tertiary" : "bg-surface-variant text-on-surface-variant"
            }`}
          >
            <Icon name={icon} size={18} />
          </span>
        )}
      </div>
      <div className="flex items-end gap-2 mt-2">
        <span className={`font-h1 text-h1 ${special ? "text-tertiary" : "text-on-surface"}`}>
          {value}
        </span>
      </div>
      {hint && (
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-1">
          {hint}
          {interactive && <Icon name="chevron_right" size={14} />}
        </p>
      )}
    </>
  );

  const base = `bg-surface-container-lowest border border-outline-variant rounded-lg p-5 flex flex-col ${
    special ? "border-l-4 border-l-tertiary" : ""
  }`;

  if (interactive) {
    return (
      <a href={href} className={`${base} hover:bg-surface-container-low hover:border-primary/40 transition-colors`}>
        {body}
      </a>
    );
  }
  return <div className={base}>{body}</div>;
};

export default StatCard;
