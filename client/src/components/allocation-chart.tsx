import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Investment } from "@shared/schema";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = {
  mutual_fund: '#3B82F6',
  fixed_deposit: '#10B981',
  recurring_deposit: '#8B5CF6',
  lic: '#F59E0B',
  ppf: '#EF4444',
  stocks: '#06B6D4',
  other: '#6B7280'
};

const TYPE_LABELS = {
  mutual_fund: 'Mutual Funds',
  fixed_deposit: 'Fixed Deposits',
  recurring_deposit: 'Recurring Deposits',
  lic: 'LIC/Insurance',
  ppf: 'PPF',
  stocks: 'Stocks',
  other: 'Other'
};

export function AllocationChart() {
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
  });

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-muted rounded"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-6 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group investments by type and calculate totals
  const allocationData = investments?.reduce((acc, investment) => {
    const type = investment.type as keyof typeof COLORS;
    const amount = parseFloat(investment.principalAmount);
    
    if (!acc[type]) {
      acc[type] = {
        type,
        label: TYPE_LABELS[type] || type,
        value: 0,
        color: COLORS[type] || COLORS.other
      };
    }
    
    acc[type].value += amount;
    return acc;
  }, {} as Record<string, { type: string; label: string; value: number; color: string }>) || {};

  const chartData = Object.values(allocationData);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return ((value / total) * 100).toFixed(1);
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Investment Allocation</h3>
          <select className="text-sm border border-border rounded-md px-3 py-1 bg-background text-foreground">
            <option>Current Value</option>
            <option>Invested Amount</option>
          </select>
        </div>
        
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>No investments to display</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Amount']}
                    labelFormatter={(label) => `${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm font-medium text-foreground" data-testid={`allocation-${item.type}`}>
                      {item.label}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(item.value)} ({formatPercentage(item.value)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
