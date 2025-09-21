import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, date, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const investments = pgTable("investments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'mutual_fund', 'fixed_deposit', 'recurring_deposit', 'lic', 'ppf', 'stocks', 'other'
  principalAmount: decimal("principal_amount", { precision: 15, scale: 2 }).notNull(),
  startDate: date("start_date").notNull(),
  paymentFrequency: text("payment_frequency").notNull(), // 'monthly', 'quarterly', 'yearly', 'one_time'
  dueDay: integer("due_day"), // 1-31, null for one-time
  maturityDate: date("maturity_date"),
  expectedReturn: decimal("expected_return", { precision: 5, scale: 2 }), // percentage
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investmentId: varchar("investment_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  transactionDate: date("transaction_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Investment = typeof investments.$inferSelect;
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
