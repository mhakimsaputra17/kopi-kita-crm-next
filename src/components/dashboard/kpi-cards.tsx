"use client";

import { Users, Tag, Megaphone, Send, ArrowUpRight } from "lucide-react";

interface KPICardsProps {
  totalCustomers: number;
  totalTags: number;
  activeCampaigns: number;
}

export function KPICards({ totalCustomers, totalTags, activeCampaigns }: KPICardsProps) {
  const kpis = [
    {
      label: "Total Pelanggan",
      value: String(totalCustomers),
      icon: Users,
      tint: "bg-[#D4A574]/8",
      iconBg: "bg-[#D4A574]/15",
      iconColor: "text-[#A67C52] dark:text-[#D4A574]",
    },
    {
      label: "Interest Tags",
      value: String(totalTags),
      icon: Tag,
      tint: "bg-[#8B9D77]/8",
      iconBg: "bg-[#8B9D77]/15",
      iconColor: "text-[#6B7D57] dark:text-[#8B9D77]",
    },
    {
      label: "Kampanye Aktif",
      value: String(activeCampaigns),
      icon: Megaphone,
      tint: "bg-[#C27A8A]/8",
      iconBg: "bg-[#C27A8A]/15",
      iconColor: "text-[#C27A8A] dark:text-[#C27A8A]",
    },
    {
      label: "Pesan Terkirim",
      value: "—",
      icon: Send,
      tint: "bg-[#6B9AC4]/8",
      iconBg: "bg-[#6B9AC4]/15",
      iconColor: "text-[#6B9AC4] dark:text-[#6B9AC4]",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-card rounded-xl border border-border/40 p-5 sm:p-6 hover:shadow-md transition-all duration-200 group"
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-10 h-10 ${kpi.iconBg} rounded-[10px] flex items-center justify-center`}
            >
              <kpi.icon className={`w-[18px] h-[18px] ${kpi.iconColor}`} />
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md ${kpi.tint}`}
            >
              <ArrowUpRight className="w-3 h-3 text-[#8B9D77]" />
            </div>
          </div>
          <p className="text-foreground/50 text-sm mb-1">{kpi.label}</p>
          <p className="font-display text-foreground text-3xl sm:text-[2rem] font-semibold leading-none">
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  );
}
