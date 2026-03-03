"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Customers", path: "/customers" },
  { icon: Sparkles, label: "Promo Ideas", path: "/promo", badge: "AI" },
  { icon: MessageCircle, label: "AI Chat", path: "/chat", badge: "AI" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const userName = session?.user?.name || "User";

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  useEffect(() => {
    onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const sidebarContent = (isCollapsed: boolean) => (
    <>
      {/* Logo */}
      <Link
        href="/"
        className={`flex items-center gap-3 transition-all duration-300 ${
          isCollapsed ? "justify-center px-0 pt-7 pb-5" : "px-6 pt-7 pb-5"
        }`}
      >
        <img
          src="/kopikita.webp"
          alt="Kopi Kita"
          className="w-9 h-9 rounded-[10px] object-cover shrink-0"
        />
        {!isCollapsed && (
          <span className="font-display text-[1.3rem] font-semibold text-sidebar-foreground tracking-tight whitespace-nowrap overflow-hidden">
            Kopi Kita
          </span>
        )}
      </Link>

      {/* Section label */}
      {!isCollapsed && (
        <p className="px-6 pb-2 pt-3 text-[#D4A574]/60 uppercase tracking-widest text-[0.6rem] font-semibold">
          Menu
        </p>
      )}
      {isCollapsed && <div className="pt-2" />}

      {/* Navigation */}
      <nav className={`flex-1 space-y-0.5 ${isCollapsed ? "px-2" : "px-3"}`}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`relative w-full flex items-center gap-3 rounded-[10px] transition-all duration-200 group ${
                isCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
              } ${
                active
                  ? "bg-[#D4A574]/10 text-[#D4A574]"
                  : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
              style={{ fontSize: "0.85rem", fontWeight: active ? 500 : 400 }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#D4A574]" />
              )}
              <item.icon
                className={`w-[18px] h-[18px] shrink-0 ${
                  active
                    ? "text-[#D4A574]"
                    : "text-sidebar-foreground/35 group-hover:text-sidebar-foreground/65"
                }`}
              />
              {!isCollapsed && (
                <>
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-md bg-[#D4A574]/12 text-[#D4A574] text-[0.55rem] font-bold tracking-wide">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isCollapsed && (
                <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-sidebar-foreground text-sidebar text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 hidden lg:block shadow-md">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div
        className={`${isCollapsed ? "mx-3" : "mx-5"} border-t border-sidebar-border`}
      />

      {/* User section */}
      <div className={`py-4 ${isCollapsed ? "px-2" : "px-4"}`}>
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "gap-3 px-2"
          }`}
        >
          <img
            src="/kopikita.webp"
            alt={userName}
            className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-[#D4A574]/30"
          />
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sidebar-foreground text-[0.8rem] font-medium truncate">
                  {userName}
                </p>
                <p className="text-sidebar-foreground/40 text-[0.65rem] truncate">
                  Admin
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sidebar-foreground/30 hover:text-[#D4183D] hover:bg-[#D4183D]/6 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="relative hidden lg:flex flex-col shrink-0 bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out"
        style={{
          width: collapsed ? 72 : 260,
          boxShadow: "2px 0 12px rgba(60, 36, 21, 0.04)",
        }}
      >
        {sidebarContent(collapsed)}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-foreground/35 hover:text-sidebar-foreground/70 hover:bg-secondary transition-colors cursor-pointer z-30 shadow-sm"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-[280px] bg-sidebar border-r border-sidebar-border flex flex-col"
            style={{ boxShadow: "4px 0 24px rgba(60, 36, 21, 0.12)" }}
          >
            <button
              onClick={onMobileClose}
              className="absolute top-5 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-secondary transition-colors cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}
