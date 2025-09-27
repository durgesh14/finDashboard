import type { Express } from "express";
import { createServer, type Server } from "http";
import { initializeStorage, setStorage, IStorage } from "./storage";
import { insertInvestmentSchema, insertTransactionSchema, insertBillSchema, insertBillPaymentSchema, insertInvestmentTypeSchema, insertBillCategorySchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";

// Global storage instance that will be used by all routes
let appStorage: IStorage;

// Middleware to require authentication
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize storage (MongoDB or fallback to memory)
  appStorage = await initializeStorage();
  setStorage(appStorage);
  
  // Reference integration: blueprint:javascript_auth_all_persistance
  // Setup authentication routes: /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);
  
  // Get all investments
  app.get("/api/investments", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const investments = await appStorage.getInvestments(userId);
      res.json(investments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investments" });
    }
  });

  // Get single investment
  app.get("/api/investments/:id", requireAuth, async (req: any, res) => {
    try {
      const investment = await appStorage.getInvestment(req.params.id);
      if (!investment) {
        return res.status(404).json({ error: "Investment not found" });
      }
      res.json(investment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investment" });
    }
  });

  // Create new investment
  app.post("/api/investments", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertInvestmentSchema.parse(req.body);
      const userId = req.user.id;
      const investment = await appStorage.createInvestment(userId, validatedData);
      res.status(201).json(investment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create investment" });
    }
  });

  // Update investment
  app.put("/api/investments/:id", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertInvestmentSchema.partial().parse(req.body);
      const investment = await appStorage.updateInvestment(req.params.id, validatedData);
      if (!investment) {
        return res.status(404).json({ error: "Investment not found" });
      }
      res.json(investment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update investment" });
    }
  });

  // Delete investment
  app.delete("/api/investments/:id", requireAuth, async (req: any, res) => {
    try {
      const deleted = await appStorage.deleteInvestment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Investment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete investment" });
    }
  });

  // Get transactions for an investment
  app.get("/api/investments/:id/transactions", requireAuth, async (req: any, res) => {
    try {
      const transactions = await appStorage.getTransactions(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Create transaction
  app.post("/api/transactions", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await appStorage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  // Get dashboard summary
  app.get("/api/dashboard/summary", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const investments = await appStorage.getInvestments(userId);
      
      // Calculate total invested (sum of all principal amounts)
      const totalInvested = investments.reduce((sum, inv) => {
        return sum + parseFloat(inv.principalAmount);
      }, 0);

      // Calculate month-over-month change using transaction history when available
      const now = new Date();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      
      // Get all transactions for the user
      const allTransactions = await appStorage.getAllTransactionsForUser(userId);
      
      let finalCurrentTotal: number;
      let finalLastMonthTotal: number;
      
      // Use transaction data if any transactions exist, otherwise fallback to investment principals
      if (allTransactions.length > 0) {
        // Calculate total invested from transaction history (assumes deposits are positive amounts)
        finalCurrentTotal = allTransactions
          .filter(tx => new Date(tx.transactionDate) <= now)
          .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        
        finalLastMonthTotal = allTransactions
          .filter(tx => new Date(tx.transactionDate) <= endOfLastMonth)
          .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      } else {
        // Fallback to investment principal amounts with proper time boundaries
        finalCurrentTotal = totalInvested;
        finalLastMonthTotal = investments
          .filter(inv => new Date(inv.startDate) <= endOfLastMonth)
          .reduce((sum, inv) => sum + parseFloat(inv.principalAmount), 0);
      }
      
      // Calculate month-over-month percentage change (as of now vs end of last month)
      const changeVsLastMonth = finalLastMonthTotal > 0 ? 
        ((finalCurrentTotal - finalLastMonthTotal) / finalLastMonthTotal * 100) : 
        null; // Return null when no baseline exists for proper UI handling

      // Helper function to calculate next due date based on frequency and start cycle
      const getNextDueDate = (investment: any, fromDate: Date) => {
        if (!investment.dueDay || !investment.startDate) return null;
        
        const startDate = new Date(investment.startDate);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth();
        
        // Normalize dates to day precision (remove time component)
        const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const anchor = new Date(Math.max(startOfDay(startDate).getTime(), startOfDay(fromDate).getTime()));
        
        // Helper to clamp day to valid range for given month/year
        const clampDay = (year: number, month: number, day: number) => {
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          return Math.min(day, daysInMonth);
        };
        
        // Calculate next occurrence based on frequency
        let nextDue: Date | null = null;
        
        switch (investment.paymentFrequency) {
          case 'monthly': {
            // Find next month where due date >= anchor
            let targetYear = anchor.getFullYear();
            let targetMonth = anchor.getMonth();
            
            do {
              const clampedDay = clampDay(targetYear, targetMonth, investment.dueDay);
              nextDue = new Date(targetYear, targetMonth, clampedDay);
              
              if (nextDue >= anchor) break;
              
              targetMonth++;
              if (targetMonth > 11) {
                targetMonth = 0;
                targetYear++;
              }
            } while (true);
            break;
          }
          
          case 'quarterly': {
            // Find next quarter cycle from start month
            let k = 0;
            do {
              const targetMonth = (startMonth + k * 3) % 12;
              const targetYear = startYear + Math.floor((startMonth + k * 3) / 12);
              const clampedDay = clampDay(targetYear, targetMonth, investment.dueDay);
              nextDue = new Date(targetYear, targetMonth, clampedDay);
              
              if (nextDue >= anchor) break;
              k++;
            } while (k < 100); // Safety limit
            break;
          }
          
          case 'half_yearly': {
            // Find next half-year cycle from start month
            let k = 0;
            do {
              const targetMonth = (startMonth + k * 6) % 12;
              const targetYear = startYear + Math.floor((startMonth + k * 6) / 12);
              const clampedDay = clampDay(targetYear, targetMonth, investment.dueDay);
              nextDue = new Date(targetYear, targetMonth, clampedDay);
              
              if (nextDue >= anchor) break;
              k++;
            } while (k < 50); // Safety limit
            break;
          }
          
          case 'yearly': {
            // Find next year cycle from start date
            let targetYear = startYear;
            do {
              const clampedDay = clampDay(targetYear, startMonth, investment.dueDay);
              nextDue = new Date(targetYear, startMonth, clampedDay);
              
              if (nextDue >= anchor) break;
              targetYear++;
            } while (targetYear < startYear + 50); // Safety limit
            break;
          }
          
          default:
            return null;
        }
        
        return nextDue;
      };

      // Calculate upcoming payments with amounts
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const upcomingPayments = investments.filter(inv => {
        if (inv.paymentFrequency === 'one_time' || !inv.dueDay || !inv.isActive) return false;
        
        const nextDue = getNextDueDate(inv, today);
        return nextDue && nextDue <= nextWeek;
      }).map(inv => ({
        ...inv,
        nextDueDate: getNextDueDate(inv, today)
      }));

      // Find next payment details
      const nextPayment = upcomingPayments.length > 0 ? 
        upcomingPayments.sort((a, b) => {
          return (a.nextDueDate?.getTime() || 0) - (b.nextDueDate?.getTime() || 0);
        })[0] : null;

      const nextPaymentDate = nextPayment?.nextDueDate;

      res.json({
        totalInvested: Math.round(totalInvested),
        changeVsLastMonth: changeVsLastMonth !== null ? Math.round(changeVsLastMonth * 100) / 100 : null,
        upcomingPayments: upcomingPayments.length,
        nextPaymentAmount: nextPayment ? parseFloat(nextPayment.principalAmount) : null,
        nextPaymentDate: nextPaymentDate ? nextPaymentDate.getDate() : null,
        nextPaymentName: nextPayment ? nextPayment.name : null
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
  });

  // Bills routes
  
  // Get all bills
  app.get("/api/bills", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bills = await appStorage.getBills(userId);
      res.json(bills);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  });

  // Get bills summary/insights (MUST be before parameterized routes)
  app.get("/api/bills/summary", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const bills = await appStorage.getBills(userId);
      
      const totalMonthlyBills = bills
        .filter(bill => bill.isActive && bill.frequency === 'monthly')
        .reduce((sum, bill) => sum + parseFloat(bill.amount), 0);

      const totalQuarterlyBills = bills
        .filter(bill => bill.isActive && bill.frequency === 'quarterly')
        .reduce((sum, bill) => sum + parseFloat(bill.amount), 0);

      const totalYearlyBills = bills
        .filter(bill => bill.isActive && bill.frequency === 'yearly')
        .reduce((sum, bill) => sum + parseFloat(bill.amount), 0);

      // Calculate monthly equivalent
      const monthlyEquivalent = totalMonthlyBills + (totalQuarterlyBills / 3) + (totalYearlyBills / 12);

      // Get bills due this week
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const billsDueThisWeek = bills.filter(bill => {
        if (!bill.isActive || !bill.dueDay || bill.frequency === 'one_time') return false;
        
        // Helper to get next valid due date
        const getNextDueDate = (dueDay: number, fromDate: Date) => {
          const currentYear = fromDate.getFullYear();
          const currentMonth = fromDate.getMonth();
          
          // Try current month first
          const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
          const validDueDay = Math.min(dueDay, daysInCurrentMonth);
          const currentMonthDue = new Date(currentYear, currentMonth, validDueDay);
          
          if (currentMonthDue >= fromDate) {
            return currentMonthDue;
          }
          
          // Try next month
          const nextMonth = currentMonth + 1;
          const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
          const adjustedNextMonth = nextMonth > 11 ? 0 : nextMonth;
          
          const daysInNextMonth = new Date(nextYear, adjustedNextMonth + 1, 0).getDate();
          const validNextDueDay = Math.min(dueDay, daysInNextMonth);
          
          return new Date(nextYear, adjustedNextMonth, validNextDueDay);
        };
        
        const nextDueDate = getNextDueDate(bill.dueDay, today);
        return nextDueDate <= nextWeek;
      });

      // Generate monthly breakdown for the year with actual payments
      const monthlyTotals = await Promise.all(
        Array.from({ length: 12 }, async (_, monthIndex) => {
          let projected = 0;
          let actual = 0;
          
          // Calculate projected amounts with proper cycle anchoring
          bills.filter(bill => bill.isActive).forEach(bill => {
            const amount = parseFloat(bill.amount);
            
            if (bill.frequency === 'monthly') {
              projected += amount;
            } else if (bill.frequency === 'quarterly') {
              // Use nextDueDate or creation date as anchor, bill occurs every 3 months
              const anchorDate = bill.nextDueDate ? new Date(bill.nextDueDate) : new Date(bill.createdAt);
              const anchorMonth = anchorDate.getMonth();
              
              // Check if this month falls on a quarterly cycle from anchor
              const monthsFromAnchor = (monthIndex - anchorMonth + 12) % 12;
              if (monthsFromAnchor % 3 === 0) {
                projected += amount;
              }
            } else if (bill.frequency === 'yearly') {
              // Use nextDueDate or creation date as anchor, bill occurs once per year
              const anchorDate = bill.nextDueDate ? new Date(bill.nextDueDate) : new Date(bill.createdAt);
              const anchorMonth = anchorDate.getMonth();
              
              if (monthIndex === anchorMonth) {
                projected += amount;
              }
            } else if (bill.frequency === 'half_yearly') {
              // Use nextDueDate or creation date as anchor, bill occurs every 6 months
              const anchorDate = bill.nextDueDate ? new Date(bill.nextDueDate) : new Date(bill.createdAt);
              const anchorMonth = anchorDate.getMonth();
              
              // Check if this month falls on a half-yearly cycle from anchor
              const monthsFromAnchor = (monthIndex - anchorMonth + 12) % 12;
              if (monthsFromAnchor % 6 === 0) {
                projected += amount;
              }
            }
          });
          
          // Calculate actual payments for this month (only count paid status)
          for (const bill of bills) {
            const payments = await appStorage.getBillPayments(bill.id);
            const monthPayments = payments.filter(payment => {
              const paymentDate = new Date(payment.paidDate);
              return payment.status === 'paid' && 
                     paymentDate.getFullYear() === year && 
                     paymentDate.getMonth() === monthIndex;
            });
            actual += monthPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
          }
          
          return {
            month: monthIndex + 1,
            monthName: new Date(year, monthIndex).toLocaleString('default', { month: 'long' }),
            projected: Math.round(projected),
            actual: Math.round(actual)
          };
        })
      );

      // Category breakdown
      const categoryBreakdown = bills
        .filter(bill => bill.isActive)
        .reduce((acc, bill) => {
          const category = bill.category;
          const monthlyAmount = bill.frequency === 'monthly' ? parseFloat(bill.amount) :
                              bill.frequency === 'quarterly' ? parseFloat(bill.amount) / 3 :
                              bill.frequency === 'yearly' ? parseFloat(bill.amount) / 12 :
                              parseFloat(bill.amount);
          
          if (!acc[category]) {
            acc[category] = { total: 0, count: 0 };
          }
          acc[category].total += monthlyAmount;
          acc[category].count += 1;
          return acc;
        }, {} as Record<string, { total: number; count: number }>);

      res.json({
        totalMonthlyBills: Math.round(totalMonthlyBills),
        totalQuarterlyBills: Math.round(totalQuarterlyBills),
        totalYearlyBills: Math.round(totalYearlyBills),
        monthlyEquivalent: Math.round(monthlyEquivalent),
        billsDueThisWeek: billsDueThisWeek.length,
        activeBillsCount: bills.filter(bill => bill.isActive).length,
        categoryBreakdown,
        monthlyTotals,
        year
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bills summary" });
    }
  });

  // Get single bill
  app.get("/api/bills/:id", requireAuth, async (req: any, res) => {
    try {
      const bill = await appStorage.getBill(req.params.id);
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      res.json(bill);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bill" });
    }
  });

  // Get bill payments for a specific bill
  app.get("/api/bills/:id/payments", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const payments = await appStorage.getBillPayments(id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bill payments" });
    }
  });

  // Create a bill payment
  app.post("/api/bills/:id/payments", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const paymentData = insertBillPaymentSchema.parse({
        ...req.body,
        billId: id, // Override any billId from body with URL param
      });
      const payment = await appStorage.createBillPayment(paymentData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payment data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // Get all bill payments for a year (for summary calculations)
  app.get("/api/bills/payments", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      
      const bills = await appStorage.getBills(userId);
      const allPayments: any[] = [];
      
      for (const bill of bills) {
        const payments = await appStorage.getBillPayments(bill.id);
        const yearPayments = payments.filter(payment => {
          const paymentYear = new Date(payment.paidDate).getFullYear();
          return paymentYear === year;
        });
        
        yearPayments.forEach(payment => {
          allPayments.push({
            ...payment,
            billName: bill.name,
            category: bill.category
          });
        });
      }
      
      res.json(allPayments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // Create new bill
  app.post("/api/bills", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertBillSchema.parse(req.body);
      const userId = req.user.id;
      const bill = await appStorage.createBill(userId, validatedData);
      res.status(201).json(bill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create bill" });
    }
  });

  // Update bill
  app.put("/api/bills/:id", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertBillSchema.partial().parse(req.body);
      const bill = await appStorage.updateBill(req.params.id, validatedData);
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      res.json(bill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update bill" });
    }
  });

  // Delete bill
  app.delete("/api/bills/:id", requireAuth, async (req: any, res) => {
    try {
      const deleted = await appStorage.deleteBill(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Bill not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bill" });
    }
  });

  // Custom Investment Types routes
  
  // Get all investment types
  app.get("/api/investment-types", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const types = await appStorage.getInvestmentTypes(userId);
      res.json(types);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investment types" });
    }
  });

  // Create investment type
  app.post("/api/investment-types", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertInvestmentTypeSchema.parse(req.body);
      const userId = req.user.id;
      const type = await appStorage.createInvestmentType(userId, validatedData);
      res.status(201).json(type);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create investment type" });
    }
  });

  // Update investment type
  app.put("/api/investment-types/:id", async (req, res) => {
    try {
      const validatedData = insertInvestmentTypeSchema.partial().parse(req.body);
      const type = await appStorage.updateInvestmentType(req.params.id, validatedData);
      if (!type) {
        return res.status(404).json({ error: "Investment type not found" });
      }
      res.json(type);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update investment type" });
    }
  });

  // Delete investment type
  app.delete("/api/investment-types/:id", async (req, res) => {
    try {
      const deleted = await appStorage.deleteInvestmentType(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Investment type not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete investment type" });
    }
  });

  // Custom Bill Categories routes
  
  // Get all bill categories
  app.get("/api/bill-categories", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const categories = await appStorage.getBillCategories(userId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bill categories" });
    }
  });

  // Create bill category
  app.post("/api/bill-categories", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertBillCategorySchema.parse(req.body);
      const userId = req.user.id;
      const category = await appStorage.createBillCategory(userId, validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create bill category" });
    }
  });

  // Update bill category
  app.put("/api/bill-categories/:id", async (req, res) => {
    try {
      const validatedData = insertBillCategorySchema.partial().parse(req.body);
      const category = await appStorage.updateBillCategory(req.params.id, validatedData);
      if (!category) {
        return res.status(404).json({ error: "Bill category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update bill category" });
    }
  });

  // Delete bill category
  app.delete("/api/bill-categories/:id", async (req, res) => {
    try {
      const deleted = await appStorage.deleteBillCategory(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Bill category not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bill category" });
    }
  });

  // Data Export/Import routes
  
  // Export all data
  app.get("/api/data/export", async (req, res) => {
    try {
      const userId = "demo-user";
      const exportData = await appStorage.exportAllData(userId);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="financial-data-export-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Import all data
  app.post("/api/data/import", async (req, res) => {
    try {
      const userId = "demo-user";
      const success = await appStorage.importAllData(userId, req.body);
      
      if (!success) {
        return res.status(400).json({ error: "Failed to import data" });
      }
      
      res.json({ message: "Data imported successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to import data" });
    }
  });


  // Update bill payment
  app.put("/api/bill-payments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertBillPaymentSchema.partial().parse(req.body);
      const payment = await appStorage.updateBillPayment(id, validatedData);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payment data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update payment" });
    }
  });

  // Delete bill payment
  app.delete("/api/bill-payments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await appStorage.deleteBillPayment(id);
      if (!deleted) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  // Create bill payment
  app.post("/api/bill-payments", async (req, res) => {
    try {
      const validatedData = insertBillPaymentSchema.parse(req.body);
      const payment = await appStorage.createBillPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create bill payment" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
