"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  BookOpen,
  Mic,
  MessagesSquare,
  ChartNoAxesCombined,
  House,
  Search,
  RotateCcw,
  Sun,
  Moon,
  Sparkles,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { requestJson } from "@/components/learning-common";

export interface NavItem {
  href: string;
  label: string;
  vi: string;
  icon: typeof House;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "學習首頁", vi: "Trang chủ", icon: House },
  { href: "/vocabulary", label: "詞彙與語法", vi: "Từ vựng & Ngữ pháp", icon: BookOpen },
  { href: "/dictionary", label: "華越詞典", vi: "Từ điển Trung–Việt", icon: Search },
  { href: "/flashcards", label: "生詞複習", vi: "Thẻ SRS", icon: RotateCcw },
  { href: "/speaking", label: "口說練習", vi: "Luyện phát âm", icon: Mic },
  { href: "/conversation", label: "AI 對話", vi: "Đối thoại AI", icon: MessagesSquare },
  { href: "/progress", label: "學習紀錄", vi: "Tiến độ học", icon: ChartNoAxesCombined },
];

export const MOBILE_DOCK_NAV: NavItem[] = [
  { href: "/dashboard", label: "首頁", vi: "Trang chủ", icon: House },
  { href: "/vocabulary", label: "詞彙", vi: "Từ vựng", icon: BookOpen },
  { href: "/flashcards", label: "複習", vi: "Ôn thẻ", icon: RotateCcw },
  { href: "/conversation", label: "對話", vi: "Đối thoại", icon: MessagesSquare },
  { href: "/progress", label: "進度", vi: "Tiến độ", icon: ChartNoAxesCombined },
];

