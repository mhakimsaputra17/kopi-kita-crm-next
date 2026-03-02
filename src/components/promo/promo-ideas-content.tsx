"use client";

import { useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Users,
  MessageSquare,
  Send,
  TrendingUp,
  Loader2,
  Instagram,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ───
interface PromoIdea {
  id: number;
  title: string;
  emoji: string;
  customersTargeted: number;
  segment: string;
  whyNow: string;
  message: string;
  timeWindow: string;
  timeEmoji: string;
  gradientFrom: string;
  gradientTo: string;
  accentBg: string;
  badgeBg: string;
  badgeText: string;
}

// ─── Mock Data ───
const promoIdeas: PromoIdea[] = [
  {
    id: 1,
    title: "Caramel Week",
    emoji: "🍫",
    customersTargeted: 42,
    segment: "Pelanggan dengan tag 'sweet drinks' atau 'caramel'",
    whyNow: "Minat sweet drinks adalah grup terbesar bulan ini",
    message:
      "Hi! New Caramel Cold Brew is in this week—get 10% off till Sunday. Mau coba besok pagi? ☕",
    timeWindow: "Morning rush (7–10 AM)",
    timeEmoji: "🕐",
    gradientFrom: "#D4A574",
    gradientTo: "#C4956A",
    accentBg: "rgba(212,165,116,0.1)",
    badgeBg: "bg-[#D4A574]/12",
    badgeText: "text-[#A67C52] dark:text-[#D4A574]",
  },
  {
    id: 2,
    title: "Pastry + Coffee Bundle",
    emoji: "🥐",
    customersTargeted: 18,
    segment: "Pastry lovers + morning coffee buyers",
    whyNow: "Minat pastry meningkat di hari kerja",
    message:
      "Coba latte + croissant bundle, hemat 10k. Berlaku 7–11 pagi. Mau saya simpanin? 🥐",
    timeWindow: "Weekday mornings",
    timeEmoji: "🕐",
    gradientFrom: "#C27A8A",
    gradientTo: "#A8606E",
    accentBg: "rgba(194,122,138,0.1)",
    badgeBg: "bg-[#C27A8A]/12",
    badgeText: "text-[#A0524D] dark:text-[#D4908A]",
  },
  {
    id: 3,
    title: "Oat Milk Monday",
    emoji: "🥛",
    customersTargeted: 15,
    segment: "Oat milk & healthy drinks enthusiasts",
    whyNow: "Tren healthy drinks meningkat stabil minggu ini",
    message:
      "Happy Monday! Semua menu oat milk diskon 15% hari ini aja. Udah coba Oat Latte kita? 🌿",
    timeWindow: "Senin sepanjang hari",
    timeEmoji: "🕐",
    gradientFrom: "#8B9D77",
    gradientTo: "#6B7D57",
    accentBg: "rgba(139,157,119,0.1)",
    badgeBg: "bg-[#8B9D77]/12",
    badgeText: "text-[#5E7248] dark:text-[#8B9D77]",
  },
];

const insightPills = [
  { label: "23 suka sweet drinks", dotColor: "#D4A574" },
  { label: "18 oat milk fans", dotColor: "#8B9D77" },
  { label: "15 pastry lovers", dotColor: "#C27A8A" },
];

// ─── WhatsApp SVG Icon ───
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

// ─── Featured Card (Left Panel) ───
function FeaturedCard({ idea }: { idea: PromoIdea }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const waLink = `https://wa.me/?text=${encodeURIComponent(idea.message)}`;

  return (
    <div className="bg-card rounded-xl border border-border/40 overflow-hidden flex flex-col h-full">
      <div
        className="h-1.5"
        style={{
          background: `linear-gradient(90deg, ${idea.gradientFrom}, ${idea.gradientTo})`,
        }}
      />

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: idea.accentBg }}
            >
              <span className="text-xl">{idea.emoji}</span>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground leading-tight">
                {idea.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {idea.segment}
              </p>
            </div>
          </div>
          <span
            className={`${idea.badgeBg} ${idea.badgeText} px-3 py-1.5 rounded-full shrink-0 flex items-center gap-1.5 text-xs font-semibold`}
          >
            <Users className="w-3.5 h-3.5" />
            {idea.customersTargeted} pelanggan
          </span>
        </div>

        {/* Why Now */}
        <div className="mb-5 p-4 rounded-xl bg-secondary/40 dark:bg-secondary/25 border border-border/20">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#8B9D77]" />
            <span className="text-[#8B9D77] text-[0.68rem] font-semibold uppercase tracking-wider">
              Kenapa Sekarang
            </span>
          </div>
          <p className="text-sm text-foreground/75 italic leading-relaxed">
            {idea.whyNow}
          </p>
        </div>

        {/* Message Preview */}
        <div className="mb-5 flex-1">
          <div className="flex items-center gap-1.5 mb-2.5">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Pesan Siap Kirim
            </span>
          </div>
          <div className="relative p-5 rounded-xl bg-[#FFF8F0]/50 dark:bg-[#2E231C]/50 border border-[#D4A574]/10 dark:border-[#D4A574]/5">
            <div
              className="absolute top-2 left-3.5 text-[#D4A574]/15 select-none font-display text-3xl leading-none"
            >
              &ldquo;
            </div>
            <p className="text-sm text-foreground/85 pl-4 pr-4 leading-[1.75]">
              {idea.message}
            </p>
          </div>
        </div>

        {/* Time Window + Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-border/25">
          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary/40 dark:bg-secondary/25 border border-border/20 text-sm font-medium">
            <span>{idea.timeEmoji}</span>
            <span className="text-foreground/70">{idea.timeWindow}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(idea.message, `msg-${idea.id}`)}
              className={`h-9 px-4 rounded-lg flex items-center gap-2 border text-sm font-medium transition-colors cursor-pointer ${
                copiedField === `msg-${idea.id}`
                  ? "border-[#8B9D77]/30 bg-[#8B9D77]/6 text-[#8B9D77]"
                  : "border-border/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {copiedField === `msg-${idea.id}` ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Tersalin!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Pesan
                </>
              )}
            </button>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/8 transition-colors"
              aria-label="Kirim via WhatsApp"
            >
              <WhatsAppIcon className="w-4 h-4" />
            </a>

            <button
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-[#3B82F6]/20 text-[#3B82F6] hover:bg-[#3B82F6]/8 transition-colors cursor-pointer"
              aria-label="Kirim via SMS"
            >
              <Send className="w-3.5 h-3.5" />
            </button>

            <button
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-[#E1306C]/20 text-[#E1306C] hover:bg-[#E1306C]/8 transition-colors cursor-pointer"
              aria-label="Kirim via Instagram DM"
            >
              <Instagram className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Loading State (Skeleton) ───
function LoadingState() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
      {/* Left: Featured Card Skeleton */}
      <div className="lg:col-span-3">
        <div className="bg-card rounded-xl border border-border/40 overflow-hidden">
          <Skeleton className="h-1.5 w-full rounded-none" />
          <div className="p-5 sm:p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3.5 w-52" />
                </div>
              </div>
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            {/* Why Now */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border/20 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-full" />
            </div>
            {/* Message */}
            <div className="space-y-2.5">
              <Skeleton className="h-3 w-24" />
              <div className="p-5 rounded-xl bg-secondary/20 border border-border/10 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border/25">
              <Skeleton className="h-9 w-40 rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Sidebar Skeleton */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Campaign list */}
        <div className="bg-card rounded-xl border border-border/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <Skeleton className="h-3 w-28" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-border/20 last:border-b-0">
              <Skeleton className="w-1 h-8 rounded-full" />
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-6 w-8 rounded-full" />
            </div>
          ))}
        </div>
        {/* Quick Stats */}
        <div className="bg-card rounded-xl border border-border/40 p-4 space-y-3">
          <Skeleton className="h-3 w-20" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>
        {/* Data Insight */}
        <div className="bg-card rounded-xl border border-border/40 p-4 space-y-3">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="h-3.5 w-36" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───
