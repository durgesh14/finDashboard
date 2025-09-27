import { type User, type InsertUser, type Investment, type InsertInvestment, type Transaction, type InsertTransaction, type Bill, type InsertBill, type BillPayment, type InsertBillPayment, type InvestmentType, type InsertInvestmentType, type BillCategory, type InsertBillCategory } from "@shared/schema";
import { randomUUID } from "crypto";
import { calculateNextBillDueDate, formatDateForStorage } from "./date-utils";
import session from "express-session";
import createMemoryStore from "memorystore";

export interface IStorage {
  sessionStore: session.Store;
  
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

  // Custom Investment Types methods
  getInvestmentTypes(userId: string): Promise<InvestmentType[]>;
  createInvestmentType(userId: string, type: InsertInvestmentType): Promise<InvestmentType>;
  updateInvestmentType(id: string, type: Partial<InsertInvestmentType>): Promise<InvestmentType | undefined>;
  deleteInvestmentType(id: string): Promise<boolean>;

  // Custom Bill Categories methods
  getBillCategories(userId: string): Promise<BillCategory[]>;
  createBillCategory(userId: string, category: InsertBillCategory): Promise<BillCategory>;
  updateBillCategory(id: string, category: Partial<InsertBillCategory>): Promise<BillCategory | undefined>;
  deleteBillCategory(id: string): Promise<boolean>;

