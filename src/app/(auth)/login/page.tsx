"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { z } from "zod";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  password: z
    .string()
    .min(1, "Password wajib diisi")
    .min(6, "Password minimal 6 karakter"),
});

type FieldErrors = Partial<Record<"email" | "password", string>>;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setApiError("");

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as "email" | "password";
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    const result = await signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (result.error) {
      setApiError("Email atau password salah. Silakan coba lagi.");
      setIsLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const hasError = (field: "email" | "password") => !!fieldErrors[field];
  const hasAnyError = Object.keys(fieldErrors).length > 0 || apiError !== "";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel: Brand with Coffee Image */}
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center overflow-hidden">
        {/* Background image */}
        <img
          src="/coffee.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />

        {/* Warm tint overlay */}
        <div className="absolute inset-0 bg-[#3C2415]/20 mix-blend-multiply" />

        {/* Brand text overlay */}
        <div className="relative z-10 text-center">
          <h1 className="font-display text-[#FFF8F0] text-[3.5rem] font-bold leading-none tracking-[0.04em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
            Kopi Kita
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4 mb-4">
            <div className="w-10 h-px bg-[#D4A574]/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A574]/70" />
            <div className="w-10 h-px bg-[#D4A574]/60" />
          </div>
          <p className="text-[#FFF8F0]/60 text-[0.85rem] tracking-[0.15em] uppercase">
            AI-Powered Promo Helper
          </p>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center z-10">
          <p className="text-[#FFF8F0]/30 text-[0.7rem]">
            &copy; 2026 Kopi Kita. Crafted with ☕
          </p>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="lg:w-[45%] flex items-center justify-center px-6 py-12 lg:py-0 bg-white dark:bg-[#1A1210]">
        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h2 className="font-display text-[#3C2415] dark:text-[#F5EDE4] text-[1.65rem] font-semibold leading-tight mb-2">
              Selamat Datang
            </h2>
            <p className="text-[#3C2415]/50 dark:text-[#F5EDE4]/50 text-[0.85rem]">
              Masuk untuk mengelola pelanggan dan promo
            </p>
          </div>

          {apiError && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#D4183D]/[0.06] border border-[#D4183D]/15 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[#D4183D]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[0.7rem] leading-none">✕</span>
              </div>
              <p className="text-[#B91C3A] text-[0.8rem] leading-relaxed">
                {apiError}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[#3C2415]/70 dark:text-[#F5EDE4]/60 text-[0.75rem] font-medium mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    hasError("email")
                      ? "text-[#D4183D]/40"
                      : "text-[#3C2415]/25 dark:text-[#F5EDE4]/25"
                  }`}
                />
                <input
                  type="email"
                  placeholder="Email anda"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                    if (apiError) setApiError("");
                  }}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-[#FFF8F0]/60 dark:bg-[#241C17] text-[#3C2415] dark:text-[#F5EDE4] placeholder:text-[#3C2415]/30 dark:placeholder:text-[#F5EDE4]/25 transition-all duration-200 outline-none border text-[0.85rem] ${
                    hasError("email")
                      ? "border-[#D4183D]/30 bg-[#D4183D]/[0.03] focus:border-[#D4183D]/50 focus:ring-2 focus:ring-[#D4183D]/10"
                      : "border-[#3C2415]/10 dark:border-[#F5EDE4]/10 focus:border-[#D4A574]/50 focus:ring-2 focus:ring-[#D4A574]/15"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-[#D4183D] text-[0.72rem]">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[#3C2415]/70 dark:text-[#F5EDE4]/60 text-[0.75rem] font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    hasError("password")
                      ? "text-[#D4183D]/40"
                      : "text-[#3C2415]/25 dark:text-[#F5EDE4]/25"
                  }`}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                    if (apiError) setApiError("");
                  }}
                  className={`w-full pl-10 pr-11 py-3 rounded-xl bg-[#FFF8F0]/60 dark:bg-[#241C17] text-[#3C2415] dark:text-[#F5EDE4] placeholder:text-[#3C2415]/30 dark:placeholder:text-[#F5EDE4]/25 transition-all duration-200 outline-none border text-[0.85rem] ${
                    hasError("password")
                      ? "border-[#D4183D]/30 bg-[#D4183D]/[0.03] focus:border-[#D4183D]/50 focus:ring-2 focus:ring-[#D4183D]/10"
                      : "border-[#3C2415]/10 dark:border-[#F5EDE4]/10 focus:border-[#D4A574]/50 focus:ring-2 focus:ring-[#D4A574]/15"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#3C2415]/30 dark:text-[#F5EDE4]/30 hover:text-[#3C2415]/50 dark:hover:text-[#F5EDE4]/50 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-[#D4183D] text-[0.72rem]">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-[#3C2415] text-[#FFF8F0] flex items-center justify-center gap-2 transition-all duration-200 hover:bg-[#4D3525] active:scale-[0.99] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-[0.85rem] font-medium"
            >
              {isLoading ? (
                <div
                  className="border-2 border-[#FFF8F0]/30 border-t-[#FFF8F0] rounded-full animate-spin"
                  style={{ width: 18, height: 18 }}
                />
              ) : (
                <>
                  Masuk
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button className="text-[#D4A574] hover:text-[#A67C52] transition-colors cursor-pointer text-[0.8rem]">
              Lupa password?
            </button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#3C2415]/8 dark:bg-[#F5EDE4]/8" />
            <span className="text-[#3C2415]/25 dark:text-[#F5EDE4]/25 text-[0.7rem]">
              atau
            </span>
            <div className="flex-1 h-px bg-[#3C2415]/8 dark:bg-[#F5EDE4]/8" />
          </div>

          <div className="p-3.5 rounded-xl bg-[#D4A574]/[0.06] border border-[#D4A574]/10">
            <p className="text-[#3C2415]/50 dark:text-[#F5EDE4]/50 text-center text-[0.75rem] leading-relaxed">
              Demo:&nbsp;
              <span className="text-[#3C2415]/70 dark:text-[#F5EDE4]/70 font-medium">
                mimi@kopikita.com
              </span>
              &nbsp;/&nbsp;
              <span className="text-[#3C2415]/70 dark:text-[#F5EDE4]/70 font-medium">
                KopiKita2026!
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
