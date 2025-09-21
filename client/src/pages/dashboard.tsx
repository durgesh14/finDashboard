import { useState } from "react";
import { Plus } from "lucide-react";
import { Header } from "@/components/header";
import { DashboardSummary } from "@/components/dashboard-summary";
import { AllocationChart } from "@/components/allocation-chart";
import { PortfolioPerformance } from "@/components/upcoming-payments";
import { InvestmentTable } from "@/components/investment-table";
import { AddInvestmentModal } from "@/components/add-investment-modal";
import { Button } from "@/components/ui/button";
import { Investment } from "@shared/schema";

export default function Dashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  
  const handleEditInvestment = (investment: Investment) => {
    setEditingInvestment(investment);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsAddModalOpen(open);
    if (!open) {
      setEditingInvestment(null);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
              <p className="text-muted-foreground mt-1">Track your investments and savings</p>
            </div>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 sm:mt-0"
              data-testid="button-add-investment"
            >
              <Plus className="mr-2" size={16} />
              Add Investment
            </Button>
          </div>
          
          <DashboardSummary />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <AllocationChart />
          </div>
          <PortfolioPerformance />
        </div>

        <InvestmentTable onEditInvestment={handleEditInvestment} />
      </main>

      <AddInvestmentModal 
        open={isAddModalOpen} 
        onOpenChange={handleCloseModal}
        editingInvestment={editingInvestment}
      />
    </div>
  );
}