const subscribeTheme = (callback: () => void) => {
  const q = window.matchMedia("(prefers-color-scheme: dark)");
  q.addEventListener("change", callback);
  window.addEventListener("storage", callback);
  window.addEventListener("zx-theme-change", callback);
  return () => {
    q.removeEventListener("change", callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("zx-theme-change", callback);
  };
};

const getClientTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem("zx_theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  const currentAttr = document.documentElement.getAttribute("data-theme");
  if (currentAttr === "dark" || currentAttr === "light") return currentAttr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export function ShellV2({
  user,
  children,
}: {
  user: { id: number; name: string; email: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const theme = useSyncExternalStore(subscribeTheme, getClientTheme, () => "light");
  const isDemo = user.email === "demo@hanzi.app";
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Global hotkey ⌘K / Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("zx_theme", next);
    } catch {}
    document.documentElement.setAttribute("data-theme", next);
    window.dispatchEvent(new Event("zx-theme-change"));
  }

  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      await requestJson("/api/auth/logout", {});
      window.location.assign("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "無法登出。");
      setBusy(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/dictionary?q=${encodeURIComponent(searchQuery.trim())}`);
  }

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-200 mesh-gradient-bg text-slate-800 dark:text-slate-100">
      {/* Skip to Main Content (Accessibility WCAG AAA) */}
      <a href="#zx-main" className="zx-skip-link">
        Chuyển đến nội dung chính / 跳至主要內容
      </a>



      {/* TOP HEADER (STITCH MASTER MATCH - DESKTOP) */}
      <header className="hidden md:block sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 dark:bg-slate-900/75 border-b border-white/60 dark:border-white/10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Tagline */}
          <Link href="/dashboard" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#C8322B] to-rose-500 flex items-center justify-center shadow-md shadow-red-700/20 text-white font-serif font-bold text-xl transition-transform group-hover:scale-105">
              中
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-[#C8322B] dark:from-white dark:via-slate-200 dark:to-rose-400 bg-clip-text text-transparent">
                  ZhongXue+
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[#C8322B]/10 dark:bg-rose-500/20 text-[#C8322B] dark:text-rose-300 border border-[#C8322B]/20">
                  Bento V2
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal hidden sm:block">
                Học Viện Hán Ngữ Phồn Thể Cho Người Việt
              </p>
            </div>
          </Link>

          {/* Quick Search Omnibar with ⌘K */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center gap-2 bg-white/75 dark:bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/80 dark:border-white/10 shadow-sm text-sm text-slate-500 dark:text-slate-300 w-80 max-w-sm focus-within:ring-2 focus-within:ring-[#C8322B]/40 transition-all"
          >
            <Search size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tra Pinyin, Chữ Hán, Hán-Việt..."
              aria-label="Tra cứu từ điển đa năng"
              className="bg-transparent text-xs w-full focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100"
            />
            <kbd className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono shrink-0">
              ⌘K
            </kbd>
          </form>

          {/* User Status, Theme Toggle & Profile HUD */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Concept Gem Currency Pill */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-white/70 dark:border-white/10 shadow-sm text-xs font-semibold text-amber-700 dark:text-amber-400 cursor-help"
              title="Khái niệm game hóa (Giai đoạn thử nghiệm)"
            >
              <span>💎</span>
              <span>1,420</span>
              <span className="text-[10px] opacity-75 font-normal">(Demo)</span>
            </div>

            {/* Target Level Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-glow" />
              <span>TOCFL A2</span>
            </div>

            {/* Theme Toggle Button (Supports Playwright assertion) */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Đổi giao diện sáng/tối"
              className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-sm transition-all"
              title={theme === "dark" ? "Chuyển sang Giao diện Sáng" : "Chuyển sang Giao diện Tối"}
            >
              {theme === "dark" ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-600" />}
            </button>

            {/* User Profile Avatar & Menu */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200/60 dark:border-slate-700/60">
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#C8322B]/40 rounded-full"
                  aria-label="Tài khoản học giả"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-bold text-white text-sm ring-2 ring-white dark:ring-slate-700 shadow-sm border border-slate-200 dark:border-slate-700">
                    {user?.name?.[0] ?? "示"}
                  </div>
                  <div className="hidden xl:block text-left">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
                      {isDemo ? "Tài khoản mẫu" : "Học giả"}
                    </p>
                  </div>
                </button>
              </div>

              {!isDemo && (
                <button
                  onClick={handleLogout}
                  disabled={busy}
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                  className="hidden md:flex p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <LogOut size={16} />
                </button>
              )}

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu điều hướng"}
                className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/70 border border-white/60 dark:border-slate-700"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* DESKTOP SECONDARY NAVIGATION TABS */}
        <div className="hidden md:block border-t border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-1 overflow-x-auto py-1.5 scrollbar-none">
            <nav className="flex items-center gap-1">
              {MAIN_NAV.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#C8322B] text-white shadow-sm shadow-[#C8322B]/20"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon size={15} />
                    <span>{item.vi}</span>
                    <span className="text-[10px] opacity-75 font-normal">({item.label})</span>
                  </Link>
                );
              })}
            </nav>

            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono hidden xl:flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#C8322B]" />
              <span>Phồn thể Đài Loan · Chuẩn Hán–Việt</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Top Header */}
      <header className="zx-mobile-header md:hidden flex items-center justify-between px-4 py-3 bg-[var(--zx-card)] border-b border-[var(--zx-line)] sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#C8322B] to-rose-500 flex items-center justify-center text-white font-serif font-bold text-lg">
            中
          </div>
          <div>
            <strong className="text-sm font-bold text-slate-900 dark:text-white">ZhongXue+</strong>
            <small className="block text-[10px] text-slate-500 dark:text-slate-400">TOCFL A2</small>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Đổi giao diện sáng/tối"
            className="p-1.5 rounded-lg border border-[var(--zx-line)] text-slate-700 dark:text-slate-200"
          >
            {theme === "dark" ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu điều hướng"}
            className="p-1.5 rounded-lg border border-[var(--zx-line)] text-slate-700 dark:text-slate-200"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* MOBILE COLLAPSIBLE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
          <div className="w-72 max-w-[80vw] h-full bg-white dark:bg-slate-900 shadow-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#C8322B] text-white flex items-center justify-center font-bold">
                    中
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">ZhongXue+</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                  aria-label="Đóng menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation links */}
              <nav className="mt-5 space-y-1">
                {MAIN_NAV.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-[#C8322B] text-white"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon size={18} />
                      <div>
                        <p>{item.vi}</p>
                        <p className="text-[10px] opacity-75 font-normal">{item.label}</p>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Chế độ giao diện:</span>
                <button
                  onClick={toggleTheme}
                  aria-label="Đổi giao diện sáng/tối"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium"
                >
                  {theme === "dark" ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
                  <span>{theme === "dark" ? "Sáng" : "Tối"}</span>
                </button>
              </div>
              {!isDemo ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold"
                >
                  <LogOut size={15} />
                  <span>Đăng xuất</span>
                </button>
              ) : (
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center text-xs font-bold text-[#C8322B] py-1"
                >
                  Tạo tài khoản học giả →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT CANVAS */}
      <main id="zx-main" className="flex-1 pb-24 md:pb-12">
        {/* Demo Account Warning Banner */}
        {isDemo && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="rounded-2xl p-3 sm:p-4 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <span className="text-base">💡</span>
                <div>
                  <strong>Tài khoản Mẫu (Khách trải nghiệm)</strong>
                  <p className="text-amber-700 dark:text-amber-300 text-[11px] mt-0.5">
                    Dữ liệu học tập và thẻ ghi nhớ được chia sẻ chung. Để lưu trữ tiến độ cá nhân, vui lòng tạo tài khoản riêng.
                  </p>
                </div>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition-colors shadow-sm"
              >
                Tạo tài khoản học giả →
              </Link>
            </div>
          </div>
        )}

        {children}
      </main>

      {/* SHARED MOBILE BOTTOM DOCK NAVIGATION (STITCH MOBILE MASTER MATCH) */}
      <nav
        aria-label="Điều hướng chính di động"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 px-3 py-2 shadow-lg"
      >
        <div className="flex items-center justify-around">
          {MOBILE_DOCK_NAV.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
                  isActive
                    ? "text-[#C8322B] dark:text-rose-400 font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] mt-1 leading-none">{item.vi}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#C8322B] dark:bg-rose-400 absolute -bottom-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Global Footer */}
      <footer className="border-t border-slate-200/60 dark:border-slate-800/60 py-6 text-center text-xs text-slate-400 dark:text-slate-500 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>ZhongXue+ (中學+) · Nền tảng Hán ngữ Phồn thể Chuẩn mực cho Người Việt</p>
          <p className="font-mono text-[11px]">Bento Design System • Thuật toán SM-2 Spaced Repetition</p>
        </div>
      </footer>
    </div>
  );
}
