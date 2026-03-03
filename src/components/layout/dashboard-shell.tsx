"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sun, Moon, Bell, ChevronRight, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { AppSidebar } from "./app-sidebar";
import { CoffeePattern } from "./coffee-pattern";
import { useSession } from "@/lib/auth-client";

const pageMeta: Record<
  string,
  { title: string; subtitle: string; breadcrumb?: string[] }
> = {
  "/": {
    title: "Dashboard",
    subtitle: "",
    breadcrumb: ["Dashboard"],
  },
  "/customers": {
    title: "Pelanggan",
    subtitle: "Kelola komunitas pecinta kopi Anda",
    breadcrumb: ["Pelanggan"],
  },
  "/customers/new": {
    title: "Tambah Pelanggan",
    subtitle: "Isi data pelanggan baru",
    breadcrumb: ["Pelanggan", "Tambah Baru"],
  },
  "/promo": {
    title: "Ide Promo",
    subtitle: "Rekomendasi AI berdasarkan data pelanggan anda",
    breadcrumb: ["Ide Promo"],
  },
  "/chat": {
    title: "AI Assistant",
    subtitle: "Tanya tentang pelanggan, tren minat, atau ide promo",
    breadcrumb: ["AI Chat"],
  },
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();

  const userName = session?.user?.name || "User";

  const getMeta = () => {
    if (pathname === "/") {
      return {
        ...pageMeta["/"],
        subtitle: `Welcome back, ${userName}. Here's what's brewing today.`,
      };
    }
    if (pageMeta[pathname]) return pageMeta[pathname];
    if (/^\/customers\/[^/]+$/.test(pathname)) {
      return {
        title: "Edit Pelanggan",
        subtitle: "Perbarui data pelanggan",
        breadcrumb: ["Pelanggan", "Edit"],
      };
    }
    return pageMeta["/"];
  };
  const meta = getMeta();
  const isDark = theme === "dark";

  return (
    <div className="flex min-h-screen bg-background">
      <CoffeePattern />
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="flex-1 relative z-10 overflow-auto min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border/40">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            {/* Left: hamburger + title + breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden w-9 h-9 rounded-[10px] flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer shrink-0"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-foreground/60" />
              </button>
              <div className="min-w-0">
                {/* Breadcrumb */}
                <div className="hidden sm:flex items-center gap-1.5 mb-1">
                  <span className="text-muted-foreground/50 text-[0.65rem]">
                    Kopi Kita
                  </span>
                  {meta.breadcrumb?.map((crumb, i) => (
                    <span key={crumb} className="flex items-center gap-1.5">
                      <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/30" />
                      <span
                        className={`text-[0.65rem] ${
                          i === (meta.breadcrumb?.length ?? 0) - 1
                            ? "text-foreground font-medium"
                            : "text-muted-foreground/50"
                        }`}
                      >
                        {crumb}
                      </span>
                    </span>
                  ))}
                </div>
                <h1 className="font-display text-foreground truncate text-[clamp(1.1rem,3vw,1.5rem)] font-semibold leading-tight">
                  {meta.title}
                </h1>
                <p className="text-muted-foreground text-[0.8rem] mt-0.5 hidden sm:block truncate">
                  {meta.subtitle}
                </p>
              </div>
            </div>

            {/* Right: notification, dark mode, avatar */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button className="relative w-9 h-9 rounded-[10px] flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer">
                <Bell className="w-[18px] h-[18px] text-foreground/50" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D4A574] rounded-full" />
              </button>
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="w-9 h-9 rounded-[10px] flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
                aria-label="Toggle dark mode"
              >
                {isDark ? (
                  <Sun className="w-[18px] h-[18px] text-[#D4A574]" />
                ) : (
                  <Moon className="w-[18px] h-[18px] text-foreground/50" />
                )}
              </button>
              <div className="w-px h-6 bg-border/50 mx-0.5 sm:mx-1 hidden sm:block" />
              <img
                src="/kopikita.webp"
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover cursor-pointer hidden sm:block ring-2 ring-[#D4A574]/30"
              />
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
