import { useQuery } from "@tanstack/react-query";
import { Download, Calendar, TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Investment, Transaction, Bill } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useState } from "react";

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#6B7280'];

export default function Reports() {
  const [timeRange, setTimeRange] = useState("6months");
  const [reportType, setReportType] = useState("performance");

  const { data: investments, isLoading: investmentsLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions/grouped"],
  });

  const { data: bills, isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  const { data: billsSummary, isLoading: billsSummaryLoading } = useQuery<any>({
    queryKey: ["/api/bills/summary"],
  });

  const { data: billPayments, isLoading: billPaymentsLoading } = useQuery<any[]>({
    queryKey: ["/api/bills/payments"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: investmentTypes, isLoading: investmentTypesLoading } = useQuery<any[]>({
    queryKey: ["/api/investment-types"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isLoading = investmentsLoading || transactionsLoading || billsLoading || billsSummaryLoading || billPaymentsLoading || investmentTypesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background font-sans">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-64 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getFilteredInvestments = () => {
    if (!investments?.length) return [];
    
    const now = new Date();
    let cutoffDate: Date;
    
    switch (timeRange) {
      case "3months":
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case "6months":
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case "1year":
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default: // "all"
        cutoffDate = new Date(2000, 0, 1); // Far past date to include all
    }
    
    return investments.filter(investment => new Date(investment.startDate) >= cutoffDate);
  };

  const calculateInvestmentData = () => {
    const filteredInvestments = getFilteredInvestments();
    // If no filtered investments, use all investments to ensure charts show data
    const investmentsToUse = filteredInvestments.length > 0 ? filteredInvestments : (investments || []);
    if (!investmentsToUse.length) return [];
    
    return investmentsToUse.map(investment => {
      const principal = parseFloat(investment.principalAmount);
      const paymentAmount = investment.paymentAmount ? parseFloat(investment.paymentAmount) : 0;

      return {
        name: investment.name.length > 15 ? investment.name.substring(0, 15) + '...' : investment.name,
        principal,
        paymentAmount,
        type: investment.type,
        frequency: investment.paymentFrequency
      };
    });
  };

  const calculateAllocationData = () => {
    const filteredInvestments = getFilteredInvestments();
    // If no filtered investments, use all investments to ensure charts show data
    const investmentsToUse = filteredInvestments.length > 0 ? filteredInvestments : (investments || []);
    if (!investmentsToUse.length) return [];

    // Create investment type mapping
    const typeMap = investmentTypes?.reduce((map, type) => {
      map[type.id] = type.name;
      return map;
    }, {} as Record<string, string>) || {};

    const typeGroups = investmentsToUse.reduce((acc, investment) => {
      const typeId = investment.type;
      const typeName = typeMap[typeId] || typeId; // Use name if available, fallback to ID
      const amount = parseFloat(investment.principalAmount);
      
      if (!acc[typeName]) {
        acc[typeName] = { 
          type: typeName, 
          value: 0, 
          count: 0,
          name: typeName
        };
      }
      
      acc[typeName].value += amount;
      acc[typeName].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(typeGroups);
  };

  const calculateTransactionTrends = () => {
    if (!transactions?.length) return [];
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const trends = [];

    let monthsToShow = 6; // default
    switch (timeRange) {
      case "3months":
        monthsToShow = 3;
        break;
      case "6months":
        monthsToShow = 6;
        break;
      case "1year":
        monthsToShow = 12;
        break;
      case "all":
        monthsToShow = 24; // Show 2 years max for all time
        break;
    }

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = months[month.getMonth()];
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
      
      // Calculate total transactions for this month
      let monthlyTransactionTotal = 0;
      transactions.forEach(group => {
        group.transactions.forEach((tx: any) => {
          const txDate = new Date(tx.transactionDate);
          if (txDate >= month && txDate <= monthEnd) {
            monthlyTransactionTotal += parseFloat(tx.amount);
          }
        });
      });

      trends.push({
        month: monthName,
        transactions: Math.round(monthlyTransactionTotal)
      });
    }

    return trends;
  };

  const filteredInvestments = getFilteredInvestments();
  const investmentData = calculateInvestmentData();
  const allocationData = calculateAllocationData();
  const transactionTrends = calculateTransactionTrends();

  // Total Invested should show ALL investments, not filtered by time range
  const totalInvested = investments?.reduce((sum, inv) => sum + parseFloat(inv.principalAmount), 0) || 0;
  const totalTransactions = transactions?.reduce((sum, group) => {
    return sum + group.transactions.reduce((groupSum: number, tx: any) => groupSum + parseFloat(tx.amount), 0);
  }, 0) || 0;
  const totalBillsMonthly = billsSummary?.monthlyEquivalent || 0;
  const activeBillsCount = bills?.filter(bill => bill.isActive).length || 0;
  const totalBillPayments = billPayments?.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0;

  const exportToCSV = () => {
    if (!filteredInvestments?.length) {
      alert('No investment data to export');
      return;
    }
    
    const csvData = filteredInvestments.map(inv => ({
      Name: inv.name,
      Type: inv.type,
      'Principal Amount': inv.principalAmount,
      'Start Date': inv.startDate,
      'Payment Frequency': inv.paymentFrequency,
      'Payment Amount': inv.paymentAmount || 'N/A',
      'Maturity Date': inv.maturityDate || 'N/A',
      Status: inv.isActive ? 'Active' : 'Inactive'
    }));

    // Escape quotes by doubling them and add UTF-8 BOM
    const escapeCSV = (value: string | number) => {
      const stringValue = String(value);
      if (stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return `"${stringValue}"`;
    };

    const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const csvContent = bom + [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealth-track-report-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.style.display = 'none';
    a.setAttribute('data-testid', 'csv-download-link');
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    // Show success message
    alert('Report exported successfully!');
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Financial Reports</h2>
              <p className="text-muted-foreground mt-1">View your investments, transactions, and bills overview</p>
            </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32" data-testid="select-time-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="1year">1 Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={exportToCSV} 
                variant="outline" 
                disabled={!filteredInvestments?.length}
                data-testid="button-export-csv"
              >
                <Download className="mr-2" size={16} />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Total Invested</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-total-invested-report">
                      {formatCurrency(totalInvested)}
                    </p>
                  </div>
                  <TrendingUp className="text-blue-500" size={24} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Monthly Bills</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-monthly-bills-report">
                      {formatCurrency(totalBillsMonthly)}
                    </p>
                  </div>
                  <TrendingUp className="text-orange-500" size={24} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Bill Payments</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-bill-payments-report">
                      {formatCurrency(totalBillPayments)}
                    </p>
                  </div>
                  <PieChartIcon className="text-purple-500" size={24} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Investment Overview Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2" size={20} />
                Investment Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={investmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value), 
                        name === 'paymentAmount' ? 'Payment Amount' : 'Principal Amount'
                      ]}
                    />
                    <Bar dataKey="principal" fill="#3B82F6" name="principal" />
                    <Bar dataKey="paymentAmount" fill="#10B981" name="paymentAmount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Investment Allocation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="mr-2" size={20} />
                Investment Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {allocationData.map((item, index) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
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
        </div>

        {/* Bills Category Breakdown */}
        {billsSummary?.categoryBreakdown && Object.keys(billsSummary.categoryBreakdown).length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="mr-2" size={20} />
              Bills Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(billsSummary.categoryBreakdown).map(([category, data]: [string, any]) => ({
                  category: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  amount: Math.round(data.total),
                  count: data.count
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'amount' ? formatCurrency(value) : `${value} bills`,
                      name === 'amount' ? 'Monthly Amount' : 'Count'
                    ]}
                  />
                  <Bar dataKey="amount" fill="#8B5CF6" name="amount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Bill Payment History */}
        {billPayments && billPayments.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2" size={20} />
              Bill Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={billPayments.slice(-12).map((payment: any) => ({
                  date: new Date(payment.paidDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  amount: parseFloat(payment.amount),
                  status: payment.status
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Payment Amount']} />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#F59E0B" 
                    strokeWidth={2} 
                    name="Payment Amount"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Transaction Trends */}
        {transactions && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2" size={20} />
              Monthly Transaction Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={transactionTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                  <Line 
                    type="monotone" 
                    dataKey="transactions" 
                    stroke="#3B82F6" 
                    strokeWidth={2} 
                    name="Transactions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        )}
      </main>
    </div>
  );
}