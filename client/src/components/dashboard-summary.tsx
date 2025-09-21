import { useQuery } from "@tanstack/react-query";
import { ArrowUp, Wallet, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardSummary {
  totalInvested: number;
  currentValue: number;
  totalGains: number;
  gainsPercentage: number;
  changeVsLastMonth: number;
  upcomingPayments: number;
  nextPaymentAmount: number | null;
  nextPaymentDate: number | null;
  nextPaymentName: string | null;
}

export function DashboardSummary() {
  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Total Invested</p>
              <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-total-invested">
                {formatCurrency(summary?.totalInvested || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Wallet className="text-primary" size={24} />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <ArrowUp className={`${summary?.changeVsLastMonth !== undefined && summary.changeVsLastMonth >= 0 ? 'text-green-500' : 'text-red-500'} mr-1`} size={16} />
            <span className={`${summary?.changeVsLastMonth !== undefined && summary.changeVsLastMonth >= 0 ? 'text-green-500' : 'text-red-500'} font-medium`}>
              {summary?.changeVsLastMonth !== undefined && summary.changeVsLastMonth >= 0 ? '+' : ''}{summary?.changeVsLastMonth?.toFixed(1) || '0.0'}%
            </span>
            <span className="text-muted-foreground ml-2">vs last month</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Current Value</p>
              <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-current-value">
                {formatCurrency(summary?.currentValue || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-green-500" size={24} />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <ArrowUp className="text-green-500 mr-1" size={16} />
            <span className="text-green-500 font-medium">
              {formatCurrency(summary?.totalGains || 0)}
            </span>
            <span className="text-muted-foreground ml-2">total gains</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Due This Week</p>
              <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-due-this-week">
                {summary?.upcomingPayments || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Clock className="text-orange-500" size={24} />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <span className="text-muted-foreground">Next payment: </span>
            {summary?.nextPaymentAmount && summary?.nextPaymentDate ? (
              <span className="text-foreground font-medium ml-1">
                {formatCurrency(summary.nextPaymentAmount)} on {summary.nextPaymentDate}{summary.nextPaymentDate === 1 ? 'st' : summary.nextPaymentDate === 2 ? 'nd' : summary.nextPaymentDate === 3 ? 'rd' : 'th'}
              </span>
            ) : (
              <span className="text-muted-foreground font-medium ml-1">No upcoming payments</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
