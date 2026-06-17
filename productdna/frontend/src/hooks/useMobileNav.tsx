import React, { createContext, useContext, useEffect, useState } from "react";

interface MobileNavApi {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const MobileNavContext = createContext<MobileNavApi | null>(null);

/** Shared open/close state for the mobile navigation drawer, so the header's
 *  hamburger (rendered per page) and the drawer (in SideNavBar) stay in sync
 *  without every page having to wire it up. */
export function useMobileNav(): MobileNavApi {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error("useMobileNav must be used within a MobileNavProvider");
  return ctx;
}

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // Close the drawer on hash navigation (the user picked a destination).
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>
  );
}
