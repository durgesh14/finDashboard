import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInvestmentSchema, insertTransactionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all investments
  app.get("/api/investments", async (req, res) => {
    try {
      // For demo purposes, using a default user ID
      const userId = "demo-user";
      const investments = await storage.getInvestments(userId);
      res.json(investments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investments" });
    }
  });

  // Get single investment
  app.get("/api/investments/:id", async (req, res) => {
    try {
      const investment = await storage.getInvestment(req.params.id);
      if (!investment) {
        return res.status(404).json({ error: "Investment not found" });
      }
      res.json(investment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investment" });
    }
  });

  // Create new investment
  app.post("/api/investments", async (req, res) => {
    try {
      const validatedData = insertInvestmentSchema.parse(req.body);
      const userId = "demo-user"; // For demo purposes
      const investment = await storage.createInvestment(userId, validatedData);
      res.status(201).json(investment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create investment" });
    }
  });

  // Update investment
  app.put("/api/investments/:id", async (req, res) => {
    try {
      const validatedData = insertInvestmentSchema.partial().parse(req.body);
      const investment = await storage.updateInvestment(req.params.id, validatedData);
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
  app.delete("/api/investments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInvestment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Investment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete investment" });
    }
  });

  // Get transactions for an investment
  app.get("/api/investments/:id/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Create transaction
  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  // Get dashboard summary
  app.get("/api/dashboard/summary", async (req, res) => {
    try {
      const userId = "demo-user";
      const investments = await storage.getInvestments(userId);
      
      const totalInvested = investments.reduce((sum, inv) => {
        return sum + parseFloat(inv.principalAmount);
      }, 0);

      // Calculate estimated current value (simplified calculation)
      const currentValue = investments.reduce((sum, inv) => {
        const principal = parseFloat(inv.principalAmount);
        const returnRate = inv.expectedReturn ? parseFloat(inv.expectedReturn) / 100 : 0.08;
        const months = Math.max(1, Math.floor((Date.now() - new Date(inv.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));
        const estimated = principal * (1 + (returnRate * months / 12));
        return sum + estimated;
      }, 0);

      // Calculate upcoming due dates
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const upcomingPayments = investments.filter(inv => {
        if (inv.paymentFrequency === 'one_time' || !inv.dueDay) return false;
        
        const dueDate = new Date(today.getFullYear(), today.getMonth(), inv.dueDay);
        if (dueDate < today) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
        
        return dueDate <= nextWeek;
      });

      res.json({
        totalInvested: Math.round(totalInvested),
        currentValue: Math.round(currentValue),
        totalGains: Math.round(currentValue - totalInvested),
        gainsPercentage: totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested * 100) : 0,
        upcomingPayments: upcomingPayments.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
