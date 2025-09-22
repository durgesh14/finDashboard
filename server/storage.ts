import { type User, type InsertUser, type Investment, type InsertInvestment, type Transaction, type InsertTransaction, type Bill, type InsertBill, type BillPayment, type InsertBillPayment } from "@shared/schema";
import { randomUUID } from "crypto";
import { calculateNextBillDueDate, formatDateForStorage } from "./date-utils";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Investment methods
  getInvestments(userId: string): Promise<Investment[]>;
  getInvestment(id: string): Promise<Investment | undefined>;
  createInvestment(userId: string, investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: string, investment: Partial<InsertInvestment>): Promise<Investment | undefined>;
  deleteInvestment(id: string): Promise<boolean>;

  // Transaction methods
  getTransactions(investmentId: string): Promise<Transaction[]>;
  getAllTransactionsForUser(userId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  deleteTransaction(id: string): Promise<boolean>;

  // Bill methods
  getBills(userId: string): Promise<Bill[]>;
  getBill(id: string): Promise<Bill | undefined>;
  createBill(userId: string, bill: InsertBill): Promise<Bill>;
  updateBill(id: string, bill: Partial<InsertBill>): Promise<Bill | undefined>;
  deleteBill(id: string): Promise<boolean>;

  // Bill payment methods
  getBillPayments(billId: string): Promise<BillPayment[]>;
  createBillPayment(payment: InsertBillPayment): Promise<BillPayment>;
  updateBillPayment(id: string, payment: Partial<InsertBillPayment>): Promise<BillPayment | undefined>;
  deleteBillPayment(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private investments: Map<string, Investment>;
  private transactions: Map<string, Transaction>;
  private bills: Map<string, Bill>;
  private billPayments: Map<string, BillPayment>;

  constructor() {
    this.users = new Map();
    this.investments = new Map();
    this.transactions = new Map();
    this.bills = new Map();
    this.billPayments = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getInvestments(userId: string): Promise<Investment[]> {
    return Array.from(this.investments.values()).filter(
      (investment) => investment.userId === userId
    );
  }

  async getInvestment(id: string): Promise<Investment | undefined> {
    return this.investments.get(id);
  }

  async createInvestment(userId: string, insertInvestment: InsertInvestment): Promise<Investment> {
    const id = randomUUID();
    const now = new Date();
    const investment: Investment = { 
      ...insertInvestment,
      dueDay: insertInvestment.dueDay ?? null,
      maturityDate: insertInvestment.maturityDate ?? null,
      expectedReturn: insertInvestment.expectedReturn ?? null,
      notes: insertInvestment.notes ?? null,
      id, 
      userId,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    this.investments.set(id, investment);
    return investment;
  }

  async updateInvestment(id: string, updateData: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const investment = this.investments.get(id);
    if (!investment) return undefined;

    const updatedInvestment: Investment = {
      ...investment,
      ...updateData,
      updatedAt: new Date()
    };
    this.investments.set(id, updatedInvestment);
    return updatedInvestment;
  }

  async deleteInvestment(id: string): Promise<boolean> {
    return this.investments.delete(id);
  }

  async getTransactions(investmentId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.investmentId === investmentId
    );
  }

  async getAllTransactionsForUser(userId: string): Promise<Transaction[]> {
    const userInvestments = await this.getInvestments(userId);
    const investmentIds = new Set(userInvestments.map(inv => inv.id));
    
    return Array.from(this.transactions.values()).filter(
      (transaction) => investmentIds.has(transaction.investmentId)
    );
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      notes: insertTransaction.notes ?? null,
      id,
      createdAt: new Date()
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    return this.transactions.delete(id);
  }

  async getBills(userId: string): Promise<Bill[]> {
    return Array.from(this.bills.values()).filter(
      (bill) => bill.userId === userId
    );
  }

  async getBill(id: string): Promise<Bill | undefined> {
    return this.bills.get(id);
  }

  async createBill(userId: string, insertBill: InsertBill): Promise<Bill> {
    const id = randomUUID();
    const now = new Date();
    const bill: Bill = { 
      ...insertBill,
      dueDay: insertBill.dueDay ?? null,
      nextDueDate: insertBill.nextDueDate ?? null,
      lastPaidDate: null, // Initialize as null
      description: insertBill.description ?? null,
      vendor: insertBill.vendor ?? null,
      reminderDays: insertBill.reminderDays ?? 3,
      id, 
      userId,
      isActive: true,
      isRecurring: insertBill.isRecurring ?? true,
      createdAt: now,
      updatedAt: now
    };
    this.bills.set(id, bill);
    return bill;
  }

  async updateBill(id: string, updateData: Partial<InsertBill>): Promise<Bill | undefined> {
    const bill = this.bills.get(id);
    if (!bill) return undefined;

    const updatedBill: Bill = {
      ...bill,
      ...updateData,
      updatedAt: new Date()
    };
    this.bills.set(id, updatedBill);
    return updatedBill;
  }

  async deleteBill(id: string): Promise<boolean> {
    return this.bills.delete(id);
  }

  async getBillPayments(billId: string): Promise<BillPayment[]> {
    return Array.from(this.billPayments.values()).filter(
      (payment) => payment.billId === billId
    );
  }

  async createBillPayment(insertPayment: InsertBillPayment): Promise<BillPayment> {
    const id = randomUUID();
    const effectiveStatus = insertPayment.status ?? "paid";
    const payment: BillPayment = {
      ...insertPayment,
      amount: insertPayment.amount.toString(), // Convert to string for database storage
      notes: insertPayment.notes ?? null,
      status: effectiveStatus,
      id,
      createdAt: new Date()
    };
    this.billPayments.set(id, payment);

    // Update bill state after successful payment recording
    if (effectiveStatus === "paid") {
      await this.updateBillAfterPayment(insertPayment.billId, insertPayment.paidDate, insertPayment.dueDate);
    }

    return payment;
  }

  // deleteBillPayment is now implemented above with proper state management

  // Helper method to update bill state after payment
  private async updateBillAfterPayment(billId: string, paidDate: string, dueDate: string): Promise<void> {
    const bill = await this.getBill(billId);
    if (!bill || !bill.isActive || bill.frequency === "one_time") {
      return;
    }

    // Calculate next due date based on the due date that was paid, not when it was paid
    const dayAfterDue = new Date(dueDate);
    dayAfterDue.setDate(dayAfterDue.getDate() + 1); // Start from day after due date
    
    const nextDueDate = calculateNextBillDueDate(bill, dayAfterDue);
    const updates: Partial<InsertBill> = {};
    
    if (nextDueDate) {
      updates.nextDueDate = formatDateForStorage(nextDueDate);
    }
    
    // Update lastPaidDate
    updates.lastPaidDate = paidDate;
    
    if (Object.keys(updates).length > 0) {
      await this.updateBill(billId, updates);
    }
  }

  async updateBillPayment(id: string, updateData: Partial<InsertBillPayment>): Promise<BillPayment | undefined> {
    const payment = this.billPayments.get(id);
    if (!payment) return undefined;

    const oldStatus = payment.status;
    const updatedPayment: BillPayment = {
      ...payment,
      ...updateData,
      // Ensure amount is converted to string if provided
      amount: updateData.amount !== undefined ? updateData.amount.toString() : payment.amount,
    };
    this.billPayments.set(id, updatedPayment);

    // Handle status changes for bill state management
    if (oldStatus === "paid" && updateData.status && updateData.status !== "paid") {
      // Payment was paid but now changed to something else - recompute bill state
      await this.recomputeBillStateAfterPaymentDeletion(payment.billId);
    } else if (oldStatus !== "paid" && updateData.status === "paid") {
      // Payment status changed to paid - update bill state
      await this.updateBillAfterPayment(payment.billId, payment.paidDate, payment.dueDate);
    }

    return updatedPayment;
  }

  async deleteBillPayment(id: string): Promise<boolean> {
    const payment = this.billPayments.get(id);
    const deleted = this.billPayments.delete(id);
    
    // Recompute bill state after payment deletion
    if (deleted && payment && payment.status === "paid") {
      await this.recomputeBillStateAfterPaymentDeletion(payment.billId);
    }
    
    return deleted;
  }

  // Recompute bill state after payment deletion by looking at remaining payments
  private async recomputeBillStateAfterPaymentDeletion(billId: string): Promise<void> {
    const bill = await this.getBill(billId);
    if (!bill || !bill.isActive || bill.frequency === "one_time") {
      return;
    }

    const remainingPayments = await this.getBillPayments(billId);
    const paidPayments = remainingPayments.filter(p => p.status === "paid");
    
    if (paidPayments.length > 0) {
      // Find the latest payment by due date and recalculate from there
      const latestPayment = paidPayments.sort((a, b) => 
        new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      )[0];
      
      // Calculate next due date from the latest payment's due date
      const dayAfterLatestDue = new Date(latestPayment.dueDate);
      dayAfterLatestDue.setDate(dayAfterLatestDue.getDate() + 1);
      
      const nextDueDate = calculateNextBillDueDate(bill, dayAfterLatestDue);
      if (nextDueDate) {
        await this.updateBill(billId, {
          nextDueDate: formatDateForStorage(nextDueDate),
          lastPaidDate: latestPayment.paidDate
        });
      }
    } else {
      // No payments left, reset to original schedule from today
      const nextDueDate = calculateNextBillDueDate(bill, new Date());
      if (nextDueDate) {
        await this.updateBill(billId, {
          nextDueDate: formatDateForStorage(nextDueDate),
          lastPaidDate: null // Clear last paid date
        });
      }
    }
  }
}

export const storage = new MemStorage();
