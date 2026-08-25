"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  Eye,
  LineChart,
  Inbox,
  Settings,
} from "lucide-react";

interface MobileBottomNavProps {
  pendingCount?: number;
}

export function MobileBottomNav({ pendingCount = 0 }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      href: "/ledger",
      label: "Ledger",
      icon: CreditCard,
      active: pathname === "/ledger",
    },
    {
      href: "/watchlist",
      label: "Watchlist",
      icon: Eye,
      active: pathname === "/watchlist",
    },
    {
      href: "/analytics",
      label: "Analytics",
      icon: LineChart,
      active: pathname === "/analytics",
    },
    {
      href: "/staged-transactions",
      label: "Staged",
      icon: Inbox,
      active: pathname === "/staged-transactions",
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      active: pathname === "/settings",
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 pb-[env(safe-area-inset-bottom,0.5rem)] pt-1.5 px-2 shadow-2xl transition-all"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
                item.active
                  ? "text-blue-400 font-bold"
                  : "text-slate-400 hover:text-slate-200 font-medium"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${item.active ? "text-blue-400" : "text-slate-400"}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">
                {item.label}
              </span>
              {item.active && (
                <span className="absolute bottom-0 w-4 h-0.5 rounded-full bg-blue-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
