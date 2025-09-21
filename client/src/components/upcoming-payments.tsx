import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Investment } from "@shared/schema";
import { formatDistanceToNow, isBefore, isToday, addDays } from "date-fns";

interface PaymentItem {
  investment: Investment;
  dueDate: Date;
  status: 'overdue' | 'due_today' | 'due_soon' | 'upcoming';
  daysUntilDue: number;
}

export function UpcomingPayments() {
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

  const today = new Date();
  const nextWeek = addDays(today, 7);

  // Calculate upcoming payments
  const upcomingPayments: PaymentItem[] = investments
    ?.filter(inv => inv.paymentFrequency !== 'one_time' && inv.dueDay && inv.isActive)
    .map(investment => {
      const dueDate = new Date(today.getFullYear(), today.getMonth(), investment.dueDay!);
      if (isBefore(dueDate, today)) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: PaymentItem['status'] = 'upcoming';
      if (daysUntilDue < 0) status = 'overdue';
      else if (daysUntilDue === 0) status = 'due_today';
      else if (daysUntilDue <= 7) status = 'due_soon';

      return {
        investment,
        dueDate,
        status,
        daysUntilDue
      };
    })
    .filter(payment => payment.daysUntilDue <= 7)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue) || [];

  const getStatusColor = (status: PaymentItem['status']) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'due_today':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'due_soon':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    }
  };

  const getStatusDotColor = (status: PaymentItem['status']) => {
    switch (status) {
      case 'overdue':
      case 'due_today':
        return 'bg-red-500';
      case 'due_soon':
        return 'bg-orange-500';
      default:
        return 'bg-green-500';
    }
  };

  const getStatusText = (payment: PaymentItem) => {
    if (payment.status === 'overdue') return 'Overdue';
    if (payment.status === 'due_today') return 'Due Today';
    if (payment.daysUntilDue === 1) return 'Due tomorrow';
    return `Due in ${payment.daysUntilDue} days`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Upcoming Payments</h3>
        
        {upcomingPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No upcoming payments</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingPayments.slice(0, 4).map((payment, index) => (
              <div 
                key={payment.investment.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(payment.status)}`}
                data-testid={`payment-${payment.investment.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusDotColor(payment.status)}`}></div>
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {payment.investment.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getStatusText(payment)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(parseFloat(payment.investment.principalAmount))}
                </span>
              </div>
            ))}
          </div>
        )}
        
        <button 
          className="w-full mt-4 text-primary text-sm font-medium hover:text-primary/80 transition-colors"
          data-testid="button-view-all-payments"
        >
          View All Payments
        </button>
      </CardContent>
    </Card>
  );
}
