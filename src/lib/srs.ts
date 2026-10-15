import type { Card, Rating, WordStatus } from "./types";
import { clamp } from "./utils";

/**
 * Simplified SM-2 spaced repetition scheduler.
 * Ratings: 0 = again, 1 = hard, 2 = good, 3 = easy
 */
export function scheduleCard(
  card: Card | null,
  rating: Rating,
  now: Date = new Date()
) {
  let ef = card?.easeFactor ?? 2.5;
  let reps = card?.repetitions ?? 0;
  let interval = card?.intervalDays ?? 0;

  const addMinutes = (m: number) =>
    new Date(now.getTime() + m * 60_000);
  const addDays = (d: number) =>
    new Date(now.getTime() + d * 86_400_000);

  let dueAt: Date;

  switch (rating) {
    case 0: // again — reset, review again in 10 minutes
      ef = clamp(ef - 0.2, 1.3, 2.5);
      reps = 0;
      interval = 0;
      dueAt = addMinutes(10);
      break;
    case 1: // hard — smaller interval growth
      ef = clamp(ef - 0.15, 1.3, 2.5);
      interval = interval === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
      reps = Math.max(1, reps);
      dueAt = addDays(interval);
      break;
    case 2: // good
      reps += 1;
      interval =
        reps === 1 ? 1 : reps === 2 ? 3 : Math.max(3, Math.round(interval * ef));
      dueAt = addDays(interval);
      break;
    case 3: // easy — bigger jump
      ef = clamp(ef + 0.15, 1.3, 2.5);
      reps += 1;
      interval =
        reps <= 1
          ? 4
          : reps === 2
            ? 7
            : Math.max(7, Math.round(interval * ef * 1.3));
      dueAt = addDays(interval);
      break;
  }

  return { repetitions: reps, intervalDays: interval, easeFactor: ef, dueAt };
}

export function statusFor(card: Card | null): WordStatus {
  if (!card) return "new";
  return card.intervalDays >= 21 ? "mastered" : "learning";
}

export const RATING_LABELS: Record<Rating, string> = {
  0: "again",
  1: "hard",
  2: "good",
  3: "easy",
};
