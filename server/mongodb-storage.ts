import { MongoClient, Db, Collection } from "mongodb";
import {
  type User,
  type InsertUser,
  type Investment,
  type InsertInvestment,
  type Transaction,
  type InsertTransaction,
  type Bill,
  type InsertBill,
  type BillPayment,
  type InsertBillPayment,
  type InvestmentType,
  type InsertInvestmentType,
  type BillCategory,
  type InsertBillCategory,
} from "@shared/schema";
import { IStorage } from "./storage";
import { calculateNextBillDueDate, formatDateForStorage } from "./date-utils";
import session from "express-session";
import createMemoryStore from "memorystore";
import dotenv from "dotenv";
dotenv.config();
const MemoryStore = createMemoryStore(session);

export class MongoStorage implements IStorage {
  sessionStore: session.Store;
  private client: MongoClient;
  private db: Db;
  private users: Collection<User>;
  private investments: Collection<Investment>;
  private transactions: Collection<Transaction>;
  private bills: Collection<Bill>;
  private billPayments: Collection<BillPayment>;
  private investmentTypes: Collection<InvestmentType>;
  private billCategories: Collection<BillCategory>;

  constructor() {
    // For now, use memory store for sessions even with MongoDB
    // In production, you could use connect-pg-simple or connect-mongo for persistent sessions
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    const connectionString = process.env.MONGODB_URI || "";

    this.client = new MongoClient(connectionString, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    this.db = this.client.db(process.env.MONGODB_DB_NAME || "findashboardDB");

    // Initialize collections
    this.users = this.db.collection<User>("users");
    this.investments = this.db.collection<Investment>("investments");
    this.transactions = this.db.collection<Transaction>("transactions");
    this.bills = this.db.collection<Bill>("bills");
    this.billPayments = this.db.collection<BillPayment>("billPayments");
    this.investmentTypes =
      this.db.collection<InvestmentType>("investmentTypes");
    this.billCategories = this.db.collection<BillCategory>("billCategories");
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log("Connected to MongoDB Atlas");
      await this.initializeDefaultTypes();
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  private async initializeDefaultTypes(): Promise<void> {
    try {
      const defaultUserId = "demo-user";

      // Check if default types already exist
      const existingTypes = await this.investmentTypes.countDocuments({
        userId: defaultUserId,
        isDefault: true,
      });
      const existingCategories = await this.billCategories.countDocuments({
        userId: defaultUserId,
        isDefault: true,
      });

      if (existingTypes === 0) {
        const defaultInvestmentTypes = [
          { name: "Mutual Fund", isDefault: true },
          { name: "Fixed Deposit", isDefault: true },
          { name: "Recurring Deposit", isDefault: true },
          { name: "LIC/Insurance", isDefault: true },
          { name: "PPF", isDefault: true },
          { name: "Stocks", isDefault: true },
          { name: "Other", isDefault: true },
        ];

        for (const type of defaultInvestmentTypes) {
          await this.createInvestmentType(defaultUserId, type);
        }
      }

      if (existingCategories === 0) {
        const defaultBillCategories = [
          { name: "Utilities", isDefault: true },
          { name: "Subscriptions", isDefault: true },
          { name: "Insurance", isDefault: true },
          { name: "Loans", isDefault: true },
          { name: "Groceries", isDefault: true },
          { name: "Transport", isDefault: true },
          { name: "Healthcare", isDefault: true },
          { name: "Entertainment", isDefault: true },
          { name: "Other", isDefault: true },
        ];

        for (const category of defaultBillCategories) {
          await this.createBillCategory(defaultUserId, category);
        }
      }
    } catch (error) {
      console.error("Failed to initialize default types:", error);
    }
  }

  private generateId(): string {
    return (
      new Date().getTime().toString(36) + Math.random().toString(36).substr(2)
    );
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const user = await this.users.findOne({ id });
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await this.users.findOne({ username });
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.generateId(),
    };
    await this.users.insertOne(user);
    return user;
  }

  // Investment methods
  async getInvestments(userId: string): Promise<Investment[]> {
    return await this.investments.find({ userId }).toArray();
  }

  async getInvestment(id: string): Promise<Investment | undefined> {
    const investment = await this.investments.findOne({ id });
    return investment || undefined;
  }

  async createInvestment(
    userId: string,
    insertInvestment: InsertInvestment
  ): Promise<Investment> {
    const now = new Date();
    const investment: Investment = {
      ...insertInvestment,
      id: this.generateId(),
      userId,
      dueDay: insertInvestment.dueDay ?? null,
      maturityDate: insertInvestment.maturityDate ?? null,
      expectedReturn: insertInvestment.expectedReturn ?? null,
      notes: insertInvestment.notes ?? null,
      paymentAmount: insertInvestment.paymentAmount
        ? insertInvestment.paymentAmount.toString()
        : null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await this.investments.insertOne(investment);
    return investment;
  }

  async updateInvestment(
    id: string,
    updateData: Partial<InsertInvestment>
  ): Promise<Investment | undefined> {
    const updatePayload: any = {
      ...updateData,
      updatedAt: new Date(),
    };

    // Convert paymentAmount to string if it exists and is a number
    if (updateData.paymentAmount !== undefined) {
      updatePayload.paymentAmount = updateData.paymentAmount
        ? updateData.paymentAmount.toString()
        : null;
    }

    const result = await this.investments.findOneAndUpdate(
      { id },
      { $set: updatePayload },
      { returnDocument: "after", includeResultMetadata: false }
    );
    return result ?? undefined;
  }

  async deleteInvestment(id: string): Promise<boolean> {
    const result = await this.investments.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Transaction methods
  async getTransactions(investmentId: string): Promise<Transaction[]> {
    return await this.transactions.find({ investmentId }).toArray();
  }

  async getAllTransactionsForUser(userId: string): Promise<Transaction[]> {
    const userInvestments = await this.getInvestments(userId);
    const investmentIds = userInvestments.map((inv) => inv.id);
    return await this.transactions
      .find({ investmentId: { $in: investmentIds } })
      .toArray();
  }

  async createTransaction(
    insertTransaction: InsertTransaction
  ): Promise<Transaction> {
    const transaction: Transaction = {
      ...insertTransaction,
      id: this.generateId(),
      notes: insertTransaction.notes ?? null,
      createdAt: new Date(),
    };
    await this.transactions.insertOne(transaction);
    return transaction;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const result = await this.transactions.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Bill methods
  async getBills(userId: string): Promise<Bill[]> {
    return await this.bills.find({ userId }).toArray();
  }

  async getBill(id: string): Promise<Bill | undefined> {
    const bill = await this.bills.findOne({ id });
    return bill || undefined;
  }

  async createBill(userId: string, insertBill: InsertBill): Promise<Bill> {
    const now = new Date();
    const bill: Bill = {
      ...insertBill,
      id: this.generateId(),
      userId,
      dueDay: insertBill.dueDay ?? null,
      nextDueDate: insertBill.nextDueDate ?? null,
      lastPaidDate: null,
      description: insertBill.description ?? null,
      vendor: insertBill.vendor ?? null,
      reminderDays: insertBill.reminderDays ?? 3,
      isActive: true,
      isRecurring: insertBill.isRecurring ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await this.bills.insertOne(bill);
    return bill;
  }

  async updateBill(
    id: string,
    updateData: Partial<InsertBill>
  ): Promise<Bill | undefined> {
    const result = await this.bills.findOneAndUpdate(
      { id },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: "after", includeResultMetadata: false }
    );
    return result ?? undefined;
  }

  async deleteBill(id: string): Promise<boolean> {
    const result = await this.bills.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Bill payment methods
  async getBillPayments(billId: string): Promise<BillPayment[]> {
    return await this.billPayments.find({ billId }).toArray();
  }

  async createBillPayment(
    insertPayment: InsertBillPayment
  ): Promise<BillPayment> {
    const effectiveStatus = insertPayment.status ?? "paid";
    const payment: BillPayment = {
      ...insertPayment,
      id: this.generateId(),
      amount: insertPayment.amount.toString(),
      notes: insertPayment.notes ?? null,
      status: effectiveStatus,
      createdAt: new Date(),
    };

    await this.billPayments.insertOne(payment);

    // Update bill state after successful payment recording
    if (effectiveStatus === "paid") {
      await this.updateBillAfterPayment(
        insertPayment.billId,
        insertPayment.paidDate,
        insertPayment.dueDate
      );
    }

    return payment;
  }

  async updateBillPayment(
    id: string,
    updateData: Partial<InsertBillPayment>
  ): Promise<BillPayment | undefined> {
    const oldPayment = await this.billPayments.findOne({ id });
    if (!oldPayment) return undefined;

    const oldStatus = oldPayment.status;
    const result = await this.billPayments.findOneAndUpdate(
      { id },
      {
        $set: {
          ...updateData,
          amount:
            updateData.amount !== undefined
              ? updateData.amount.toString()
              : oldPayment.amount,
        },
      },
      { returnDocument: "after", includeResultMetadata: false }
    );

    if (!result) return undefined;

    // Handle status changes for bill state management
    if (
      oldStatus === "paid" &&
      updateData.status &&
      updateData.status !== "paid"
    ) {
      await this.recomputeBillStateAfterPaymentDeletion(oldPayment.billId);
    } else if (oldStatus !== "paid" && updateData.status === "paid") {
      await this.updateBillAfterPayment(
        oldPayment.billId,
        oldPayment.paidDate,
        oldPayment.dueDate
      );
    }

    return result;
  }

  async deleteBillPayment(id: string): Promise<boolean> {
    const payment = await this.billPayments.findOne({ id });
    const result = await this.billPayments.deleteOne({ id });

    // Recompute bill state after payment deletion
    if (result.deletedCount > 0 && payment && payment.status === "paid") {
      await this.recomputeBillStateAfterPaymentDeletion(payment.billId);
    }

    return result.deletedCount > 0;
  }

  // Helper methods for bill management
  private async updateBillAfterPayment(
    billId: string,
    paidDate: string,
    dueDate: string
  ): Promise<void> {
    const bill = await this.getBill(billId);
    if (!bill || !bill.isActive || bill.frequency === "one_time") {
      return;
    }

    const dayAfterDue = new Date(dueDate);
    dayAfterDue.setDate(dayAfterDue.getDate() + 1);

    const nextDueDate = calculateNextBillDueDate(bill, dayAfterDue);
    const updates: Partial<InsertBill> = {};

    if (nextDueDate) {
      updates.nextDueDate = formatDateForStorage(nextDueDate);
    }

    updates.lastPaidDate = paidDate;

    if (Object.keys(updates).length > 0) {
      await this.updateBill(billId, updates);
    }
  }

  private async recomputeBillStateAfterPaymentDeletion(
    billId: string
  ): Promise<void> {
    const bill = await this.getBill(billId);
    if (!bill || !bill.isActive || bill.frequency === "one_time") {
      return;
    }

    const remainingPayments = await this.getBillPayments(billId);
    const paidPayments = remainingPayments.filter((p) => p.status === "paid");

    if (paidPayments.length > 0) {
      const latestPayment = paidPayments.sort(
        (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      )[0];

      const dayAfterLatestDue = new Date(latestPayment.dueDate);
      dayAfterLatestDue.setDate(dayAfterLatestDue.getDate() + 1);

      const nextDueDate = calculateNextBillDueDate(bill, dayAfterLatestDue);
      if (nextDueDate) {
        await this.updateBill(billId, {
          nextDueDate: formatDateForStorage(nextDueDate),
          lastPaidDate: latestPayment.paidDate,
        });
      }
    } else {
      const nextDueDate = calculateNextBillDueDate(bill, new Date());
      if (nextDueDate) {
        await this.updateBill(billId, {
          nextDueDate: formatDateForStorage(nextDueDate),
          lastPaidDate: null,
        });
      }
    }
  }

  // Investment Types methods
  async getInvestmentTypes(userId: string): Promise<InvestmentType[]> {
    return await this.investmentTypes.find({ userId }).toArray();
  }

  async createInvestmentType(
    userId: string,
    insertType: InsertInvestmentType
  ): Promise<InvestmentType> {
    const type: InvestmentType = {
      ...insertType,
      id: this.generateId(),
      userId,
      isDefault: insertType.isDefault ?? false,
      createdAt: new Date(),
    };
    await this.investmentTypes.insertOne(type);
    return type;
  }

  async updateInvestmentType(
    id: string,
    updateData: Partial<InsertInvestmentType>
  ): Promise<InvestmentType | undefined> {
    const result = await this.investmentTypes.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: "after", includeResultMetadata: false }
    );
    return result ?? undefined;
  }

  async deleteInvestmentType(id: string): Promise<boolean> {
    const result = await this.investmentTypes.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Bill Categories methods
  async getBillCategories(userId: string): Promise<BillCategory[]> {
    return await this.billCategories.find({ userId }).toArray();
  }

  async createBillCategory(
    userId: string,
    insertCategory: InsertBillCategory
  ): Promise<BillCategory> {
    const category: BillCategory = {
      ...insertCategory,
      id: this.generateId(),
      userId,
      isDefault: insertCategory.isDefault ?? false,
      createdAt: new Date(),
    };
    await this.billCategories.insertOne(category);
    return category;
  }

  async updateBillCategory(
    id: string,
    updateData: Partial<InsertBillCategory>
  ): Promise<BillCategory | undefined> {
    const result = await this.billCategories.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: "after", includeResultMetadata: false }
    );
    return result ?? undefined;
  }

  async deleteBillCategory(id: string): Promise<boolean> {
    const result = await this.billCategories.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Data export/import methods
  async exportAllData(userId: string): Promise<any> {
    const [
      investments,
      bills,
      billPayments,
      investmentTypes,
      billCategories,
      transactions,
    ] = await Promise.all([
      this.getInvestments(userId),
      this.getBills(userId),
      Promise.all(
        (
          await this.getBills(userId)
        ).map((bill) => this.getBillPayments(bill.id))
      ).then((results) => results.flat()),
      this.getInvestmentTypes(userId),
      this.getBillCategories(userId),
      this.getAllTransactionsForUser(userId),
    ]);

    return {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      data: {
        investments,
        bills,
        billPayments,
        investmentTypes: investmentTypes.filter((type) => !type.isDefault),
        billCategories: billCategories.filter(
          (category) => !category.isDefault
        ),
        transactions,
      },
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
            isDefault: false,
          });
        }
      }

      // Import custom bill categories
      if (data.billCategories) {
        for (const category of data.billCategories) {
          await this.createBillCategory(userId, {
            name: category.name,
            isDefault: false,
          });
        }
      }

      // Import investments
      if (data.investments) {
        for (const investment of data.investments) {
          const {
            id,
            userId: _,
            createdAt,
            updatedAt,
            ...insertData
          } = investment;
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
      console.error("Import failed:", error);
      return false;
    }
  }
}
