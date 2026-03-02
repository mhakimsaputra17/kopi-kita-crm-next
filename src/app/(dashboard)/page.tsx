import { Sparkles, Calendar, ArrowRight, TrendingUp, Target, Zap } from "lucide-react";
import Link from "next/link";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { InterestsChart } from "@/components/dashboard/interest-chart";
import { CampaignCards } from "@/components/dashboard/campaign-cards";
import { getDashboardStats } from "@/actions/dashboard-actions";
import { getLatestCampaigns } from "@/actions/promo-actions";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function formatDate(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const [stats, batches] = await Promise.all([
    getDashboardStats(),
    getLatestCampaigns(3),
  ]);

  const campaigns = batches.flatMap((b) => b.campaigns).slice(0, 3);
  return (
    <div className="space-y-6 lg:space-y-8 max-w-[1400px] mx-auto w-full">
      {/* ═══ ZONE A: Greeting + KPI Row ═══ */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display text-foreground text-xl sm:text-2xl font-semibold leading-tight">
              {getGreeting()}, Mimi ☕
            </h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
              <p className="text-muted-foreground/60 text-sm">
                {formatDate()}
              </p>
            </div>
          </div>
          <Link
            href="/promo"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white transition-all duration-200 hover:shadow-lg hover:shadow-[#D4A574]/20 active:scale-[0.98] text-sm font-medium shrink-0 self-start sm:self-auto"
            style={{
              background: "linear-gradient(135deg, #D4A574 0%, #8B6B45 100%)",
            }}
          >
            <Sparkles className="w-4 h-4" />
            Generate Promo Baru
          </Link>
        </div>
        <KPICards
          totalCustomers={stats.totalCustomers}
          totalTags={stats.totalTags}
          activeCampaigns={stats.activeCampaigns}
        />
      </div>

      {/* ═══ ZONE B: Chart (left) + Quick Summary (right) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6">
        {/* Chart — takes 3/5 on desktop */}
        <div className="lg:col-span-3">
          <InterestsChart data={stats.topInterests} />
        </div>

        {/* Quick Summary Panel — takes 2/5 on desktop */}
        <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-5">
          {/* AI Insight Card */}
          <div className="bg-card rounded-xl border border-border/40 p-5 sm:p-6 flex-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[#D4A574]/12">
                <TrendingUp className="w-[18px] h-[18px] text-[#A67C52] dark:text-[#D4A574]" />
              </div>
              <div>
                <h3 className="font-display text-foreground text-base font-semibold leading-tight">
                  AI Insight
                </h3>
                <p className="text-muted-foreground text-xs mt-0.5">Ringkasan minggu ini</p>
              </div>
            </div>
            <div className="space-y-3">
              <InsightRow
                icon={<TrendingUp className="w-3.5 h-3.5 text-[#8B9D77]" />}
                label="Tren naik"
                value="Sweet drinks +3 pelanggan"
                accent="text-[#8B9D77]"
              />
              <InsightRow
                icon={<Target className="w-3.5 h-3.5 text-[#C27A8A]" />}
                label="Segmen aktif"
                value="Oat milk fans paling responsif"
                accent="text-[#C27A8A]"
              />
              <InsightRow
                icon={<Zap className="w-3.5 h-3.5 text-[#D4A574]" />}
                label="Peluang"
                value="15 pelanggan belum dikontak"
                accent="text-[#D4A574]"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-xl border border-border/40 p-5 sm:p-6">
            <h3 className="font-display text-foreground text-base font-semibold mb-4">
              Aksi Cepat
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/customers/new"
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/40 hover:border-[#D4A574]/30 hover:bg-[#D4A574]/4 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-[#D4A574]/10 flex items-center justify-center group-hover:bg-[#D4A574]/20 transition-colors">
                  <span className="text-lg">👤</span>
                </div>
                <span className="text-foreground/70 text-xs font-medium text-center">
                  Tambah Pelanggan
                </span>
              </Link>
              <Link
                href="/promo"
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/40 hover:border-[#8B9D77]/30 hover:bg-[#8B9D77]/4 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-[#8B9D77]/10 flex items-center justify-center group-hover:bg-[#8B9D77]/20 transition-colors">
                  <span className="text-lg">✨</span>
                </div>
                <span className="text-foreground/70 text-xs font-medium text-center">
                  Ide Promo AI
                </span>
              </Link>
              <Link
                href="/chat"
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/40 hover:border-[#C27A8A]/30 hover:bg-[#C27A8A]/4 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-[#C27A8A]/10 flex items-center justify-center group-hover:bg-[#C27A8A]/20 transition-colors">
                  <span className="text-lg">💬</span>
                </div>
                <span className="text-foreground/70 text-xs font-medium text-center">
                  Chat AI
                </span>
              </Link>
              <Link
                href="/customers"
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/40 hover:border-[#A67C52]/30 hover:bg-[#A67C52]/4 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-[#A67C52]/10 flex items-center justify-center group-hover:bg-[#A67C52]/20 transition-colors">
                  <span className="text-lg">📋</span>
                </div>
                <span className="text-foreground/70 text-xs font-medium text-center">
                  Daftar Pelanggan
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ZONE C: Campaigns Full-Width ═══ */}
      <CampaignCards campaigns={campaigns} />
    </div>
  );
}

function InsightRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 dark:bg-secondary/15 border border-border/20">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold uppercase tracking-wide ${accent}`}>
          {label}
        </p>
        <p className="text-foreground/75 text-sm mt-0.5 leading-snug">{value}</p>
      </div>
    </div>
  );
}
