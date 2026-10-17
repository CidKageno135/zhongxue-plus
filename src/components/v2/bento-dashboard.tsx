"use client";

import useSWR from "swr";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Volume2,
  Bookmark,
  Mic,
  Sparkles,
  ArrowRight,
  BookOpen,
  RotateCcw,
  MessagesSquare,
  ChartNoAxesCombined,
  Flame,
  CheckCircle2,
  RefreshCw,
  Compass,
  Check
} from "lucide-react";
import { UNITS, getUnit } from "@/lib/curriculum";
import type { summarizeActivities, ActivityRecord } from "@/lib/learning";
import { requestJson } from "@/components/learning-common";
import { HanziStrokeWriter } from "@/components/hanzi-stroke-writer";

interface LearningData {
  summary: ReturnType<typeof summarizeActivities>;
  records: ActivityRecord[];
  hasMore: boolean;
  page: number;
}

// Flashcard vocabulary items for interactive cycling
const FLASHCARD_DECK = [
  {
    hanzi: "融",
    pinyin: "róng",
    tone: "Thanh 2 ↗",
    hanviet: "DUNG",
    meaning: "Hòa tan, dung nạp, tài chính",
    context: "trong \"Kim dung\", \"Dung hợp\"",
    radical: "Bộ 鬲 (Cách)",
    strokes: "16 nét",
    sentenceZh: "金融市場正在迅速發展。",
    sentencePy: "Jīnróng shìchǎng zhèngzài xùnsù fāzhǎn.",
    sentenceVi: "Thị trường tài chính đang phát triển nhanh chóng.",
    contourStart: "Tone 3",
    contourEnd: "Tone 5",
    cognateRule: "Vận -ong ➔ ung (Kim Dung)",
  },
  {
    hanzi: "票",
    pinyin: "piào",
    tone: "Thanh 4 ↘",
    hanviet: "PHIẾU",
    meaning: "Vé, phiếu, chứng từ",
    context: "trong \"Chi phiếu\", \"Vé tàu\"",
    radical: "Bộ 示 (Kỳ/Thị)",
    strokes: "11 nét",
    sentenceZh: "我要買一張到台北的悠遊卡。",
    sentencePy: "Wǒ yào mǎi yī zhāng dào Táiběi de Yōuyóukǎ.",
    sentenceVi: "Tôi muốn mua một chiếc thẻ EasyCard đi Đài Bắc.",
    contourStart: "Tone 5",
    contourEnd: "Tone 1",
    cognateRule: "Âm ph/p tương đồng cao",
  },
  {
    hanzi: "捷",
    pinyin: "jié",
    tone: "Thanh 2 ↗",
    hanviet: "TIỆP",
    meaning: "Nhanh chóng, thắng lợi",
    context: "trong \"Tiệp vận\" (MRT), \"Thắng tiệp\"",
    radical: "Bộ 手 (Thủ)",
    strokes: "11 nét",
    sentenceZh: "台北捷運非常準時和乾淨。",
    sentencePy: "Táiběi jiéyùn fēicháng zhǔnshí hé gānjìng.",
    sentenceVi: "Tàu điện ngầm MRT Đài Bắc rất đúng giờ và sạch sẽ.",
    contourStart: "Tone 3",
    contourEnd: "Tone 5",
    cognateRule: "Vần -ie ➔ iệp (Tiệp vận)",
  },
];

