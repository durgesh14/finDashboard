import { useQuery } from "@tanstack/react-query";
import { Download, Calendar, TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Investment } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useState } from "react";

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#6B7280'];

export default function Reports() {
  const [timeRange, setTimeRange] = useState("6months");
  const [reportType, setReportType] = useState("performance");

  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
  });

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

  const calculatePerformanceData = () => {
    const filteredInvestments = getFilteredInvestments();
    if (!filteredInvestments.length) return [];
    
    return filteredInvestments.map(investment => {
      const principal = parseFloat(investment.principalAmount);
      const returnRate = investment.expectedReturn ? parseFloat(investment.expectedReturn) / 100 : 0.08;
      const months = Math.max(1, Math.floor((Date.now() - new Date(investment.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const currentValue = principal * Math.pow(1 + returnRate/12, months);
      const gains = currentValue - principal;
      const gainsPercentage = (gains / principal) * 100;

      return {
        name: investment.name.length > 15 ? investment.name.substring(0, 15) + '...' : investment.name,
        principal,
        currentValue,
        gains,
        gainsPercentage: gainsPercentage.toFixed(1),
        type: investment.type
      };
    });
  };

  const calculateAllocationData = () => {
    const filteredInvestments = getFilteredInvestments();
    if (!filteredInvestments.length) return [];

    const typeGroups = filteredInvestments.reduce((acc, investment) => {
      const type = investment.type;
      const amount = parseFloat(investment.principalAmount);
      
      if (!acc[type]) {
        acc[type] = { 
          type, 
          value: 0, 
          count: 0,
          name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        };
      }
      
      acc[type].value += amount;
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(typeGroups);
  };

  const calculateMonthlyTrends = () => {
    const filteredInvestments = getFilteredInvestments();
    if (!filteredInvestments.length) return [];
    
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
      
      const monthlyInvestments = filteredInvestments.filter(inv => {
        const startDate = new Date(inv.startDate);
        return startDate <= month;
      });

      const totalInvested = monthlyInvestments.reduce((sum, inv) => sum + parseFloat(inv.principalAmount), 0);
      const totalValue = monthlyInvestments.reduce((sum, inv) => {
        const principal = parseFloat(inv.principalAmount);
        const returnRate = inv.expectedReturn ? parseFloat(inv.expectedReturn) / 100 : 0.08;
        const monthsElapsed = Math.max(1, Math.floor((month.getTime() - new Date(inv.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));
        return sum + (principal * Math.pow(1 + returnRate/12, monthsElapsed));
      }, 0);

      trends.push({
        month: monthName,
        invested: Math.round(totalInvested),
        value: Math.round(totalValue),
        gains: Math.round(totalValue - totalInvested)
      });
    }

    return trends;
  };

  const performanceData = calculatePerformanceData();
  const allocationData = calculateAllocationData();
  const monthlyTrends = calculateMonthlyTrends();
  const filteredInvestments = getFilteredInvestments();

  const totalInvested = filteredInvestments.reduce((sum, inv) => sum + parseFloat(inv.principalAmount), 0);
  const totalCurrentValue = performanceData.reduce((sum, item) => sum + item.currentValue, 0);
  const totalGains = totalCurrentValue - totalInvested;
  const totalGainsPercentage = totalInvested > 0 ? ((totalGains / totalInvested) * 100) : 0;

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
      'Expected Return': inv.expectedReturn || 'N/A',
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
              <h2 className="text-2xl font-bold text-foreground">Investment Reports</h2>
              <p className="text-muted-foreground mt-1">Analyze your portfolio performance and trends</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                    <p className="text-muted-foreground text-sm font-medium">Current Value</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-current-value-report">
                      {formatCurrency(totalCurrentValue)}
                    </p>
                  </div>
                  <BarChart3 className="text-green-500" size={24} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Total Gains</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-total-gains-report">
                      {formatCurrency(totalGains)}
                    </p>
                  </div>
                  <TrendingUp className="text-green-500" size={24} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Returns</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-returns-report">
                      {totalGainsPercentage.toFixed(1)}%
                    </p>
                  </div>
                  <PieChartIcon className="text-purple-500" size={24} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts */}
        {filteredInvestments?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <PieChartIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Investment Data Available</h3>
              <p className="text-muted-foreground mb-4">
                {timeRange === 'all' 
                  ? 'Add some investments to see your portfolio analytics and reports.'
                  : `No investments found for the selected time range (${timeRange.replace('months', ' months').replace('year', ' year')}). Try selecting a different time range or add more investments.`
                }
              </p>
              <Button onClick={() => window.location.href = '/'} data-testid="button-add-investments">
                Add Investments
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2" size={20} />
                  Investment Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          formatCurrency(value), 
                          name === 'currentValue' ? 'Current Value' : 'Principal'
                        ]}
                      />
                      <Bar dataKey="principal" fill="#3B82F6" name="principal" />
                      <Bar dataKey="currentValue" fill="#10B981" name="currentValue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

          {/* Portfolio Allocation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="mr-2" size={20} />
                Portfolio Allocation
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
        )}

        {/* Monthly Trends */}
        {filteredInvestments?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2" size={20} />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                  <Line 
                    type="monotone" 
                    dataKey="invested" 
                    stroke="#3B82F6" 
                    strokeWidth={2} 
                    name="Invested"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10B981" 
                    strokeWidth={2} 
                    name="Current Value"
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