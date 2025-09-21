import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bill, InsertBill } from "@shared/schema";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  Download,
  Receipt,
  CreditCard,
  Home,
  Car,
  Phone,
  Zap,
  ShoppingCart,
  Heart,
  Play
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertBillSchema, insertBillPaymentSchema } from "@shared/schema";
import { z } from "zod";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const CATEGORY_COLORS = {
  utilities: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  subscriptions: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  insurance: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  loans: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  groceries: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  transport: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  healthcare: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  entertainment: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

const CATEGORY_ICONS = {
  utilities: Zap,
  subscriptions: Play,
  insurance: ShoppingCart,
  loans: CreditCard,
  groceries: ShoppingCart,
  transport: Car,
  healthcare: Heart,
  entertainment: Play,
  other: Receipt
};

const CATEGORY_LABELS = {
  utilities: 'Utilities',
  subscriptions: 'Subscriptions',
  insurance: 'Insurance',
  loans: 'Loans',
  groceries: 'Groceries',
  transport: 'Transport',
  healthcare: 'Healthcare',
  entertainment: 'Entertainment',
  other: 'Other'
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#6B7280', '#EC4899', '#84CC16'];

interface MonthlyTotal {
  month: number;
  monthName: string;
  projected: number;
  actual: number;
}

interface BillsSummary {
  totalMonthlyBills: number;
  totalQuarterlyBills: number;
  totalYearlyBills: number;
  monthlyEquivalent: number;
  billsDueThisWeek: number;
  activeBillsCount: number;
  categoryBreakdown: Record<string, { total: number; count: number }>;
  monthlyTotals: MonthlyTotal[];
  year: number;
}

const billFormSchema = insertBillSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  dueDay: z.coerce.number().min(1).max(31).optional(),
  reminderDays: z.coerce.number().min(0).max(30).optional(),
});

