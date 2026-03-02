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
  Coffee,
  Sparkles,
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
      {/* Left Panel: Brand */}
      <div
        className="relative lg:w-[55%] flex flex-col items-center justify-center px-8 py-16 lg:py-0 overflow-hidden"
        style={{
          background:
            "linear-gradient(165deg, #FFF8F0 0%, #FFF2E5 50%, #FDEBD4 100%)",
        }}
      >
        {/* Coffee bean pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.045]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="login-beans"
                x="0"
                y="0"
                width="90"
                height="90"
                patternUnits="userSpaceOnUse"
              >
                <ellipse cx="22" cy="22" rx="8" ry="11" fill="#3C2415" transform="rotate(-30 22 22)" />
                <line x1="17.5" y1="15" x2="26.5" y2="29" stroke="#FFF8F0" strokeWidth="1.3" transform="rotate(-30 22 22)" />
                <ellipse cx="62" cy="60" rx="8" ry="11" fill="#3C2415" transform="rotate(25 62 60)" />
                <line x1="57.5" y1="53" x2="66.5" y2="67" stroke="#FFF8F0" strokeWidth="1.3" transform="rotate(25 62 60)" />
                <ellipse cx="68" cy="18" rx="5.5" ry="7.5" fill="#3C2415" transform="rotate(-15 68 18)" />
                <line x1="65" y1="13" x2="71" y2="23" stroke="#FFF8F0" strokeWidth="1" transform="rotate(-15 68 18)" />
                <ellipse cx="25" cy="68" rx="5" ry="7" fill="#3C2415" transform="rotate(40 25 68)" />
                <line x1="22.5" y1="63.5" x2="27.5" y2="72.5" stroke="#FFF8F0" strokeWidth="1" transform="rotate(40 25 68)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-beans)" />
          </svg>
        </div>

        {/* Decorative warm circles */}
        <div className="absolute top-[15%] left-[10%] w-64 h-64 rounded-full bg-[#D4A574]/[0.06] blur-3xl" />
        <div className="absolute bottom-[20%] right-[8%] w-48 h-48 rounded-full bg-[#D4A574]/[0.08] blur-2xl" />

        {/* Brand content */}
        <div className="relative z-10 text-center max-w-md">
          <div className="flex items-center justify-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-[14px] bg-[#3C2415] flex items-center justify-center shadow-lg shadow-[#3C2415]/15">
              <Coffee className="w-6 h-6 text-[#D4A574]" />
            </div>
          </div>
          <h1 className="font-display text-[#3C2415] text-[2.75rem] font-bold leading-none tracking-tight mb-3">
            Kopi Kita
          </h1>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-px bg-[#D4A574]/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A574]/50" />
            <div className="w-8 h-px bg-[#D4A574]/40" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#D4A574]" />
            <p className="text-[#3C2415]/70 text-[1rem] tracking-wide">
              AI-Powered Promo Helper
            </p>
          </div>
          <p className="text-[#3C2415]/40 text-[0.8rem]">
            Manage customers, craft smart campaigns,
            <br />
            and grow your coffee business.
          </p>
        </div>

        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-[#3C2415]/25 text-[0.7rem]">
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