  // Data export/import methods
  exportAllData(userId: string): Promise<any>;
  importAllData(userId: string, data: any): Promise<boolean>;
}

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  sessionStore: session.Store;
  private users: Map<string, User>;
  private investments: Map<string, Investment>;
  private transactions: Map<string, Transaction>;
  private bills: Map<string, Bill>;
  private billPayments: Map<string, BillPayment>;
  private investmentTypes: Map<string, InvestmentType>;
  private billCategories: Map<string, BillCategory>;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    this.users = new Map();
    this.investments = new Map();
    this.transactions = new Map();
    this.bills = new Map();
    this.billPayments = new Map();
    this.investmentTypes = new Map();
    this.billCategories = new Map();
    this.initializeDefaultTypes();
  }

  // Initialize default investment types and bill categories
  private async initializeDefaultTypes(): Promise<void> {
    const defaultInvestmentTypes = [
      { name: "Mutual Fund", isDefault: true },
      { name: "Fixed Deposit", isDefault: true },
      { name: "Recurring Deposit", isDefault: true },
      { name: "LIC/Insurance", isDefault: true },
      { name: "PPF", isDefault: true },
      { name: "Stocks", isDefault: true },
      { name: "Other", isDefault: true }
    ];

    const defaultBillCategories = [
      { name: "Utilities", isDefault: true },
      { name: "Subscriptions", isDefault: true },
      { name: "Insurance", isDefault: true },
      { name: "Loans", isDefault: true },
      { name: "Groceries", isDefault: true },
      { name: "Transport", isDefault: true },
      { name: "Healthcare", isDefault: true },
      { name: "Entertainment", isDefault: true },
      { name: "Other", isDefault: true }
    ];

    const defaultUserId = "demo-user";

    for (const type of defaultInvestmentTypes) {
      await this.createInvestmentType(defaultUserId, type);
    }

    for (const category of defaultBillCategories) {
      await this.createBillCategory(defaultUserId, category);
    }
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
      paymentAmount: insertInvestment.paymentAmount ? insertInvestment.paymentAmount.toString() : null,
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
      paymentAmount: updateData.paymentAmount ? updateData.paymentAmount.toString() : investment.paymentAmount,
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

  // Investment Types methods
  async getInvestmentTypes(userId: string): Promise<InvestmentType[]> {
    return Array.from(this.investmentTypes.values()).filter(
      (type) => type.userId === userId
    );
  }

  async createInvestmentType(userId: string, insertType: InsertInvestmentType): Promise<InvestmentType> {
    const id = randomUUID();
    const type: InvestmentType = {
      ...insertType,
      id,
      userId,
      isDefault: insertType.isDefault ?? false,
      createdAt: new Date()
    };
    this.investmentTypes.set(id, type);
    return type;
  }

  async updateInvestmentType(id: string, updateData: Partial<InsertInvestmentType>): Promise<InvestmentType | undefined> {
    const type = this.investmentTypes.get(id);
    if (!type) return undefined;

    const updatedType: InvestmentType = {
      ...type,
      ...updateData
    };
    this.investmentTypes.set(id, updatedType);
    return updatedType;
  }

  async deleteInvestmentType(id: string): Promise<boolean> {
    return this.investmentTypes.delete(id);
  }

  // Bill Categories methods
  async getBillCategories(userId: string): Promise<BillCategory[]> {
    return Array.from(this.billCategories.values()).filter(
      (category) => category.userId === userId
    );
  }

  async createBillCategory(userId: string, insertCategory: InsertBillCategory): Promise<BillCategory> {
    const id = randomUUID();
    const category: BillCategory = {
      ...insertCategory,
      id,
      userId,
      isDefault: insertCategory.isDefault ?? false,
      createdAt: new Date()
    };
    this.billCategories.set(id, category);
    return category;
  }

  async updateBillCategory(id: string, updateData: Partial<InsertBillCategory>): Promise<BillCategory | undefined> {
    const category = this.billCategories.get(id);
    if (!category) return undefined;

    const updatedCategory: BillCategory = {
      ...category,
      ...updateData
    };
    this.billCategories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteBillCategory(id: string): Promise<boolean> {
    return this.billCategories.delete(id);
  }

  // Data export/import methods
  async exportAllData(userId: string): Promise<any> {
    const [investments, bills, billPayments, investmentTypes, billCategories, transactions] = await Promise.all([
      this.getInvestments(userId),
      this.getBills(userId),
      Promise.all((await this.getBills(userId)).map(bill => this.getBillPayments(bill.id))).then(results => results.flat()),
      this.getInvestmentTypes(userId),
      this.getBillCategories(userId),
      this.getAllTransactionsForUser(userId)
    ]);

    return {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      data: {
        investments,
        bills,
        billPayments,
        investmentTypes: investmentTypes.filter(type => !type.isDefault),
        billCategories: billCategories.filter(category => !category.isDefault),
        transactions
      }
    };
  }

  async importAllData(userId: string, importData: any): Promise<boolean> {
    try {
      const data = importData.data;
      
      // Import custom investment types
      if (data.investmentTypes) {
        for (const type of data.investmentTypes) {
          await this.createInvestmentType(userId, {
            name: type.name,
            isDefault: false
          });
        }
      }

      // Import custom bill categories  
      if (data.billCategories) {
        for (const category of data.billCategories) {
          await this.createBillCategory(userId, {
            name: category.name,
            isDefault: false
          });
        }
      }

      // Import investments
      if (data.investments) {
        for (const investment of data.investments) {
          const { id, userId: _, createdAt, updatedAt, ...insertData } = investment;
          await this.createInvestment(userId, insertData);
        }
      }

      // Import bills
      if (data.bills) {
        for (const bill of data.bills) {
          const { id, userId: _, createdAt, updatedAt, ...insertData } = bill;
          await this.createBill(userId, insertData);
        }
      }

      // Import transactions
      if (data.transactions) {
        for (const transaction of data.transactions) {
          const { id, createdAt, ...insertData } = transaction;
          await this.createTransaction(insertData);
        }
      }

      // Import bill payments
      if (data.billPayments) {
        for (const payment of data.billPayments) {
          const { id, createdAt, ...insertData } = payment;
          await this.createBillPayment(insertData);
        }
      }

      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }
}

import { MongoStorage } from "./mongodb-storage";

// Initialize MongoDB connection and return appropriate storage
export const initializeStorage = async (): Promise<IStorage> => {
  try {
    const mongoStorage = new MongoStorage();
    await mongoStorage.connect();
    console.log('Successfully connected to MongoDB Atlas');
    return mongoStorage;
  } catch (error) {
    console.error('Failed to connect to MongoDB, falling back to memory storage:', error);
    return new MemStorage();
  }
};

// Default storage instance (will be replaced with initialized storage)
export let storage: IStorage = new MemStorage();

// Function to replace the storage instance
export const setStorage = (newStorage: IStorage) => {
  storage = newStorage;
};
