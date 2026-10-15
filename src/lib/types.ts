import type {
  users,
  words,
  sentences,
  cards,
  reviewLogs,
  quizAttempts,
} from "@/db/schema";

export type User = typeof users.$inferSelect;
export type Word = typeof words.$inferSelect;
export type Sentence = typeof sentences.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type ReviewLog = typeof reviewLogs.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;

export type SessionUser = { id: number; name: string; email: string };

export type WordStatus = "new" | "learning" | "mastered";

export interface WordWithCard extends Word {
  card: Card | null;
  status: WordStatus;
  sentenceCount: number;
  sentences?: Sentence[];
}

export type Rating = 0 | 1 | 2 | 3;

export interface DueItem {
  word: Word;
  card: Card | null;
  sentences: Sentence[];
}

export interface DueResponse {
  items: DueItem[];
  counts: { due: number; new: number };
}

export type QuizQuestionType =
  | "hanzi_to_meaning"
  | "meaning_to_hanzi"
  | "pinyin_to_hanzi"
  | "audio_to_meaning";

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: { hanzi: string; pinyin: string; translation: string };
  options: string[];
  answer: number;
}

export interface DailyPoint {
  date: string;
  label: string;
  count: number;
  correct: number;
}

export interface WordStats {
  word: Word;
  reviews: number;
  correct: number;
  accuracy: number;
}

export interface StatsPayload {
  wordsTotal: number;
  wordsNew: number;
  wordsLearning: number;
  wordsMastered: number;
  dueCards: number;
  newWordsAvailable: number;
  reviewsToday: number;
  dailyGoal: number;
  streak: number;
  longestStreak: number;
  totalReviews: number;
  accuracy: number;
  daily: DailyPoint[];
  learnedSeries: { date: string; label: string; total: number }[];
  hsk: { level: number; count: number }[];
  recentWords: WordWithCard[];
  struggling: WordStats[];
  strongest: WordStats[];
  quizAttempts: QuizAttempt[];
}

export interface WordDetail {
  word: WordWithCard;
  sentences: Sentence[];
  stats: { reviews: number; correct: number; accuracy: number };
}

export interface SentenceWithWord extends Sentence {
  word: {
    id: number;
    hanzi: string;
    pinyin: string;
    translation: string;
    hskLevel: number;
  };
}
