"use client";

import { Coffee, Plus } from "lucide-react";

export function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="relative mb-6">
        {/* Steam wisps */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-2.5">
          <div
            className="w-0.5 h-5 rounded-full opacity-20"
            style={{
              background: "linear-gradient(to top, #D4A574, transparent)",
              transform: "rotate(-12deg)",
            }}
          />
          <div
            className="w-0.5 h-6 rounded-full opacity-25"
            style={{ background: "linear-gradient(to top, #D4A574, transparent)" }}
          />
          <div
            className="w-0.5 h-5 rounded-full opacity-20"
            style={{
              background: "linear-gradient(to top, #D4A574, transparent)",
              transform: "rotate(12deg)",
            }}
          />
        </div>

        <div className="relative">
          <div
            className="w-24 h-[68px] rounded-b-[1.8rem] rounded-t-lg border-2 border-[#D4A574]/20 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(180deg, rgba(212,165,116,0.06) 0%, rgba(212,165,116,0.12) 100%)",
            }}
          >
            <Coffee className="w-7 h-7 text-[#D4A574]/30" />
          </div>
          <div className="absolute -right-3.5 top-2.5 w-4 h-9 border-2 border-[#D4A574]/15 border-l-0 rounded-r-full" />
        </div>

        <div
          className="w-32 h-3 rounded-full mx-auto -mt-0.5"
          style={{
            background:
              "linear-gradient(180deg, rgba(212,165,116,0.1) 0%, rgba(212,165,116,0.04) 100%)",
          }}
        />
      </div>

      <h3
        className="text-foreground mb-1.5"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.1rem",
          fontWeight: 600,
        }}
      >
        {hasFilters ? "Tidak ada pelanggan ditemukan" : "Belum ada pelanggan"}
      </h3>
      <p
        className="text-muted-foreground/70 text-center max-w-[300px] mb-5"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.8rem",
          fontWeight: 400,
          lineHeight: 1.6,
        }}
      >
        {hasFilters
          ? "Coba sesuaikan pencarian atau filter untuk menemukan yang Anda cari."
          : "Mulai dengan menambahkan pelanggan pertama Anda."}
      </p>

      {!hasFilters && (
        <a
          href="/customers/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white cursor-pointer hover:opacity-90 transition-opacity"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.82rem",
            fontWeight: 500,
            background: "linear-gradient(135deg, #D4A574 0%, #A67C52 100%)",
          }}
        >
          <Plus className="w-4 h-4" />
          Tambah Pelanggan Pertama
        </a>
      )}
    </div>
  );
}