export function BentoDashboard() {
  const { data, error, isLoading, mutate } = useSWR<LearningData>(
    "/api/learning?page=0",
    requestJson,
    { refreshInterval: 20000 }
  );

  const [cardIndex, setCardIndex] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [srsFeedback, setSrsFeedback] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedScore, setRecordedScore] = useState<number | null>(null);
  const [strokeMode, setStrokeMode] = useState(false);

  const currentCard = FLASHCARD_DECK[cardIndex % FLASHCARD_DECK.length];
  const summary = data?.summary;
  const unit = getUnit(summary?.recommendationUnitId ?? 1)!;

  // Speak Hanzi and Sentence using Web Speech API
  function speakText(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-TW";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  // Handle SM-2 rating buttons (1 to 4)
  function handleSrsRating(grade: number, label: string) {
    setSrsFeedback(`Đã đánh giá: ${label} (SM-2 Grade ${grade})`);
    setTimeout(() => {
      setCardIndex((prev) => prev + 1);
      setSrsFeedback(null);
    }, 450);
  }

  // Keyboard shortcuts [1], [2], [3], [4]
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1") handleSrsRating(1, "Quên");
      else if (e.key === "2") handleSrsRating(2, "Khó");
      else if (e.key === "3") handleSrsRating(3, "Tốt");
      else if (e.key === "4") handleSrsRating(4, "Dễ");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cardIndex]);

  // Audio recording simulation
  function handleToggleRecord() {
    if (isRecording) {
      setIsRecording(false);
      setRecordedScore(96);
    } else {
      setIsRecording(true);
      setRecordedScore(null);
      speakText(currentCard.hanzi);
      setTimeout(() => {
        setIsRecording(false);
        setRecordedScore(96);
      }, 2000);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
      
      {/* ============================================================== */}
      {/* DASHBOARD TOP BAR / WELCOME BRIEFING */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
        <div>
          <div className="text-[11px] font-bold text-[#C8322B] dark:text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8322B] animate-pulse" />
            <span>ZHONGXUE+ · 智慧華語學習 · 每天一點，慢慢說得更好</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-slate-900 dark:text-white">
            <span>Phiên học Tập trung</span>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[#C8322B] dark:text-rose-400 font-bold uppercase tracking-wider">
              TOCFL A2 · Tuần 6
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Thuật toán SM-2 Spaced Repetition tối ưu hóa dựa theo độ ghi nhớ từ vựng của người Việt.
          </p>
        </div>

        {/* Quick Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setStrokeMode(!strokeMode)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-white/80 dark:border-slate-700 shadow-sm transition-all hover:scale-[1.02]"
          >
            <RefreshCw size={15} className={`text-slate-500 ${strokeMode ? "rotate-180" : ""}`} />
            <span>{strokeMode ? "Xem Flashcard" : "Đổi chế độ Viết"}</span>
          </button>
          <Link
            href="/flashcards"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#C8322B] to-rose-600 hover:from-red-700 hover:to-rose-700 text-xs font-semibold text-white shadow-md shadow-red-700/20 transition-all hover:scale-[1.02]"
          >
            <RotateCcw size={15} />
            <span>Ôn tập 20 thẻ SRS</span>
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 12-COLUMN ASYMMETRIC BENTO GRID (MATCHING STITCH MASTER) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 auto-rows-[minmax(180px,auto)]">

        {/* ============================================================ */}
        {/* TILE 1: SUPER FLASHCARD SM-2 (Span 7 cols, 2 rows) */}
        {/* ============================================================ */}
        <section className="lg:col-span-7 lg:row-span-2 glass-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          
          {/* Card Top Metadata */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-[#C8322B]/10 dark:bg-rose-500/20 text-[#C8322B] dark:text-rose-400 border border-[#C8322B]/20">
                SM-2 Flashcard
              </span>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-400">
                Thẻ {(cardIndex % FLASHCARD_DECK.length) + 1} / {FLASHCARD_DECK.length} • Chuẩn Phồn Thể
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBookmarked(!bookmarked)}
                aria-label="Lưu từ vào sổ tay"
                title={bookmarked ? "Đã lưu" : "Lưu vào sổ tay"}
                className={`p-2 rounded-xl transition-all border ${
                  bookmarked
                    ? "bg-[#C8322B] text-white border-[#C8322B]"
                    : "bg-white/70 dark:bg-slate-800/70 text-slate-500 hover:text-slate-800 dark:hover:text-white border-white/80 dark:border-slate-700"
                }`}
              >
                <Bookmark size={17} />
              </button>
              <button
                type="button"
                onClick={() => speakText(currentCard.hanzi)}
                aria-label="Phát âm mẫu chuẩn"
                title="Phát âm tiếng Đài Bắc"
                className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-[#C8322B] dark:hover:text-rose-400 border border-white/80 dark:border-slate-700 shadow-sm transition-all"
              >
                <Volume2 size={17} />
              </button>
            </div>
          </div>

          {/* Center Flashcard or Hanzi Stroke Writer */}
          {strokeMode ? (
            <div className="my-4 p-4 rounded-3xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-inner">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Luyện viết nét bút: {currentCard.hanzi}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold">
                    {currentCard.hanviet}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStrokeMode(false)}
                  className="text-xs text-[#C8322B] dark:text-rose-400 font-semibold hover:underline"
                >
                  Đóng chế độ viết
                </button>
              </div>
              <HanziStrokeWriter text={currentCard.hanzi} onClose={() => setStrokeMode(false)} />
            </div>
          ) : (
            <div className="my-5 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              {/* Rice Grid Box with Traditional Hanzi */}
              <div
                onClick={() => speakText(currentCard.hanzi)}
                className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white/95 dark:bg-slate-800/90 rice-grid-box border-2 border-[#C8322B]/20 shadow-inner flex items-center justify-center p-3 group cursor-pointer shrink-0 transition-transform hover:scale-[1.02]"
                title="Nhấn để nghe phát âm"
              >
                <span className="font-serif text-7xl sm:text-8xl font-bold text-slate-900 dark:text-white select-none transition-transform group-hover:scale-105">
                  {currentCard.hanzi}
                </span>
                
                {/* Badge: Stroke count & Radical */}
                <span className="absolute bottom-2 right-2 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {currentCard.strokes} • {currentCard.radical}
                </span>
                {/* Badge: Tone */}
                <span className="absolute top-2 left-2 text-[10px] font-semibold text-[#C8322B] dark:text-rose-300 bg-[#C8322B]/10 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-[#C8322B]/20">
                  {currentCard.tone}
                </span>
              </div>

              {/* Phonetics, Sino-Vietnamese & Translation */}
              <div className="flex-1 text-center sm:text-left space-y-3">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {currentCard.pinyin}
                  </span>
                  {/* Sino-Vietnamese Badge */}
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold tracking-wider uppercase">
                    <span>Âm Hán Việt: {currentCard.hanviet}</span>
                  </span>
                </div>

                {/* Vietnamese Gloss */}
                <p className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                  {currentCard.meaning}{" "}
                  <span className="text-slate-400 dark:text-slate-400 font-normal text-xs sm:text-sm">
                    ({currentCard.context})
                  </span>
                </p>

                {/* Pitch Trajectory Tone Curve */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
                    <span>Cao độ {currentCard.tone} ({currentCard.contourStart} ➔ {currentCard.contourEnd})</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Khớp chuẩn 98.4%
                    </span>
                  </div>
                  <div className="h-10 w-full bg-slate-50/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 p-1.5 flex items-center relative overflow-hidden">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 300 40" fill="none">
                      <path d="M 10 32 Q 120 30, 290 8" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="2" strokeDasharray="3 3" />
                      <path d="M 10 30 C 80 29, 160 25, 290 9" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="10" cy="30" r="3.5" fill="#059669" />
                      <circle cx="290" cy="9" r="4.5" fill="#059669" className="animate-glow" />
                    </svg>
                  </div>
                </div>

                {/* Real-life Example Sentence */}
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-2xl p-3 border border-white/80 dark:border-slate-700/60 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="font-serif text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {currentCard.sentenceZh}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400 dark:text-slate-400">
                        {currentCard.sentencePy}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {currentCard.sentenceVi}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakText(currentCard.sentenceZh)}
                      aria-label="Nghe câu mẫu"
                      className="p-1.5 text-slate-400 hover:text-[#C8322B] dark:hover:text-rose-400 shrink-0"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SM-2 Interactive Rating Buttons */}
          <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-400 mb-2">
              <span>Đánh giá mức độ nhớ (Thuật toán SM-2):</span>
              <span className="hidden sm:inline text-[11px] font-normal">
                Phím tắt: [1] đến [4]
              </span>
            </div>

            {srsFeedback ? (
              <div className="py-2.5 px-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center animate-fade-in">
                {srsFeedback}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. Quên */}
                <button
                  type="button"
                  onClick={() => handleSrsRating(1, "Quên")}
                  className="flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 hover:bg-rose-50 dark:hover:bg-rose-950/50 border-2 border-rose-200/80 dark:border-rose-900 text-rose-700 dark:text-rose-300 shadow-pill transition-all hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>Quên</span>
                    <kbd className="text-[9px] bg-rose-100 dark:bg-rose-900/60 px-1 rounded font-mono font-normal">1</kbd>
                  </div>
                  <span className="text-[10px] text-rose-500 font-medium mt-0.5">&lt; 10 phút</span>
                </button>

                {/* 2. Khó */}
                <button
                  type="button"
                  onClick={() => handleSrsRating(2, "Khó")}
                  className="flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 hover:bg-amber-50 dark:hover:bg-amber-950/50 border-2 border-amber-200/80 dark:border-amber-900 text-amber-700 dark:text-amber-300 shadow-pill transition-all hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>Khó</span>
                    <kbd className="text-[9px] bg-amber-100 dark:bg-amber-900/60 px-1 rounded font-mono font-normal">2</kbd>
                  </div>
                  <span className="text-[10px] text-amber-600 font-medium mt-0.5">1 ngày</span>
                </button>

                {/* 3. Tốt */}
                <button
                  type="button"
                  onClick={() => handleSrsRating(3, "Tốt")}
                  className="flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-2 border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-pill transition-all hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>Tốt</span>
                    <kbd className="text-[9px] bg-emerald-100 dark:bg-emerald-900/60 px-1 rounded font-mono font-normal">3</kbd>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium mt-0.5">3 ngày</span>
                </button>

                {/* 4. Dễ */}
                <button
                  type="button"
                  onClick={() => handleSrsRating(4, "Dễ")}
                  className="flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-500 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>Dễ</span>
                    <kbd className="text-[9px] bg-emerald-800 text-white px-1 rounded font-mono font-normal">4</kbd>
                  </div>
                  <span className="text-[10px] text-emerald-100 font-medium mt-0.5">7 ngày</span>
                </button>
              </div>
            )}
          </div>

        </section>

        {/* ============================================================ */}
        {/* TILE 2: AI PITCH VISUALIZER / SHADOWING (Span 5 cols, 1 row) */}
        {/* ============================================================ */}
        <section className="lg:col-span-5 glass-card rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Compass size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white">AI Pitch Visualizer</h2>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Bản xem trước
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">So sánh cao độ thời gian thực</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold border border-emerald-300 dark:border-emerald-700">
              <Sparkles size={13} />
              <span>{recordedScore ? `${recordedScore}% Chuẩn bản xứ` : "96% Chuẩn bản xứ"}</span>
            </div>
          </div>

          {/* Waveform Pitch Canvas */}
          <div className="my-3 bg-white/70 dark:bg-slate-800/70 rounded-2xl p-3 border border-white/80 dark:border-slate-700 shadow-inner">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1 rounded-full bg-slate-400" /> Bản xứ Đài Bắc
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1 rounded-full bg-[#C8322B]" /> Bạn phát âm
              </span>
            </div>

            <svg className="w-full h-16" viewBox="0 0 280 60" fill="none">
              <line x1="0" y1="15" x2="280" y2="15" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
              <line x1="0" y1="35" x2="280" y2="35" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
              <line x1="0" y1="50" x2="280" y2="50" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />

              <path d="M 10 48 Q 90 46, 150 32 T 270 12" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M 10 46 Q 95 44, 155 30 T 270 14" stroke="#C8322B" strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="155" cy="30" r="4" fill="#059669" className="animate-glow" />
              <circle cx="270" cy="14" r="4" fill="#059669" />
            </svg>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1 font-mono">
              <span>Bắt đầu (Tone 3)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Độ khớp: {recordedScore ? `${recordedScore}.2%` : "96.2%"}
              </span>
              <span>Đỉnh (Tone 5)</span>
            </div>
          </div>

          {/* Action Record Button */}
          <button
            type="button"
            onClick={handleToggleRecord}
            className="w-full py-2.5 px-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
              isRecording ? "bg-rose-600 text-white animate-pulse" : "bg-[#C8322B]/10 text-[#C8322B]"
            }`}>
              <Mic size={14} />
            </div>
            <span>{isRecording ? "Đang thu âm giọng bạn..." : "Nhấn để thu âm lại & kiểm tra âm điệu"}</span>
          </button>
        </section>

        {/* ============================================================ */}
        {/* TILE 3: STREAK HÀO QUANG (Span 2 cols, 1 row) */}
        {/* ============================================================ */}
        <section className="lg:col-span-2 glass-card rounded-3xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Streak</span>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                Demo
              </span>
            </div>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Kỷ lục!
            </span>
          </div>

          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/30 to-[#C8322B]/30 blur-lg rounded-full" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-[#C8322B] flex items-center justify-center shadow-lg shadow-amber-500/30 text-white font-black text-2xl">
                <Flame size={28} className="text-white" />
              </div>
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-2 tracking-tight">
              14 Ngày
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Liên tục ôn tập</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
            {["T2", "T3", "T4", "T5", "T6"].map((d) => (
              <div key={d} className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-bold shadow-sm">
                ✓
              </div>
            ))}
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[9px] font-bold animate-glow">
              🔥
            </div>
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 text-[9px] font-semibold">
              CN
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* TILE 4: CẦU NỐI TỪ VỰNG HÁN - VIỆT (Span 3 cols, 1 row) */}
        {/* ============================================================ */}
        <section className="lg:col-span-3 glass-card rounded-3xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-[#C8322B]" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-white">Cầu nối Hán - Việt</h3>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Cognate 92%
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl p-3 border border-white/90 dark:border-slate-700 shadow-sm my-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-1.5">
              <span className="font-serif text-base text-slate-900 dark:text-white">金融</span>
              <span className="text-slate-400 font-normal">Jīnróng</span>
              <span className="text-[#C8322B] dark:text-rose-400 font-bold">➔ Tài chính</span>
            </div>

            <div className="pt-2 text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span><strong>金 (Kim):</strong> Vàng, Tiền tệ</span>
                <span className="text-slate-400 text-[10px]">Tương đồng 100%</span>
              </div>
              <div className="flex items-center justify-between">
                <span><strong>融 (Dung):</strong> Hòa hợp, Lưu thông</span>
                <span className="text-slate-400 text-[10px]">Quy luật D ➔ R</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              <span>Độ nhạy chuyển âm Việt - Pinyin:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">92% Ghi nhớ</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full" style={{ width: "92%" }} />
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* TILE 5: RADAR NĂNG LỰC TOCFL A2 (Span 7 cols, 1 row) */}
        {/* ============================================================ */}
        <section className="lg:col-span-7 glass-card rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Compass size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Radar Năng lực TOCFL A2</h3>
                <p className="text-[11px] text-slate-400">Phân tích toàn diện 6 trục kỹ năng</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800 text-xs font-semibold text-amber-900 dark:text-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Đạt <strong>420 / 600</strong> từ vựng cốt lõi TOCFL A2 (70%)</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="bg-white/70 dark:bg-slate-800/70 p-2 rounded-xl border border-white/80 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px]">Từ vựng</span>
                <span className="font-bold text-slate-800 dark:text-white text-xs">88 / 100</span>
              </div>
              <div className="bg-white/70 dark:bg-slate-800/70 p-2 rounded-xl border border-white/80 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px]">Đọc hiểu</span>
                <span className="font-bold text-slate-800 dark:text-white text-xs">82 / 100</span>
              </div>
              <div className="bg-white/70 dark:bg-slate-800/70 p-2 rounded-xl border border-white/80 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px]">Nghe hiểu</span>
                <span className="font-bold text-slate-800 dark:text-white text-xs">76 / 100</span>
              </div>
            </div>
          </div>

          {/* 6-Axis SVG Radar Polygon */}
          <div className="w-56 h-48 relative flex items-center justify-center shrink-0">
            <svg className="w-full h-full" viewBox="0 0 200 200">
              <polygon points="100,20 169,60 169,140 100,180 31,140 31,60" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="1" />
              <polygon points="100,44 148,72 148,128 100,156 52,128 52,72" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
              <line x1="100" y1="100" x2="100" y2="20" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="1" />
              <line x1="100" y1="100" x2="169" y2="60" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="1" />
              <line x1="100" y1="100" x2="169" y2="140" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="1" />
              <line x1="100" y1="100" x2="100" y2="180" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="1" />
              <line x1="100" y1="100" x2="31" y2="140" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="1" />
              <line x1="100" y1="100" x2="31" y2="60" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="1" />

              <polygon
                points="100,29 156,66 152,130 100,156 55,126 45,68"
                fill="rgba(5, 150, 105, 0.22)"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <circle cx="100" cy="29" r="3.5" fill="#C8322B" />
              <circle cx="156" cy="66" r="3" fill="#059669" />
              <circle cx="152" cy="130" r="3" fill="#059669" />
              <circle cx="100" cy="156" r="3" fill="#059669" />
              <circle cx="55" cy="126" r="3" fill="#059669" />
              <circle cx="45" cy="68" r="3" fill="#059669" />

              <text x="100" y="14" fontSize="9" fontWeight="700" fill="currentColor" className="text-slate-700 dark:text-slate-300" textAnchor="middle">Từ vựng (88)</text>
              <text x="175" y="60" fontSize="9" fontWeight="600" fill="currentColor" className="text-slate-500 dark:text-slate-400" textAnchor="start">Đọc (82)</text>
              <text x="175" y="145" fontSize="9" fontWeight="600" fill="currentColor" className="text-slate-500 dark:text-slate-400" textAnchor="start">Nghe (76)</text>
              <text x="100" y="196" fontSize="9" fontWeight="600" fill="currentColor" className="text-slate-500 dark:text-slate-400" textAnchor="middle">Nói (70)</text>
              <text x="25" y="145" fontSize="9" fontWeight="600" fill="currentColor" className="text-slate-500 dark:text-slate-400" textAnchor="end">Viết (65)</text>
              <text x="25" y="60" fontSize="9" fontWeight="600" fill="currentColor" className="text-slate-500 dark:text-slate-400" textAnchor="end">Ngữ pháp (80)</text>
            </svg>
          </div>
        </section>

        {/* ============================================================ */}
        {/* TILE 6: BỘ THỦ CỦA NGÀY (Span 5 cols, 1 row) */}
        {/* ============================================================ */}
        <section className="lg:col-span-5 glass-card rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Bộ thủ của ngày</h3>
                <p className="text-[11px] text-slate-400">Chiết tự & Phát triển hệ từ gốc</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Bộ #193
            </span>
          </div>

          <div className="flex items-center gap-4 bg-white/70 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-white/80 dark:border-slate-700 shadow-sm my-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-800 dark:text-amber-300 font-serif text-3xl font-bold shadow-inner shrink-0">
              鬲
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm">Bộ Cách (鬲 - lì / gé)</span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-medium">10 nét</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Hình ảnh chiếc vạc/nồi đất cổ ba chân rỗng dùng để nấu tế lễ thời xưa.
              </p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mb-1.5">3 Chữ Hán phái sinh thường gặp:</p>
            <div className="grid grid-cols-3 gap-2">
              <div onClick={() => speakText("融")} className="bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-750 p-2 rounded-xl border border-white/90 dark:border-slate-700 shadow-sm text-center transition-all hover:scale-105 cursor-pointer">
                <span className="font-serif text-lg font-bold text-slate-900 dark:text-white block">融</span>
                <span className="text-[10px] text-[#C8322B] dark:text-rose-400 font-bold block">róng</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Dung (Hòa tan)</span>
              </div>
              <div onClick={() => speakText("鬹")} className="bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-750 p-2 rounded-xl border border-white/90 dark:border-slate-700 shadow-sm text-center transition-all hover:scale-105 cursor-pointer">
                <span className="font-serif text-lg font-bold text-slate-900 dark:text-white block">鬹</span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold block">guī</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Quy (Ấm rượu cổ)</span>
              </div>
              <div onClick={() => speakText("鬻")} className="bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-750 p-2 rounded-xl border border-white/90 dark:border-slate-700 shadow-sm text-center transition-all hover:scale-105 cursor-pointer">
                <span className="font-serif text-lg font-bold text-slate-900 dark:text-white block">鬻</span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold block">yù</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Dục (Nấu cháo)</span>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ============================================================== */}
      {/* TILE 7: BƯỚC TIẾP THEO & 4 FEATURE LINKS (PRESERVES SEMANTIC E2E HOOKS) */}
      {/* ============================================================== */}
      <div className="space-y-6 pt-2">
        {/* Real Summary Metrics Strip (With .zx-stats class for test compatibility) */}
        <div className="zx-stats glass-card rounded-2xl p-4 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-2 border-r border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 dark:text-slate-400">完成單元 / Hoàn thành</span>
            <strong className="block text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {summary?.completedUnits ?? 0}<small className="text-xs font-normal text-slate-400"> / 20</small>
            </strong>
          </div>
          <div className="p-2 md:border-r border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 dark:text-slate-400">Luyện phát âm</span>
            <strong className="block text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary?.speakingAttempts ?? 0}<small className="text-xs font-normal text-slate-400"> lượt</small>
            </strong>
          </div>
          <div className="p-2 border-r border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 dark:text-slate-400">Đối thoại AI</span>
            <strong className="block text-2xl sm:text-3xl font-extrabold text-[#C8322B] dark:text-rose-400 mt-0.5">
              {summary?.conversationTurns ?? 0}<small className="text-xs font-normal text-slate-400"> lượt</small>
            </strong>
          </div>
          <div className="p-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Luyện từ vựng</span>
            <strong className="block text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
              {summary?.textAttempts ?? 0}<small className="text-xs font-normal text-slate-400"> lần</small>
            </strong>
          </div>
        </div>

        {/* Recommended Next Lesson Card (With .zx-recommend class for test compatibility) */}
        <section className="zx-recommend glass-card rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>Bước tiếp theo / 下一步</span>
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {summary?.completedUnits === 20 ? "Hoàn thành 20 bài học! Hãy chọn bài để ôn tập" : `${unit.level} · ${unit.title}`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {unit.vi}
            </p>
            <small className="text-[11px] text-slate-400 dark:text-slate-400 block pt-0.5">
              Gợi ý tuần tự theo giáo trình chuẩn A1–A2 Đài Loan.
            </small>
          </div>
          <Link
            href={`/vocabulary?unit=${unit.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#C8322B] hover:bg-red-700 text-white font-bold text-xs shrink-0 shadow-md shadow-red-700/20 transition-all hover:scale-[1.02]"
          >
            <span>Bắt đầu học →</span>
          </Link>
        </section>

        {/* 4 Feature Cards (With .zx-feature-links class for test compatibility) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Phân hệ học tập cốt lõi</h3>
            <span className="text-xs text-slate-400">4 module chuyên sâu</span>
          </div>

          <div className="zx-feature-links grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                num: "01",
                title: "Từ vựng & Ngữ pháp",
                desc: "20 bài sinh hoạt Đài Loan chuẩn Phồn thể",
                url: "/vocabulary",
                icon: BookOpen,
                color: "text-[#C8322B]",
              },
              {
                num: "02",
                title: "Luyện phát âm",
                desc: "Đọc mẫu, thu âm và đối chiếu Levenshtein",
                url: "/speaking",
                icon: Mic,
                color: "text-emerald-600",
              },
              {
                num: "03",
                title: "AI Đối thoại",
                desc: "Kịch bản chợ đêm, tàu điện MRT Đài Bắc",
                url: "/conversation",
                icon: MessagesSquare,
                color: "text-amber-600",
              },
              {
                num: "04",
                title: "Hồ sơ tiến độ",
                desc: "Lục giác năng lực và lịch sử học tập",
                url: "/progress",
                icon: ChartNoAxesCombined,
                color: "text-indigo-600",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <Link
                  key={f.num}
                  href={f.url}
                  className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:scale-[1.02] transition-all group"
                  style={{ backgroundColor: "var(--zx-card)" }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-[#C8322B] transition-colors">
                        {f.num}
                      </span>
                      <Icon size={18} className={`${f.color} opacity-80 group-hover:opacity-100`} />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#C8322B] dark:group-hover:text-rose-400 transition-colors">
                      {f.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {f.desc}
                    </p>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-[#C8322B] dark:text-rose-400">
                    <span>Bắt đầu</span>
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* BOTTOM CONTEXTUAL STATUS / MASCOT XIAO LONG TIP BAR */}
      {/* ============================================================== */}
      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-[#C8322B] flex items-center justify-center text-white shadow-md shadow-red-500/20 shrink-0 select-none text-lg">
            🐉
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Mẹo của linh thú Tiểu Long:{" "}
              <span className="font-normal text-slate-600 dark:text-slate-400">
                Âm Hán Việt &ldquo;DUNG&rdquo; (融) trong tiếng Việt thường chuyển dịch từ vận &ldquo;-ong&rdquo; của Pinyin. Hãy liên tưởng đến từ ghép &ldquo;Tài chính - Kim Dung&rdquo;!
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 shrink-0">
          <span>Đã đồng bộ dữ liệu</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

    </div>
  );
}
