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
  paymentAmount: decimal("payment_amount", { precision: 15, scale: 2 }), // Individual payment amount based on frequency
  startDate: date("start_date").notNull(),
  paymentFrequency: text("payment_frequency").notNull(), // 'monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'
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

export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'utilities', 'subscriptions', 'insurance', 'loans', 'groceries', 'transport', 'healthcare', 'entertainment', 'other'
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  frequency: text("frequency").notNull(), // 'monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'
  dueDay: integer("due_day"), // 1-31, null for one-time
  nextDueDate: date("next_due_date"),
  lastPaidDate: date("last_paid_date"), // track when bill was last paid
  description: text("description"),
  vendor: text("vendor"), // company/service provider
  isActive: boolean("is_active").default(true).notNull(),
  isRecurring: boolean("is_recurring").default(true).notNull(),
  reminderDays: integer("reminder_days").default(3), // days before due date to remind
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const billPayments = pgTable("bill_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  billId: varchar("bill_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paidDate: date("paid_date").notNull(),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default("paid"), // 'paid', 'overdue', 'cancelled'
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
}).extend({
  paymentFrequency: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time']),
  paymentAmount: z.coerce.number().positive("Payment amount must be positive").optional(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBillPaymentSchema = createInsertSchema(billPayments).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.coerce.number().positive("Amount must be positive"),
  paidDate: z.string().min(1, "Paid date is required"),
  dueDate: z.string().min(1, "Due date is required"),
});

// Custom Investment Types table
export const investmentTypes = pgTable("investment_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Custom Bill Categories table
export const billCategories = pgTable("bill_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvestmentTypeSchema = createInsertSchema(investmentTypes).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertBillCategorySchema = createInsertSchema(billCategories).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Investment = typeof investments.$inferSelect;
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type BillPayment = typeof billPayments.$inferSelect;
export type InsertBillPayment = z.infer<typeof insertBillPaymentSchema>;
export type InvestmentType = typeof investmentTypes.$inferSelect;
export type InsertInvestmentType = z.infer<typeof insertInvestmentTypeSchema>;
export type BillCategory = typeof billCategories.$inferSelect;
export type InsertBillCategory = z.infer<typeof insertBillCategorySchema>;
