import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Investment } from "@shared/schema";
import { Eye, Edit, Trash2, Search, PieChart, Banknote, Coins, Shield, Landmark } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const TYPE_ICONS = {
  mutual_fund: PieChart,
  fixed_deposit: Banknote,
  recurring_deposit: Coins,
  lic: Shield,
  ppf: Landmark,
  stocks: PieChart,
  other: PieChart
};

const TYPE_LABELS = {
  mutual_fund: 'Mutual Fund',
  fixed_deposit: 'Fixed Deposit',
  recurring_deposit: 'Recurring Deposit',
  lic: 'LIC/Insurance',
  ppf: 'PPF',
  stocks: 'Stocks',
  other: 'Other'
};

const TYPE_COLORS = {
  mutual_fund: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  fixed_deposit: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  recurring_deposit: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  lic: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  ppf: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  stocks: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

interface InvestmentTableProps {
  onEditInvestment?: (investment: Investment) => void;
}

export function InvestmentTable({ onEditInvestment }: InvestmentTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/investments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Success",
        description: "Investment deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete investment",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredInvestments = investments?.filter(investment => {
    const matchesSearch = investment.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || investment.type === typeFilter;
    return matchesSearch && matchesType;
  }) || [];

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const calculateCurrentValue = (investment: Investment) => {
    const principal = parseFloat(investment.principalAmount);
    const returnRate = investment.expectedReturn ? parseFloat(investment.expectedReturn) / 100 : 0.08;
    const months = Math.max(1, Math.floor((Date.now() - new Date(investment.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));
    return principal * Math.pow(1 + returnRate/12, months);
  };

  const calculateReturns = (investment: Investment) => {
    const principal = parseFloat(investment.principalAmount);
    const currentValue = calculateCurrentValue(investment);
    return ((currentValue - principal) / principal) * 100;
  };

  const getNextPaymentDate = (investment: Investment) => {
    if (investment.paymentFrequency === 'one_time' || !investment.dueDay || !investment.startDate) {
      return 'One-time';
    }
    
    const today = new Date();
    const startDate = new Date(investment.startDate);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    
    // Normalize dates to day precision (remove time component)
    const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const anchor = new Date(Math.max(startOfDay(startDate).getTime(), startOfDay(today).getTime()));
    
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
        return 'Unknown';
    }
    
    if (!nextDue) return 'Error';
    
    // Check if investment has ended/matured
    if (investment.maturityDate && nextDue > new Date(investment.maturityDate)) {
      return 'Matured';
    }
    
    // Check if investment is inactive
    if (!investment.isActive) {
      return 'Inactive';
    }
    
    return nextDue.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (investment: Investment) => {
    const today = new Date();
    if (!investment.isActive) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Inactive</span>;
    }
    
    if (investment.paymentFrequency !== 'one_time' && investment.dueDay) {
      const dueDate = new Date(today.getFullYear(), today.getMonth(), investment.dueDay);
      if (dueDate < today) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue === 0) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Due Today</span>;
      } else if (daysUntilDue <= 7) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Due Soon</span>;
      }
    }
    
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>;
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-foreground">Investment Portfolio</h3>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <select 
              className="text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              data-testid="select-investment-type"
            >
              <option value="">All Types</option>
              <option value="mutual_fund">Mutual Funds</option>
              <option value="fixed_deposit">Fixed Deposits</option>
              <option value="recurring_deposit">Recurring Deposits</option>
              <option value="lic">Insurance</option>
              <option value="ppf">PPF</option>
              <option value="stocks">Stocks</option>
              <option value="other">Other</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="text" 
                placeholder="Search investments..." 
                className="pl-10 pr-4 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-investments"
              />
            </div>
          </div>
        </div>
      </CardContent>
      
      {filteredInvestments.length === 0 ? (
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <p>No investments found</p>
          </div>
        </CardContent>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Investment</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Invested</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Current Value</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Returns</th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">Next Payment</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvestments.map((investment) => {
                  const IconComponent = TYPE_ICONS[investment.type as keyof typeof TYPE_ICONS] || PieChart;
                  const currentValue = calculateCurrentValue(investment);
                  const returns = calculateReturns(investment);
                  
                  return (
                    <tr key={investment.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-investment-${investment.id}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <IconComponent className="text-blue-500" size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{investment.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {investment.expectedReturn ? `${investment.expectedReturn}%` : 'N/A'} • {investment.paymentFrequency.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[investment.type as keyof typeof TYPE_COLORS]}`}>
                          {TYPE_LABELS[investment.type as keyof typeof TYPE_LABELS]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-foreground font-medium">
                        {formatCurrency(investment.principalAmount)}
                      </td>
                      <td className="px-6 py-4 text-right text-foreground font-medium">
                        {formatCurrency(currentValue.toString())}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <span className={`font-medium ${returns >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {returns >= 0 ? '+' : ''}{returns.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(investment)}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-muted-foreground">
                        {getNextPaymentDate(investment)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors" 
                            title="View Details"
                            data-testid={`button-view-${investment.id}`}
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors" 
                            title="Edit"
                            onClick={() => onEditInvestment?.(investment)}
                            data-testid={`button-edit-${investment.id}`}
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className="p-2 text-destructive hover:text-destructive/80 transition-colors" 
                            title="Delete"
                            onClick={() => handleDelete(investment.id, investment.name)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${investment.id}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <CardContent className="px-6 py-4 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">1-{filteredInvestments.length}</span> of <span className="font-medium">{filteredInvestments.length}</span> investments
              </p>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
