import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
  doublePrecision,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

export const words = pgTable(
  "words",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    hanzi: text("hanzi").notNull(),
    pinyin: text("pinyin").notNull(),
    translation: text("translation").notNull(),
    partOfSpeech: text("part_of_speech").notNull().default("noun"),
    hskLevel: integer("hsk_level").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("words_user_idx").on(t.userId)]
);

export const sentences = pgTable(
  "sentences",
  {
    id: serial("id").primaryKey(),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chinese: text("chinese").notNull(),
    pinyin: text("pinyin").notNull().default(""),
    english: text("english").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("sentences_word_idx").on(t.wordId)]
);

export const cards = pgTable(
  "cards",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    repetitions: integer("repetitions").notNull().default(0),
    intervalDays: doublePrecision("interval_days").notNull().default(0),
    easeFactor: doublePrecision("ease_factor").notNull().default(2.5),
    dueAt: timestamp("due_at", { withTimezone: true }),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("cards_user_word_idx").on(t.userId, t.wordId),
    index("cards_due_idx").on(t.userId, t.dueAt),
  ]
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    intervalDays: doublePrecision("interval_days").notNull().default(0),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("review_logs_user_time_idx").on(t.userId, t.reviewedAt),
    index("review_logs_word_idx").on(t.wordId),
  ]
);

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scope: text("scope").notNull().default("all"),
  total: integer("total").notNull(),
  correct: integer("correct").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const learningActivities = pgTable("learning_activities", {
 id:serial("id").primaryKey(),
 userId:integer("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 unitId:integer("unit_id").notNull(),kind:text("kind").notNull(),score:integer("score").notNull(),
 createdAt:timestamp("created_at",{withTimezone:true}).defaultNow().notNull(),
});

export const dictionaryBookmarks=pgTable("dictionary_bookmarks",{
 id:serial("id").primaryKey(),userId:integer("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 entryId:text("entry_id").notNull(),createdAt:timestamp("created_at",{withTimezone:true}).defaultNow().notNull(),
},t=>[uniqueIndex("dictionary_bookmarks_user_entry_idx").on(t.userId,t.entryId)]);
export const dictionaryHistory=pgTable("dictionary_history",{
 id:serial("id").primaryKey(),userId:integer("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 entryId:text("entry_id").notNull(),updatedAt:timestamp("updated_at",{withTimezone:true}).defaultNow().notNull(),
},t=>[uniqueIndex("dictionary_history_user_entry_idx").on(t.userId,t.entryId)]);

export const conversationThreads=pgTable('conversation_threads',{
 id:serial('id').primaryKey(),userId:integer('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
 unitId:integer('unit_id').notNull(),mode:text('mode').notNull(),
 messages:jsonb('messages').$type<{role:'user'|'assistant';content:string}[]>().notNull().default([]),
 version:integer('version').notNull().default(0),
 updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[index('conversation_threads_user_unit_idx').on(t.userId,t.unitId,t.updatedAt)]);
