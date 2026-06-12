import Icon from "./Icon";

/** Shared top bar that shows a page title instead of the dashboard search. */
export default function PageHeader({ title }: { title: string }) {
  return (
    <header className="bg-surface/80 backdrop-blur-md sticky top-0 w-full z-40 border-b border-outline-variant flex justify-between items-center h-16 px-container-padding flex-shrink-0">
      <div className="flex items-center gap-4">
        <span className="font-h3 text-h3 text-on-surface">{title}</span>
      </div>
      <div className="flex items-center gap-4">
        <button
          aria-label="Settings"
          className="text-on-surface-variant hover:text-primary transition-colors focus:ring-1 focus:ring-primary rounded-full p-1"
        >
          <Icon name="settings" />
        </button>
        <button
          aria-label="Notifications"
          className="text-on-surface-variant hover:text-primary transition-colors focus:ring-1 focus:ring-primary rounded-full p-1 relative"
        >
          <Icon name="notifications" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-variant border border-outline-variant overflow-hidden flex items-center justify-center">
          <Icon name="person" className="text-outline" />
        </div>
      </div>
    </header>
  );
}
