import { type Bill } from "@shared/schema";

// Helper to clamp day to valid range for given month/year
const clampDay = (year: number, month: number, day: number) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(day, daysInMonth);
};

// UTC-safe date construction to avoid timezone drift
const createUTCDate = (year: number, month: number, day: number): Date => {
  return new Date(Date.UTC(year, month, day));
};

// UTC-safe start of day to unify timezone handling
const utcStartOfDay = (date: Date): Date => {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDay = date.getUTCDate();
  return new Date(Date.UTC(utcYear, utcMonth, utcDay));
};

// Get next due date based on bill frequency and proper anchoring
export const calculateNextBillDueDate = (bill: Bill, fromDate: Date = new Date(), anchorStart?: Date): Date | null => {
  if (!bill.dueDay || bill.frequency === 'one_time' || !bill.isActive) {
    return null;
  }

  // Always anchor on original schedule (createdAt or explicit anchorStart), never on nextDueDate
  const scheduleAnchor = anchorStart ? utcStartOfDay(anchorStart) : utcStartOfDay(new Date(bill.createdAt));
  const anchorYear = scheduleAnchor.getUTCFullYear();
  const anchorMonth = scheduleAnchor.getUTCMonth();
  
  // Compare from the later of schedule anchor or fromDate, in UTC
  const compareFrom = new Date(Math.max(scheduleAnchor.getTime(), utcStartOfDay(fromDate).getTime()));

  let nextDue: Date | null = null;

  switch (bill.frequency) {
    case 'monthly': {
      // Find next month where due date >= compareFrom
      let targetYear = compareFrom.getUTCFullYear();
      let targetMonth = compareFrom.getUTCMonth();
      
      do {
        const clampedDay = clampDay(targetYear, targetMonth, bill.dueDay);
        nextDue = createUTCDate(targetYear, targetMonth, clampedDay);
        
        if (nextDue >= compareFrom) break;
        
        targetMonth++;
        if (targetMonth > 11) {
          targetMonth = 0;
          targetYear++;
        }
      } while (true);
      break;
    }

    case 'quarterly': {
      // Find next quarter cycle from anchor month
      let k = 0;
      do {
        const targetMonth = (anchorMonth + k * 3) % 12;
        const targetYear = anchorYear + Math.floor((anchorMonth + k * 3) / 12);
        const clampedDay = clampDay(targetYear, targetMonth, bill.dueDay);
        nextDue = createUTCDate(targetYear, targetMonth, clampedDay);
        
        if (nextDue >= compareFrom) break;
        k++;
      } while (k < 100); // Safety limit
      break;
    }

    case 'half_yearly': {
      // Find next half-year cycle from anchor month
      let k = 0;
      do {
        const targetMonth = (anchorMonth + k * 6) % 12;
        const targetYear = anchorYear + Math.floor((anchorMonth + k * 6) / 12);
        const clampedDay = clampDay(targetYear, targetMonth, bill.dueDay);
        nextDue = createUTCDate(targetYear, targetMonth, clampedDay);
        
        if (nextDue >= compareFrom) break;
        k++;
      } while (k < 50); // Safety limit
      break;
    }

    case 'yearly': {
      // Find next year cycle from anchor date
      let targetYear = anchorYear;
      do {
        const clampedDay = clampDay(targetYear, anchorMonth, bill.dueDay);
        nextDue = createUTCDate(targetYear, anchorMonth, clampedDay);
        
        if (nextDue >= compareFrom) break;
        targetYear++;
      } while (targetYear < anchorYear + 50); // Safety limit
      break;
    }

    default:
      return null;
  }

  return nextDue;
};

// Convert Date to UTC date string (YYYY-MM-DD)
export const formatDateForStorage = (date: Date): string => {
  return date.toISOString().split('T')[0];
};