import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Investment } from "@shared/schema";
import { Calendar, Plus, Wallet } from "lucide-react";

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

  // Get recent investments
  const recentInvestments = investments
    ?.filter(inv => inv.isActive)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5) || [];

  const hasInvestments = recentInvestments.length > 0;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Investments</h3>
        
        {!hasInvestments ? (
          <div className="text-center py-8 text-muted-foreground">
            <Plus className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm">Start tracking your investments</p>
            <p className="text-xs">Add your first investment to see recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentInvestments.map((investment) => (
              <div 
                key={investment.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                data-testid={`recent-${investment.id}`}
              >
                <div className="flex items-center space-x-3">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {investment.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(investment.createdAt).toLocaleDateString()} • {investment.paymentFrequency.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(parseFloat(investment.principalAmount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
