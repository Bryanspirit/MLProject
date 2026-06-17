"use client";

import {
  LayoutDashboard,
  Upload,
  Box,
  ClipboardCheck,
  Copy,
  MessageSquare,
  Settings,
  HelpCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMobileNav } from "../hooks/useMobileNav";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "#/" },
  { icon: Upload, label: "Upload", href: "#/upload" },
  { icon: ClipboardCheck, label: "Review", href: "#/review" },
  { icon: Box, label: "Products", href: "#/products" },
  { icon: Copy, label: "Duplicates", href: "#/duplicates" },
  { icon: MessageSquare, label: "Ask", href: "#/ask" },
];

const bottomItems = [
  { icon: Settings, label: "Settings", href: "#/settings" },
  { icon: HelpCircle, label: "Help", href: "#/help" },
];

interface SideNavBarProps {
  /** Label of the nav item to render as active. */
  active?: string;
}

function NavLink({
  icon: Icon,
  label,
  href,
  active,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-body-base text-body-base font-medium transition-colors ${
        active
          ? "bg-primary-fixed text-primary"
          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
      }`}
    >
      <Icon size={18} strokeWidth={2} />
      {label}
    </a>
  );
}

function NavContent({ active }: { active: string }) {
  return (
    <>
      <div>
        {/* Logo */}
        <div className="mb-8 px-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-on-primary font-bold">
            P
          </div>
          <div>
            <span className="font-h2 text-h2 text-primary">ProductDNA</span>
            <p className="font-label-caps text-label-caps text-on-surface-variant">
              Master Data Steward
            </p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.label} {...item} active={item.label === active} />
          ))}
        </nav>
      </div>

      <nav className="space-y-1">
        {bottomItems.map((item) => (
          <NavLink key={item.label} {...item} active={item.label === active} />
        ))}
      </nav>
    </>
  );
}

export default function SideNavBar({ active = "Dashboard" }: SideNavBarProps) {
  const { open, setOpen } = useMobileNav();

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-60 flex-col justify-between bg-surface-container-lowest border-r border-outline-variant py-container-padding px-4">
        <NavContent active={active} />
      </aside>

      {/* Mobile: slide-in drawer + scrim */}
      <div
        className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
        <aside
          className={`absolute inset-y-0 left-0 w-64 flex flex-col justify-between bg-surface-container-lowest border-r border-outline-variant py-container-padding px-4 shadow-xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface"
          >
            <X size={20} />
          </button>
          <NavContent active={active} />
        </aside>
      </div>
    </>
  );
}
