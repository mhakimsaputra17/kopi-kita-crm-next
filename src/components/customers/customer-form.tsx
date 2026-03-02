"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  User,
  Phone,
  Coffee,
  Tag,
  X,
  Search,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { customerSchema, type CustomerFormValues } from "@/schemas/customer";
import { createCustomer, updateCustomer } from "@/actions/customer-actions";
import { useClickOutside } from "@/hooks/use-click-outside";
import { SUGGESTED_TAGS, getTagStyle } from "@/lib/constants";

interface CustomerFormProps {
  customerId?: string;
  defaultValues?: CustomerFormValues;
}

export function CustomerForm({ customerId, defaultValues }: CustomerFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(customerId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues ?? {
      name: "",
      contact: "",
      favoriteDrink: "",
      interestTags: [],
    },
  });

  const selectedTags = watch("interestTags");
  const [tagSearch, setTagSearch] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const tagDropdownRef = useClickOutside<HTMLDivElement>(
    useCallback(() => setShowTagDropdown(false), []),
  );

  const filteredSuggestions = useMemo(() => {
    const available = SUGGESTED_TAGS.filter((t) => !selectedTags.includes(t));
    if (!tagSearch.trim()) return available;
    return available.filter((t) =>
      t.toLowerCase().includes(tagSearch.toLowerCase()),
    );
  }, [tagSearch, selectedTags]);

  const addTag = (tag: string) => {
    const normalized = tag.toLowerCase().trim();
    if (normalized && !selectedTags.includes(normalized)) {
      setValue("interestTags", [...selectedTags, normalized], { shouldValidate: true });
    }
    setTagSearch("");
  };

  const removeTag = (tag: string) => {
    setValue(
      "interestTags",
      selectedTags.filter((t) => t !== tag),
      { shouldValidate: true },
    );
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagSearch.trim()) {
        const match = filteredSuggestions.find(
          (t) => t.toLowerCase() === tagSearch.toLowerCase(),
        );
        addTag(match || tagSearch.trim());
      }
    }
    if (e.key === "Backspace" && !tagSearch && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  const onSubmit = async (data: CustomerFormValues) => {
    const result = isEdit && customerId
      ? await updateCustomer(customerId, data)
      : await createCustomer(data);

    if (result.success) {
      toast.success(
        isEdit
          ? "Pelanggan berhasil diperbarui ✓"
          : "Pelanggan berhasil ditambahkan ✓",
      );
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      router.push("/customers");
    } else {
      toast.error(result.error || "Terjadi kesalahan");
    }
  };

  return (
    <div className="py-1 sm:py-2 max-w-[640px] mx-auto">
      {/* Back Link */}
      <div className="mb-5">
        <button
          onClick={() => router.push("/customers")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Kembali ke daftar pelanggan
        </button>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div
          className="bg-card rounded-xl border border-border/40 overflow-hidden"
          style={{ boxShadow: "0 2px 12px rgba(60,36,21,0.04)" }}
        >
          <div
            className="h-1"
            style={{
              background: isEdit
                ? "linear-gradient(90deg, #D4A574, #C4956A)"
                : "linear-gradient(90deg, #3C2415, #5C3D2E)",
            }}
          />

          <div className="p-6 space-y-5">
            {/* Field: Nama */}
            <FormField
              label="Nama"
              required
              error={errors.name?.message}
              icon={<User className="w-4 h-4" />}
            >
              <input
                type="text"
                {...register("name")}
                placeholder="Nama lengkap pelanggan"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-transparent text-foreground placeholder:text-muted-foreground/35 focus:outline-none transition-all ${
                  errors.name
                    ? "border-[#D4183D]/40 focus:border-[#D4183D]/60 focus:ring-2 focus:ring-[#D4183D]/10"
                    : "border-border/50 focus:border-[#D4A574]/50 focus:ring-2 focus:ring-[#D4A574]/10"
                }`}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.85rem",
                }}
              />
            </FormField>

            {/* Field: Kontak */}
            <FormField
              label="Kontak"
              required={false}
              error={errors.contact?.message}
              icon={<Phone className="w-4 h-4" />}
              helper="Opsional — untuk pengiriman promo"
            >
              <input
                type="text"
                {...register("contact")}
                placeholder="Email atau nomor HP"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-[#D4A574]/50 focus:ring-2 focus:ring-[#D4A574]/10 transition-all"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.85rem",
                }}
              />
            </FormField>

            {/* Field: Minuman Favorit */}
            <FormField
              label="Minuman/Produk Favorit"
              required
              error={errors.favoriteDrink?.message}
              icon={<Coffee className="w-4 h-4" />}
            >
              <input
                type="text"
                {...register("favoriteDrink")}
                placeholder="e.g., Caramel Latte, Cold Brew"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-transparent text-foreground placeholder:text-muted-foreground/35 focus:outline-none transition-all ${
                  errors.favoriteDrink
                    ? "border-[#D4183D]/40 focus:border-[#D4183D]/60 focus:ring-2 focus:ring-[#D4183D]/10"
                    : "border-border/50 focus:border-[#D4A574]/50 focus:ring-2 focus:ring-[#D4A574]/10"
                }`}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.85rem",
                }}
              />
            </FormField>

            {/* Field: Interest Tags */}
            <div>
              <label
                className="flex items-center gap-1.5 mb-2 text-foreground"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                }}
              >
                <Tag className="w-3.5 h-3.5 text-muted-foreground/50" />
                Interest Tags
                <span className="text-[#D4A574]">*</span>
              </label>

              {/* Selected tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {selectedTags.map((tag) => {
                    const style = getTagStyle(tag);
                    return (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full ${style.bg} ${style.text}`}
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.72rem",
                          fontWeight: 500,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: style.dotColor }}
                        />
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="w-4 h-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Tag search input */}
              <div className="relative" ref={tagDropdownRef}>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => {
                    setTagSearch(e.target.value);
                    setShowTagDropdown(true);
                  }}
                  onFocus={() => setShowTagDropdown(true)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={
                    selectedTags.length > 0
                      ? "Tambah tag lainnya..."
                      : "Ketik untuk mencari atau tambah tag..."
                  }
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-transparent text-foreground placeholder:text-muted-foreground/35 focus:outline-none transition-all ${
                    errors.interestTags
                      ? "border-[#D4183D]/40 focus:border-[#D4183D]/60 focus:ring-2 focus:ring-[#D4183D]/10"
                      : "border-border/50 focus:border-[#D4A574]/50 focus:ring-2 focus:ring-[#D4A574]/10"
                  }`}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.85rem",
                  }}
                />

                {showTagDropdown && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border/50 rounded-xl shadow-xl z-20 max-h-[200px] overflow-y-auto">
                    {filteredSuggestions.map((tag) => {
                      const style = getTagStyle(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            addTag(tag);
                            setShowTagDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#D4A574]/6 transition-colors cursor-pointer text-left"
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "0.8rem",
                            fontWeight: 400,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: style.dotColor }}
                          />
                          <span className="text-foreground/80">{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {errors.interestTags && (
                <div className="flex items-center gap-1.5 mt-2">
                  <AlertCircle className="w-3 h-3 text-[#D4183D]/70" />
                  <p
                    className="text-[#D4183D]/80"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.7rem",
                    }}
                  >
                    {errors.interestTags.message}
                  </p>
                </div>
              )}

              {filteredSuggestions.length > 0 && !showTagDropdown && (
                <div className="mt-3">
                  <p
                    className="text-muted-foreground/50 mb-2"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.65rem",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Tag tersedia
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredSuggestions.slice(0, 8).map((tag) => {
                      const style = getTagStyle(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/40 text-muted-foreground/60 hover:border-[#D4A574]/30 hover:text-foreground/80 hover:bg-[#D4A574]/4 transition-all cursor-pointer"
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "0.68rem",
                            fontWeight: 400,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0 opacity-50"
                            style={{ backgroundColor: style.dotColor }}
                          />
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Divider + Buttons */}
          <div className="border-t border-border/30 px-6 py-5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-white transition-all cursor-pointer hover:opacity-90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.88rem",
                fontWeight: 500,
                background: "linear-gradient(135deg, #3C2415 0%, #5C3D2E 100%)",
              }}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Simpan Perubahan" : "Simpan Pelanggan"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/customers")}
              className="w-full mt-2.5 py-2.5 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer text-center"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.8rem",
                fontWeight: 400,
              }}
            >
              Batal
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Reusable Form Field Wrapper ───
function FormField({
  label,
  required,
  error,
  helper,
  icon,
  children,
}: {
  label: string;
  required: boolean;
  error?: string;
  helper?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="flex items-center gap-1.5 mb-2 text-foreground"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.78rem",
          fontWeight: 500,
        }}
      >
        <span className="text-muted-foreground/50">{icon}</span>
        {label}
        {required && <span className="text-[#D4A574]">*</span>}
      </label>

      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40">
          {icon}
        </div>
        {children}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <AlertCircle className="w-3 h-3 text-[#D4183D]/70" />
          <p
            className="text-[#D4183D]/80"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.7rem",
            }}
          >
            {error}
          </p>
        </div>
      )}

      {helper && !error && (
        <p
          className="text-muted-foreground/45 mt-1.5"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.68rem",
            fontWeight: 400,
          }}
        >
          {helper}
        </p>
      )}
    </div>
  );
}
