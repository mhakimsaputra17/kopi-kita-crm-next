"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  Coffee,
  Users,
  Smartphone,
  ArrowRight,
} from "lucide-react";

interface CampaignData {
  id: string;
  theme: string;
  segment: string;
  customerCount: number;
  message: string;
}

const CAMPAIGN_STYLES = [
  { gradientFrom: "#D4A574", gradientTo: "#A67C52", accentColor: "#A67C52", accentBg: "rgba(212, 165, 116, 0.1)", badgeColor: "bg-[#D4A574]/12 text-[#A67C52] dark:text-[#D4A574]" },
  { gradientFrom: "#3C2415", gradientTo: "#5C3D2E", accentColor: "#3C2415", accentBg: "rgba(60, 36, 21, 0.06)", badgeColor: "bg-[#3C2415]/8 text-[#3C2415] dark:bg-[#D4A574]/10 dark:text-[#D4A574]" },
  { gradientFrom: "#8B9D77", gradientTo: "#6B7D57", accentColor: "#6B7D57", accentBg: "rgba(139, 157, 119, 0.08)", badgeColor: "bg-[#8B9D77]/12 text-[#5E7248] dark:text-[#8B9D77]" },
];

export function CampaignCards({ campaigns }: { campaigns: CampaignData[] }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (message: string, index: number) => {
    navigator.clipboard.writeText(message).catch(() => {});
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (campaigns.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-foreground text-lg sm:text-xl font-semibold">
              Kampanye Minggu Ini
            </h3>
            <p className="text-muted-foreground text-sm mt-0.5">
              Pesan siap kirim untuk segmen pelanggan
            </p>
          </div>
          <Link
            href="/promo"
            className="flex items-center gap-1.5 text-[#D4A574] hover:text-[#A67C52] transition-colors text-sm font-medium"
          >
            Generate Promo
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="bg-card rounded-xl border border-border/40 p-8 text-center">
          <Coffee className="w-8 h-8 text-[#D4A574]/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Belum ada kampanye minggu ini.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Generate promo baru untuk memulai!</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-foreground text-lg sm:text-xl font-semibold">
            Kampanye Minggu Ini
          </h3>
          <p className="text-muted-foreground text-sm mt-0.5">
            Pesan siap kirim untuk segmen pelanggan
          </p>
        </div>
        <Link
          href="/promo"
          className="flex items-center gap-1.5 text-[#D4A574] hover:text-[#A67C52] transition-colors text-sm font-medium"
        >
          Lihat Semua
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {campaigns.map((campaign, index) => {
          const style = CAMPAIGN_STYLES[index % CAMPAIGN_STYLES.length];
          return (
            <div
              key={campaign.id}
              className="bg-card rounded-xl border border-border/40 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col"
            >
              <div
                className="h-1.5"
                style={{
                  background: `linear-gradient(90deg, ${style.gradientFrom}, ${style.gradientTo})`,
                }}
              />
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{ backgroundColor: style.accentBg }}
                    >
                      <Coffee
                        className="w-[16px] h-[16px]"
                        style={{ color: style.accentColor }}
                      />
                    </div>
                    <div>
                      <h4 className="font-display text-foreground text-base font-semibold leading-tight">
                        {campaign.theme}
                      </h4>
                      <p className="text-muted-foreground/60 text-xs mt-0.5">
                        {campaign.segment}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`${style.badgeColor} px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 text-xs font-semibold`}
                  >
                    <Users className="w-2.5 h-2.5" />
                    {campaign.customerCount}
                  </span>
                </div>

                <div className="flex-1 p-3.5 sm:p-4 rounded-[10px] bg-[#FFF8F0]/50 dark:bg-[#2E231C]/40 border border-border/20 mb-4">
                  <p className="text-foreground/80 text-sm leading-relaxed">
                    {campaign.message}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(campaign.message, index)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] border transition-all duration-200 cursor-pointer text-[0.75rem] font-medium ${
                      copiedIndex === index
                        ? "bg-[#8B9D77]/8 border-[#8B9D77]/25 text-[#8B9D77]"
                        : "border-border/50 text-foreground/60 hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {copiedIndex === index ? (
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
                  <button
                    className="w-10 h-10 rounded-[10px] border border-border/50 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/6 transition-colors cursor-pointer shrink-0"
                    title="Share via WhatsApp"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
