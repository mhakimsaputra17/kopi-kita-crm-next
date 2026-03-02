"use client";

import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteDialogProps {
  customerName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteDialog({ customerName, onCancel, onConfirm }: DeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-[#3C2415]/30 dark:bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />
      <div
        className="relative bg-card rounded-2xl shadow-2xl border border-border/40 w-full max-w-[400px] mx-4 overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="h-1 bg-gradient-to-r from-[#D4183D] to-[#C4726C]" />

        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#D4183D]/8 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#D4183D]" />
            </div>
            <h3
              className="text-foreground"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.1rem",
                fontWeight: 600,
              }}
            >
              Hapus Pelanggan?
            </h3>
          </div>
          <p
            className="text-muted-foreground mb-1"
            style={{ fontSize: "0.82rem", fontWeight: 400, lineHeight: 1.6 }}
          >
            Apakah anda yakin ingin menghapus{" "}
            <span className="text-foreground" style={{ fontWeight: 600 }}>
              {customerName}
            </span>
            ?
          </p>
          <p
            className="text-muted-foreground/60"
            style={{ fontSize: "0.72rem", fontWeight: 400, lineHeight: 1.5 }}
          >
            Tindakan ini tidak bisa dibatalkan.
          </p>
        </div>

        <div className="flex items-center gap-3 px-6 py-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border/60 text-foreground/70 hover:bg-secondary transition-colors cursor-pointer"
            style={{ fontSize: "0.82rem", fontWeight: 500 }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#D4183D] text-white hover:bg-[#B8152F] transition-colors cursor-pointer flex items-center justify-center gap-2"
            style={{ fontSize: "0.82rem", fontWeight: 500 }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