export function PromoIdeasContent() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState("2 menit lalu");
  const [showCards, setShowCards] = useState(true);
  const [activeId, setActiveId] = useState(promoIdeas[0].id);

  const handleGenerate = () => {
    setIsGenerating(true);
    setShowCards(false);
    setTimeout(() => {
      setShowCards(true);
      setIsGenerating(false);
      setGeneratedAt("baru saja");
      setActiveId(promoIdeas[0].id);
    }, 2500);
  };

  const activeIdea = promoIdeas.find((p) => p.id === activeId) ?? promoIdeas[0];
  const totalReach = promoIdeas.reduce((sum, p) => sum + p.customersTargeted, 0);

  return (
    <div className="py-1 sm:py-2 max-w-[1400px] mx-auto w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shrink-0 hover:shadow-lg hover:shadow-[#D4A574]/20"
            style={{
              background: "linear-gradient(135deg, #D4A574 0%, #A67C52 100%)",
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 motion-safe:animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Promo Baru
              </>
            )}
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
            <span>
              Terakhir:{" "}
              <span className="text-foreground/70 font-medium">{generatedAt}</span>
            </span>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 font-medium"
          aria-label="Regenerate promo ideas"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isGenerating ? "motion-safe:animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Regenerate</span>
        </button>
      </div>

      {/* Master-Detail Layout */}
      {showCards ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
          {/* Left: Featured Card (60%) */}
          <div className="lg:col-span-3">
            <FeaturedCard idea={activeIdea} />
          </div>

          {/* Right: Sidebar (40%) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Campaign List */}
            <div className="bg-card rounded-xl border border-border/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Semua Kampanye
                </span>
              </div>
              <div className="divide-y divide-border/20">
                {promoIdeas.map((idea) => {
                  const isActive = idea.id === activeId;
                  return (
                    <button
                      key={idea.id}
                      onClick={() => setActiveId(idea.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#D4A574]/[0.06] dark:bg-[#D4A574]/[0.04]"
                          : "hover:bg-secondary/50"
                      }`}
                    >
                      {/* Active indicator */}
                      <div
                        className={`w-1 h-8 rounded-full shrink-0 transition-colors ${
                          isActive ? "" : "bg-transparent"
                        }`}
                        style={isActive ? { background: `linear-gradient(180deg, ${idea.gradientFrom}, ${idea.gradientTo})` } : {}}
                      />
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: idea.accentBg }}
                      >
                        <span className="text-base">{idea.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? "text-foreground" : "text-foreground/70"}`}>
                          {idea.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {idea.segment}
                        </p>
                      </div>
                      <span
                        className={`${idea.badgeBg} ${idea.badgeText} px-2 py-1 rounded-full text-[0.65rem] font-semibold shrink-0 tabular-nums`}
                      >
                        {idea.customersTargeted}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-card rounded-xl border border-border/40 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Quick Stats
              </span>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#D4A574]" />
                    <span className="text-sm text-muted-foreground">Total jangkauan</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums">{totalReach} pelanggan</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#8B9D77]" />
                    <span className="text-sm text-muted-foreground">Kampanye siap</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums">{promoIdeas.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#3C2415] dark:bg-[#C4956A]" />
                    <span className="text-sm text-muted-foreground">Est. response rate</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">~24%</span>
                </div>
              </div>
            </div>

            {/* Data Insight */}
            <div className="bg-card rounded-xl border border-border/40 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Data Insight
              </span>
              <div className="mt-3 space-y-2.5">
                {insightPills.map((pill, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: pill.dotColor }}
                    />
                    <span className="text-sm text-foreground/70">{pill.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <LoadingState />
      )}
    </div>
  );
}
