"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  ChevronDown,
  X,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Mail,
  Phone,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { TagBadge } from "./tag-badge";
import { DeleteDialog } from "./delete-dialog";
import { EmptyState } from "./empty-state";
import { useCustomers } from "@/hooks/use-customers";
import { useClickOutside } from "@/hooks/use-click-outside";
import { deleteCustomer } from "@/actions/customer-actions";
import {
  ALL_FILTER_TAGS,
  TAG_STYLES,
  getAvatarGradient,
  getInitials,
  formatDateID,
} from "@/lib/constants";

const ITEMS_PER_PAGE = 10;

export function CustomerTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);

  const queryClient = useQueryClient();

  const filterRef = useClickOutside<HTMLDivElement>(
    useCallback(() => setFilterOpen(false), []),
  );

  // Debounce search
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1);
    }, 300);
    setSearchTimer(timer);
  };

  const { data, isLoading } = useCustomers({
    search: debouncedSearch || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
  });

  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
    setCurrentPage(1);
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteCustomer(deleteTarget.id);
    setIsDeleting(false);
    if (result.success) {
      toast.success("Pelanggan berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } else {
      toast.error(result.error || "Gagal menghapus pelanggan");
    }
    setDeleteTarget(null);
  };

  const showEmpty = !isLoading && customers.length === 0;

  const getContactType = (contact: string | null): "email" | "phone" | "none" => {
    if (!contact) return "none";
    if (contact.includes("@")) return "email";
    if (/^\d/.test(contact)) return "phone";
    return "none";
  };

  return (
    <div className="py-1 sm:py-2 max-w-[1400px] mx-auto w-full">
      {/* Summary */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">
          Total: <span className="text-foreground font-medium">{total}</span> pelanggan
        </span>
      </div>

      {/* Toolbar: Search + Filter + CTA */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama\u2026"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Cari pelanggan"
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:border-[#D4A574]/50 focus-visible:ring-2 focus-visible:ring-[#D4A574]/10 transition-all text-sm"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 bg-card border rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              filterOpen
                ? "border-[#D4A574]/50 ring-2 ring-[#D4A574]/10"
                : "border-border/50 hover:border-border"
            }`}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.82rem",
              fontWeight: 400,
            }}
          >
            <span className="text-muted-foreground">Filter Interest</span>
            {selectedTags.length > 0 && (
              <span
                className="bg-[#D4A574] text-white px-1.5 py-0.5 rounded-md min-w-[20px] text-center"
                style={{ fontSize: "0.6rem", fontWeight: 700 }}
              >
                {selectedTags.length}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 ${
                filterOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border/50 rounded-xl shadow-xl z-30 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <p
                  className="text-foreground"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                  }}
                >
                  Interest Tags
                </p>
                <p
                  className="text-muted-foreground/50 mt-0.5"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.65rem",
                    fontWeight: 400,
                  }}
                >
                  Pilih satu atau lebih tag untuk filter
                </p>
              </div>
              <div className="p-3 max-h-[260px] overflow-y-auto space-y-0.5">
                {ALL_FILTER_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  const style = TAG_STYLES[tag] || { dotColor: "#999" };
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                        isSelected ? "bg-[#D4A574]/8" : "hover:bg-secondary/50"
                      }`}
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "0.78rem",
                        fontWeight: isSelected ? 500 : 400,
                      }}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "bg-[#D4A574] border-[#D4A574]"
                            : "border-border/80 bg-transparent"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: style.dotColor }}
                      />
                      <span
                        className={
                          isSelected ? "text-foreground" : "text-foreground/70"
                        }
                      >
                        {tag}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedTags.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border/30 flex items-center justify-between">
                  <span
                    className="text-muted-foreground/60"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.68rem",
                      fontWeight: 400,
                    }}
                  >
                    {selectedTags.length} tag dipilih
                  </span>
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-[#D4A574] hover:text-[#A67C52] dark:hover:text-[#E8C9A8] transition-colors cursor-pointer"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.72rem",
                      fontWeight: 500,
                    }}
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <Link
          href="/customers/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity shrink-0 text-sm font-medium"
          style={{
            background: "linear-gradient(135deg, #D4A574 0%, #A67C52 100%)",
            color: "#FFF8F0",
          }}
        >
          <Plus className="w-4 h-4" />
          Tambah Pelanggan
        </Link>
      </div>

      {/* Active Filter Pills */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {selectedTags.map((tag) => {
            const style = TAG_STYLES[tag] || {
              bg: "bg-secondary",
              text: "text-muted-foreground",
            };
            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full ${style.bg} ${style.text}`}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.7rem",
                  fontWeight: 500,
                }}
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="w-4 h-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
          <button
            onClick={() => setSelectedTags([])}
            className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer ml-1"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.7rem",
              fontWeight: 400,
            }}
          >
            Hapus semua
          </button>
        </div>
      )}

      {/* Table or Empty State */}
      {isLoading ? (
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30 bg-secondary/20">
                  {["Nama", "Kontak", "Minuman Favorit", "Interest Tags", "Tanggal Daftar", "Aksi"].map(
                    (header, idx) => (
                      <th
                        key={header}
                        className={`px-5 py-3 ${
                          idx === 5 ? "text-right pr-5" : "text-left"
                        } text-muted-foreground/70`}
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.67rem",
                          fontWeight: 600,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                        }}
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/20 last:border-b-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-5 py-3.5">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <Skeleton className="w-7 h-7 rounded-lg" />
                        <Skeleton className="w-7 h-7 rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : showEmpty ? (
        <EmptyState hasFilters={searchQuery !== "" || selectedTags.length > 0} />
      ) : (
        <>
          <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-secondary/20">
                    {["Nama", "Kontak", "Minuman Favorit", "Interest Tags", "Tanggal Daftar", "Aksi"].map(
                      (header, idx) => (
                        <th
                          key={header}
                          className={`px-5 py-3 ${
                            idx === 5 ? "text-right pr-5" : "text-left"
                          } text-muted-foreground/70`}
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "0.67rem",
                            fontWeight: 600,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                          }}
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => {
                    const gradient = getAvatarGradient(customer.name);
                    const contactType = getContactType(customer.contact);
                    return (
                      <tr
                        key={customer.id}
                        className="border-b border-border/20 last:border-b-0 transition-colors hover:bg-[#D4A574]/[0.04] dark:hover:bg-[#D4A574]/[0.03] group"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                              }}
                            >
                              <span
                                className="text-white"
                                style={{
                                  fontFamily: "'DM Sans', sans-serif",
                                  fontSize: "0.6rem",
                                  fontWeight: 600,
                                }}
                              >
                                {getInitials(customer.name)}
                              </span>
                            </div>
                            <span
                              className="text-foreground whitespace-nowrap"
                              style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: "0.82rem",
                                fontWeight: 500,
                              }}
                            >
                              {customer.name}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          {contactType === "none" ? (
                            <span
                              className="text-muted-foreground/40"
                              style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: "0.78rem",
                              }}
                            >
                              —
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              {contactType === "email" ? (
                                <Mail className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                              ) : (
                                <Phone className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                              )}
                              <span
                                className="text-foreground/75 whitespace-nowrap"
                                style={{
                                  fontFamily: "'DM Sans', sans-serif",
                                  fontSize: "0.78rem",
                                  fontWeight: 400,
                                }}
                              >
                                {customer.contact}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Coffee className="w-3 h-3 text-[#D4A574]/50 shrink-0" />
                            <span
                              className="text-foreground/75 whitespace-nowrap"
                              style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: "0.78rem",
                                fontWeight: 400,
                              }}
                            >
                              {customer.favoriteDrink}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {customer.interestTags.map((tag) => (
                              <TagBadge key={tag} tag={tag} />
                            ))}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className="text-muted-foreground whitespace-nowrap"
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "0.75rem",
                              fontWeight: 400,
                            }}
                          >
                            {formatDateID(customer.createdAt)}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <Link
                              href={`/customers/${customer.id}`}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#D4A574]/10 transition-colors"
                              title="Edit"
                              aria-label={`Edit ${customer.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-[#D4A574]" />
                            </Link>
                            <button
                              onClick={() => setDeleteTarget({ id: customer.id, name: customer.name })}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#D4183D]/8 transition-colors cursor-pointer"
                              title="Hapus"
                              aria-label={`Hapus ${customer.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[#C4726C]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-3 px-1">
            <p
              className="text-muted-foreground"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.75rem",
                fontWeight: 400,
              }}
            >
              Menampilkan{" "}
              <span className="text-foreground" style={{ fontWeight: 500 }}>
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, total)}
              </span>{" "}
              dari{" "}
              <span className="text-foreground" style={{ fontWeight: 500 }}>
                {total}
              </span>{" "}
              pelanggan
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-border/40 text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    page === currentPage
                      ? "text-white"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.75rem",
                    fontWeight: page === currentPage ? 600 : 400,
                    ...(page === currentPage
                      ? { background: "linear-gradient(135deg, #3C2415, #5C3D2E)" }
                      : {}),
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-border/40 text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <DeleteDialog
          customerName={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
