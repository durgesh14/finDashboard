import { type User, type InsertUser, type Investment, type InsertInvestment, type Transaction, type InsertTransaction, type Bill, type InsertBill, type BillPayment, type InsertBillPayment } from "@shared/schema";
import { randomUUID } from "crypto";

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
    const payment: BillPayment = {
      ...insertPayment,
      notes: insertPayment.notes ?? null,
      status: insertPayment.status ?? "paid",
      id,
      createdAt: new Date()
    };
    this.billPayments.set(id, payment);
    return payment;
  }

  async deleteBillPayment(id: string): Promise<boolean> {
    return this.billPayments.delete(id);
  }
}

export const storage = new MemStorage();