export default function Bills() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Bill | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bills, isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<BillsSummary>({
    queryKey: ["/api/bills/summary", selectedYear],
    queryFn: () => fetch(`/api/bills/summary?year=${selectedYear}`).then(res => res.json()),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (data: { billId: string; amount: string; paidDate: string; dueDate: string; status: string }) =>
      apiRequest("POST", `/api/bills/${data.billId}/payments`, {
        amount: data.amount,
        paidDate: data.paidDate,
        dueDate: data.dueDate,
        status: data.status,
      }),
    onSuccess: () => {
      toast({ title: "Payment recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/summary", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      setIsRecordPaymentModalOpen(false);
      setSelectedBillForPayment(null);
    },
    onError: () => {
      toast({ title: "Failed to record payment", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/summary"] });
      toast({
        title: "Success",
        description: "Bill deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof billFormSchema>) => {
      const submitData = {
        ...data,
        amount: data.amount,
        nextDueDate: data.frequency !== 'one_time' && data.dueDay ? 
          new Date(new Date().getFullYear(), new Date().getMonth(), data.dueDay).toISOString().split('T')[0] : 
          null
      };
      return apiRequest("POST", "/api/bills", submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/summary"] });
      setIsAddModalOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Bill added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add bill",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof billFormSchema> }) => {
      const submitData = {
        ...data,
        amount: data.amount,
        nextDueDate: data.frequency !== 'one_time' && data.dueDay ? 
          new Date(new Date().getFullYear(), new Date().getMonth(), data.dueDay).toISOString().split('T')[0] : 
          null
      };
      return apiRequest("PUT", `/api/bills/${id}`, submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/summary"] });
      setIsAddModalOpen(false);
      setEditingBill(null);
      form.reset();
      toast({
        title: "Success",
        description: "Bill updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update bill",
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof billFormSchema>>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      name: "",
      category: "utilities",
      amount: "",
      frequency: "monthly",
      dueDay: undefined,
      description: "",
      vendor: "",
      isActive: true,
      isRecurring: true,
      reminderDays: 3,
    },
  });

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const getFilteredBills = () => {
    if (!bills) return [];

    return bills.filter(bill => {
      const matchesSearch = bill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          bill.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          false;
      const matchesCategory = categoryFilter === "all" || bill.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && bill.isActive) ||
        (statusFilter === "inactive" && !bill.isActive);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    form.reset({
      name: bill.name,
      category: bill.category,
      amount: bill.amount,
      frequency: bill.frequency,
      dueDay: bill.dueDay || undefined,
      description: bill.description || "",
      vendor: bill.vendor || "",
      isActive: bill.isActive,
      isRecurring: bill.isRecurring,
      reminderDays: bill.reminderDays || 3,
    });
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingBill(null);
    form.reset();
  };

  const handleRecordPayment = (bill: Bill) => {
    setSelectedBillForPayment(bill);
    setIsRecordPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = (data: any) => {
    if (selectedBillForPayment) {
      recordPaymentMutation.mutate({
        billId: selectedBillForPayment.id,
        amount: data.amount,
        paidDate: data.paidDate,
        dueDate: data.dueDate,
        status: data.status || "paid",
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: z.infer<typeof billFormSchema>) => {
    if (editingBill) {
      updateMutation.mutate({ id: editingBill.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getNextDueDate = (bill: Bill) => {
    if (bill.frequency === 'one_time' || !bill.dueDay) {
      return 'One-time';
    }
    
    const today = new Date();
    const nextDue = new Date(today.getFullYear(), today.getMonth(), bill.dueDay);
    if (nextDue < today) {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }
    
    return nextDue.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getCategoryChartData = () => {
    if (!summary?.categoryBreakdown) return [];
    
    return Object.entries(summary.categoryBreakdown).map(([category, data], index) => ({
      name: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category,
      value: Math.round(data.total),
      count: data.count,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
  };

  const filteredBills = getFilteredBills();

  if (billsLoading || summaryLoading) {
    return (
      <div className="min-h-screen bg-background font-sans">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-20 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Bills Management</h2>
              <p className="text-muted-foreground mt-1">Track and manage your bills and expenses</p>
            </div>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              data-testid="button-add-bill"
            >
              <Plus className="mr-2" size={16} />
              Add Bill
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Monthly Equivalent</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-monthly-equivalent">
                      {formatCurrency(summary?.monthlyEquivalent || 0)}
                    </p>
                  </div>
                  <DollarSign className="text-blue-500" size={24} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Due This Week</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-due-this-week">
                      {summary?.billsDueThisWeek || 0}
                    </p>
                  </div>
                  <AlertCircle className="text-orange-500" size={24} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Active Bills</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-active-bills">
                      {summary?.activeBillsCount || 0}
                    </p>
                  </div>
                  <Receipt className="text-green-500" size={24} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Annual Total</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-annual-total">
                      {formatCurrency((summary?.monthlyEquivalent || 0) * 12)}
                    </p>
                  </div>
                  <BarChart3 className="text-purple-500" size={24} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="list" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="list" data-testid="tab-bills-list">
                <Receipt className="mr-2" size={16} />
                Bills List
              </TabsTrigger>
              <TabsTrigger value="monthly" data-testid="tab-bills-monthly">
                <Calendar className="mr-2" size={16} />
                Monthly
              </TabsTrigger>
              <TabsTrigger value="yearly" data-testid="tab-bills-yearly">
                <TrendingUp className="mr-2" size={16} />
                Yearly
              </TabsTrigger>
              <TabsTrigger value="insights" data-testid="tab-bills-insights">
                <BarChart3 className="mr-2" size={16} />
                Insights
              </TabsTrigger>
              <TabsTrigger value="comparison" data-testid="tab-bills-comparison">
                <PieChartIcon className="mr-2" size={16} />
                Comparison
              </TabsTrigger>
            </TabsList>

            {/* Monthly Tracking Tab */}
            <TabsContent value="monthly">
              <div className="space-y-6">
                {/* Year Selector */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Calendar className="mr-2" size={20} />
                        Monthly Tracking - {selectedYear}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedYear(selectedYear - 1)}
                          data-testid="button-previous-year"
                        >
                          ←
                        </Button>
                        <span className="text-sm font-medium">{selectedYear}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedYear(selectedYear + 1)}
                          disabled={selectedYear >= new Date().getFullYear()}
                          data-testid="button-next-year"
                        >
                          →
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summaryLoading ? (
                      <div className="animate-pulse space-y-4">
                        <div className="h-64 bg-muted rounded"></div>
                      </div>
                    ) : (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={summary?.monthlyTotals || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="monthName" />
                            <YAxis />
                            <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                            <Bar dataKey="projected" fill="#3B82F6" name="Projected" />
                            <Bar dataKey="actual" fill="#10B981" name="Actual" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Breakdown Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summaryLoading ? (
                      <div className="animate-pulse space-y-2">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div key={i} className="h-8 bg-muted rounded"></div>
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-3">Month</th>
                              <th className="text-right p-3">Projected</th>
                              <th className="text-right p-3">Actual</th>
                              <th className="text-right p-3">Difference</th>
                              <th className="text-right p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary?.monthlyTotals?.map((month, index) => {
                              const difference = month.actual - month.projected;
                              const isOverBudget = difference > 0;
                              const currentMonth = new Date().getMonth() + 1;
                              const isCurrentMonth = month.month === currentMonth && selectedYear === new Date().getFullYear();
                              const isPastMonth = selectedYear < new Date().getFullYear() || 
                                                (selectedYear === new Date().getFullYear() && month.month < currentMonth);
                              
                              return (
                                <tr key={index} className={`border-b ${isCurrentMonth ? 'bg-blue-50 dark:bg-blue-950' : ''}`}>
                                  <td className="p-3 font-medium">{month.monthName}</td>
                                  <td className="p-3 text-right">{formatCurrency(month.projected)}</td>
                                  <td className="p-3 text-right">{formatCurrency(month.actual)}</td>
                                  <td className={`p-3 text-right ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                                    {difference !== 0 ? (isOverBudget ? '+' : '') + formatCurrency(difference) : '-'}
                                  </td>
                                  <td className="p-3 text-right">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      isCurrentMonth ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                      isPastMonth ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                    }`}>
                                      {isCurrentMonth ? 'Current' : isPastMonth ? 'Past' : 'Future'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Yearly Tracking Tab */}
            <TabsContent value="yearly">
              <div className="space-y-6">
                {/* Annual Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Annual Projection</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency((summary?.monthlyEquivalent || 0) * 12)}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Year to Date</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(
                              summary?.monthlyTotals?.slice(0, new Date().getMonth() + 1)
                                .reduce((sum, month) => sum + month.projected, 0) || 0
                            )}
                          </p>
                        </div>
                        <CalendarDays className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Remaining Year</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(
                              summary?.monthlyTotals?.slice(new Date().getMonth() + 1)
                                .reduce((sum, month) => sum + month.projected, 0) || 0
                            )}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quarterly Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="mr-2" size={20} />
                      Quarterly Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { name: 'Q1', months: [0, 1, 2], color: 'bg-blue-500' },
                        { name: 'Q2', months: [3, 4, 5], color: 'bg-green-500' },
                        { name: 'Q3', months: [6, 7, 8], color: 'bg-orange-500' },
                        { name: 'Q4', months: [9, 10, 11], color: 'bg-purple-500' },
                      ].map((quarter, index) => {
                        const total = summary?.monthlyTotals
                          ?.filter((_, monthIndex) => quarter.months.includes(monthIndex))
                          .reduce((sum, month) => sum + month.projected, 0) || 0;
                        
                        return (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium">{quarter.name}</h3>
                              <div className={`w-3 h-3 rounded-full ${quarter.color}`}></div>
                            </div>
                            <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                            <p className="text-sm text-muted-foreground">
                              {quarter.months.map(m => summary?.monthlyTotals?.[m]?.monthName.slice(0, 3)).join(', ')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Year-over-Year Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="mr-2" size={20} />
                      Year-over-Year Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="mx-auto h-12 w-12 mb-4" />
                      <p className="text-lg font-medium">Historical Data Coming Soon</p>
                      <p className="text-sm">
                        Year-over-year comparisons will appear here once you have multiple years of data.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Bills List Tab */}
            <TabsContent value="list">
              {/* Filters */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input 
                          placeholder="Search bills..." 
                          className="pl-10 w-64"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          data-testid="input-search-bills"
                        />
                      </div>
                      
                      <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value === "all" ? "all" : value)}>
                        <SelectTrigger className="w-40" data-testid="select-category-filter">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="subscriptions">Subscriptions</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                          <SelectItem value="loans">Loans</SelectItem>
                          <SelectItem value="groceries">Groceries</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "all" ? "all" : value)}>
                        <SelectTrigger className="w-32" data-testid="select-status-filter">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bills Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Bills ({filteredBills.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredBills.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <PieChartIcon className="mx-auto h-12 w-12 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No bills found</h3>
                      <p className="mb-4">
                        {searchTerm || categoryFilter !== "all" || statusFilter !== "all"
                          ? 'Try adjusting your filters to see more results.'
                          : 'Start by adding your first bill.'
                        }
                      </p>
                      <Button onClick={() => setIsAddModalOpen(true)} data-testid="button-add-first-bill">
                        Add Bill
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Bill</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Category</th>
                            <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Amount</th>
                            <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">Frequency</th>
                            <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">Next Due</th>
                            <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                            <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredBills.map((bill) => {
                            const IconComponent = CATEGORY_ICONS[bill.category as keyof typeof CATEGORY_ICONS] || Receipt;
                            
                            return (
                              <tr key={bill.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-bill-${bill.id}`}>
                                <td className="px-6 py-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                      <IconComponent className="text-blue-500" size={20} />
                                    </div>
                                    <div>
                                      <p className="font-medium text-foreground">{bill.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {bill.vendor || 'No vendor'}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <Badge className={CATEGORY_COLORS[bill.category as keyof typeof CATEGORY_COLORS]}>
                                    {CATEGORY_LABELS[bill.category as keyof typeof CATEGORY_LABELS]}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 text-right text-foreground font-medium">
                                  {formatCurrency(bill.amount)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-muted-foreground">
                                  {bill.frequency.replace('_', ' ')}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-muted-foreground">
                                  {getNextDueDate(bill)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <Badge variant={bill.isActive ? "default" : "secondary"}>
                                    {bill.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <Button 
                                      variant="ghost"
                                      size="sm"
                                      title="View Details"
                                      data-testid={`button-view-${bill.id}`}
                                    >
                                      <Eye size={16} />
                                    </Button>
                                    <Button 
                                      variant="ghost"
                                      size="sm"
                                      title="Record Payment"
                                      onClick={() => handleRecordPayment(bill)}
                                      data-testid={`button-record-payment-${bill.id}`}
                                    >
                                      <CreditCard size={16} />
                                    </Button>
                                    <Button 
                                      variant="ghost"
                                      size="sm"
                                      title="Edit"
                                      onClick={() => handleEditBill(bill)}
                                      data-testid={`button-edit-${bill.id}`}
                                    >
                                      <Edit size={16} />
                                    </Button>
                                    <Button 
                                      variant="ghost"
                                      size="sm"
                                      title="Delete"
                                      onClick={() => handleDelete(bill.id, bill.name)}
                                      disabled={deleteMutation.isPending}
                                      data-testid={`button-delete-${bill.id}`}
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category Breakdown Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChartIcon className="mr-2" size={20} />
                      Category Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getCategoryChartData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {getCategoryChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [formatCurrency(value), 'Monthly Amount']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                      {getCategoryChartData().map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="text-sm text-foreground">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Frequency Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="mr-2" size={20} />
                      Frequency Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Monthly Bills</p>
                          <p className="text-2xl font-bold text-foreground">
                            {formatCurrency(summary?.totalMonthlyBills || 0)}
                          </p>
                        </div>
                        <Calendar className="text-blue-500" size={24} />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Quarterly Bills</p>
                          <p className="text-2xl font-bold text-foreground">
                            {formatCurrency(summary?.totalQuarterlyBills || 0)}
                          </p>
                        </div>
                        <Calendar className="text-green-500" size={24} />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Yearly Bills</p>
                          <p className="text-2xl font-bold text-foreground">
                            {formatCurrency(summary?.totalYearlyBills || 0)}
                          </p>
                        </div>
                        <Calendar className="text-purple-500" size={24} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Comparison Tab */}
            <TabsContent value="comparison">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly vs Annual Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="mr-2" size={20} />
                      Monthly vs Annual View
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Monthly Equivalent</p>
                        <p className="text-3xl font-bold text-foreground">
                          {formatCurrency(summary?.monthlyEquivalent || 0)}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Annual Projection</p>
                        <p className="text-3xl font-bold text-foreground">
                          {formatCurrency((summary?.monthlyEquivalent || 0) * 12)}
                        </p>
                      </div>

                      <div className="border-t pt-4">
                        <p className="text-sm text-muted-foreground mb-4">Bill Distribution</p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Monthly</span>
                            <span className="text-sm font-medium">
                              {bills?.filter(b => b.frequency === 'monthly' && b.isActive).length || 0} bills
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Quarterly</span>
                            <span className="text-sm font-medium">
                              {bills?.filter(b => b.frequency === 'quarterly' && b.isActive).length || 0} bills
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Yearly</span>
                            <span className="text-sm font-medium">
                              {bills?.filter(b => b.frequency === 'yearly' && b.isActive).length || 0} bills
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">One-time</span>
                            <span className="text-sm font-medium">
                              {bills?.filter(b => b.frequency === 'one_time' && b.isActive).length || 0} bills
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Bills */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="mr-2" size={20} />
                      Upcoming Bills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {bills?.filter(bill => {
                        if (!bill.isActive || !bill.dueDay || bill.frequency === 'one_time') return false;
                        const today = new Date();
                        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                        const dueDate = new Date(today.getFullYear(), today.getMonth(), bill.dueDay);
                        if (dueDate < today) {
                          dueDate.setMonth(dueDate.getMonth() + 1);
                        }
                        return dueDate <= nextWeek;
                      }).slice(0, 5).map((bill) => (
                        <div key={bill.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                              <AlertCircle className="text-orange-500" size={16} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{bill.name}</p>
                              <p className="text-xs text-muted-foreground">{bill.vendor || 'No vendor'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">{formatCurrency(bill.amount)}</p>
                            <p className="text-xs text-muted-foreground">{getNextDueDate(bill)}</p>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-8 text-muted-foreground">
                          <Clock className="mx-auto h-8 w-8 mb-2" />
                          <p className="text-sm">No bills due this week</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Record Payment Modal */}
      <Dialog open={isRecordPaymentModalOpen} onOpenChange={setIsRecordPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment - {selectedBillForPayment?.name}</DialogTitle>
          </DialogHeader>
          
          <Form {...useForm({
            resolver: zodResolver(insertBillPaymentSchema.extend({
              amount: z.string().min(1, "Amount is required"),
              paidDate: z.string().min(1, "Paid date is required"),
              dueDate: z.string().min(1, "Due date is required"),
            })),
            defaultValues: {
              amount: selectedBillForPayment?.amount || "",
              paidDate: new Date().toISOString().split('T')[0],
              dueDate: new Date().toISOString().split('T')[0],
              status: "paid",
            }
          })}>
            {(paymentForm) => (
              <form onSubmit={paymentForm.handleSubmit(handleRecordPaymentSubmit)} className="space-y-4">
                <FormField
                  control={paymentForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field}
                          data-testid="input-amount" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="paidDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          data-testid="input-paid-date" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          data-testid="input-due-date" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsRecordPaymentModalOpen(false)}
                    data-testid="button-cancel-payment"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={recordPaymentMutation.isPending}
                    data-testid="button-submit-payment"
                  >
                    {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                  </Button>
                </div>
              </form>
            )}
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Bill Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBill ? 'Edit Bill' : 'Add New Bill'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Electricity Bill" {...field} data-testid="input-bill-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor/Provider</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., BSES" {...field} value={field.value || ""} data-testid="input-bill-vendor" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bill-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="subscriptions">Subscriptions</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                          <SelectItem value="loans">Loans</SelectItem>
                          <SelectItem value="groceries">Groceries</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-bill-amount" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bill-frequency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                          <SelectItem value="one_time">One Time</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("frequency") !== "one_time" && (
                  <FormField
                    control={form.control}
                    name="dueDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Day (1-31)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="31" 
                            placeholder="15" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            data-testid="input-bill-due-day" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes about this bill..." 
                        {...field} 
                        value={field.value || ""}
                        data-testid="textarea-bill-description" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Include this bill in calculations
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-bill-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reminderDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder Days Before</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="30" 
                          placeholder="3" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 3)}
                          data-testid="input-bill-reminder-days" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCloseModal}
                  data-testid="button-cancel-bill"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-bill"
                >
                  {editingBill ? 'Update Bill' : 'Add Bill'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}