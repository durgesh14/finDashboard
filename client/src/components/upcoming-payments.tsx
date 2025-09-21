import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Investment } from "@shared/schema";
import { TrendingUp, TrendingDown, Calendar, Plus } from "lucide-react";

interface PortfolioInsight {
  investment: Investment;
  currentValue: number;
  gains: number;
  gainsPercentage: number;
  monthsInvested: number;
}

export function PortfolioPerformance() {
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
  });

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate portfolio insights
  const portfolioInsights: PortfolioInsight[] = investments
    ?.filter(inv => inv.isActive)
    .map(investment => {
      const principal = parseFloat(investment.principalAmount);
      const returnRate = investment.expectedReturn ? parseFloat(investment.expectedReturn) / 100 : 0.08;
      const startDate = new Date(investment.startDate);
      const currentDate = new Date();
      const months = Math.max(0, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      
      // Skip future-dated investments
      if (startDate > currentDate) {
        return {
          investment,
          currentValue: principal,
          gains: 0,
          gainsPercentage: 0,
          monthsInvested: 0
        };
      }
      
      const currentValue = principal * Math.pow(1 + returnRate/12, months);
      const gains = currentValue - principal;
      const gainsPercentage = principal > 0 ? (gains / principal * 100) : 0;

      return {
        investment,
        currentValue,
        gains,
        gainsPercentage,
        monthsInvested: months
      };
    })
    .sort((a, b) => b.gainsPercentage - a.gainsPercentage) || [];

  const topPerformers = portfolioInsights.slice(0, 3);
  const recentInvestments = portfolioInsights
    .sort((a, b) => new Date(b.investment.createdAt).getTime() - new Date(a.investment.createdAt).getTime())
    .slice(0, 2);

  const hasInvestments = portfolioInsights.length > 0;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Portfolio Performance</h3>
        
        {!hasInvestments ? (
          <div className="text-center py-8 text-muted-foreground">
            <Plus className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm">Start tracking your investments</p>
            <p className="text-xs">Add your first investment to see insights</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Performers */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Top Performers</h4>
              <div className="space-y-3">
                {topPerformers.map((insight, index) => (
                  <div 
                    key={insight.investment.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    data-testid={`performer-${insight.investment.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        {insight.gainsPercentage >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={`text-xs font-medium ${
                          insight.gainsPercentage >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {insight.gainsPercentage >= 0 ? '+' : ''}{insight.gainsPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {insight.investment.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {insight.investment.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(insight.currentValue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Activity</h4>
              <div className="space-y-3">
                {recentInvestments.map((insight) => (
                  <div 
                    key={insight.investment.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    data-testid={`recent-${insight.investment.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-3 w-3 text-blue-500" />
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {insight.investment.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(insight.investment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(parseFloat(insight.investment.principalAmount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
