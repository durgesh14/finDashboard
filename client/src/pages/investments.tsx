import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Investment } from "@shared/schema";
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart,
  BarChart3,
  Target,
  Clock
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AddInvestmentModal } from "@/components/add-investment-modal";

const TYPE_COLORS = {
  mutual_fund: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  fixed_deposit: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  recurring_deposit: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  lic: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  ppf: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  stocks: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
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

export default function Investments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

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

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
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

  const getFilteredAndSortedInvestments = () => {
    if (!investments) return [];

    let filtered = investments.filter(investment => {
      const matchesSearch = investment.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || !typeFilter || investment.type === typeFilter;
      const matchesStatus = statusFilter === "all" || !statusFilter || 
        (statusFilter === "active" && investment.isActive) ||
        (statusFilter === "inactive" && !investment.isActive);
      return matchesSearch && matchesType && matchesStatus;
    });

    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "amount":
          aValue = parseFloat(a.principalAmount);
          bValue = parseFloat(b.principalAmount);
          break;
        case "returns":
          aValue = calculateReturns(a);
          bValue = calculateReturns(b);
          break;
        case "startDate":
          aValue = new Date(a.startDate);
          bValue = new Date(b.startDate);
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

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

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const exportToCSV = () => {
    const filteredInvestments = getFilteredAndSortedInvestments();
    if (!filteredInvestments.length) {
      toast({
        title: "No data",
        description: "No investments to export",
      });
      return;
    }
    
    const csvData = filteredInvestments.map(inv => ({
      Name: inv.name,
      Type: TYPE_LABELS[inv.type as keyof typeof TYPE_LABELS],
      'Principal Amount': inv.principalAmount,
      'Current Value': calculateCurrentValue(inv).toFixed(2),
      'Returns (%)': calculateReturns(inv).toFixed(2),
      'Start Date': inv.startDate,
      'Payment Frequency': inv.paymentFrequency,
      'Expected Return': inv.expectedReturn || 'N/A',
      'Maturity Date': inv.maturityDate || 'N/A',
      Status: inv.isActive ? 'Active' : 'Inactive'
    }));

    const escapeCSV = (value: string | number) => {
      const stringValue = String(value);
      if (stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return `"${stringValue}"`;
    };

    const bom = '\uFEFF';
    const csvContent = bom + [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investments-${new Date().toISOString().split('T')[0]}.csv`;
    a.style.display = 'none';
    a.setAttribute('data-testid', 'csv-download-link');
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: "Investments exported successfully!",
    });
  };

  const filteredInvestments = getFilteredAndSortedInvestments();

  const totalStats = {
    totalInvested: filteredInvestments.reduce((sum, inv) => sum + parseFloat(inv.principalAmount), 0),
    totalValue: filteredInvestments.reduce((sum, inv) => sum + calculateCurrentValue(inv), 0),
    averageReturn: filteredInvestments.length > 0 ? 
      filteredInvestments.reduce((sum, inv) => sum + calculateReturns(inv), 0) / filteredInvestments.length : 0,
    activeCount: filteredInvestments.filter(inv => inv.isActive).length
  };

  if (isLoading) {
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
              <h2 className="text-2xl font-bold text-foreground">Investment Management</h2>
              <p className="text-muted-foreground mt-1">Manage and monitor all your investments</p>
            </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <Button 
                onClick={exportToCSV}
                variant="outline"
                data-testid="button-export-investments"
              >
                <Download className="mr-2" size={16} />
                Export
              </Button>
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                data-testid="button-add-investment"
              >
                <Plus className="mr-2" size={16} />
                Add Investment
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Total Invested</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-total-invested">
                      {formatCurrency(totalStats.totalInvested)}
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
                    <p className="text-muted-foreground text-sm font-medium">Current Value</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-current-value">
                      {formatCurrency(totalStats.totalValue)}
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
                    <p className="text-muted-foreground text-sm font-medium">Avg. Returns</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-avg-returns">
                      {totalStats.averageReturn.toFixed(1)}%
                    </p>
                  </div>
                  <Target className="text-purple-500" size={24} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Active Investments</p>
                    <p className="text-2xl font-bold text-foreground mt-2" data-testid="text-active-count">
                      {totalStats.activeCount}
                    </p>
                  </div>
                  <BarChart3 className="text-orange-500" size={24} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input 
                      placeholder="Search investments..." 
                      className="pl-10 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search"
                    />
                  </div>
                  
                  <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-40" data-testid="select-type-filter">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="mutual_fund">Mutual Funds</SelectItem>
                      <SelectItem value="fixed_deposit">Fixed Deposits</SelectItem>
                      <SelectItem value="recurring_deposit">Recurring Deposits</SelectItem>
                      <SelectItem value="lic">Insurance</SelectItem>
                      <SelectItem value="ppf">PPF</SelectItem>
                      <SelectItem value="stocks">Stocks</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
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

                <div className="flex items-center space-x-4">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-32" data-testid="select-sort-by">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="returns">Returns</SelectItem>
                      <SelectItem value="startDate">Start Date</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    data-testid="button-sort-order"
                  >
                    {sortOrder === "asc" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Investments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Investments ({filteredInvestments.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredInvestments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <PieChart className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No investments found</h3>
                <p className="mb-4">
                  {searchTerm || typeFilter || statusFilter 
                    ? 'Try adjusting your filters to see more results.'
                    : 'Start by adding your first investment.'
                  }
                </p>
                <Button onClick={() => setIsAddModalOpen(true)} data-testid="button-add-first-investment">
                  Add Investment
                </Button>
              </div>
            ) : (
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
                      <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">Start Date</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredInvestments.map((investment) => {
                      const currentValue = calculateCurrentValue(investment);
                      const returns = calculateReturns(investment);
                      
                      return (
                        <tr key={investment.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-investment-${investment.id}`}>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-foreground">{investment.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {investment.expectedReturn ? `${investment.expectedReturn}%` : 'N/A'} • {investment.paymentFrequency.replace('_', ' ')}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={TYPE_COLORS[investment.type as keyof typeof TYPE_COLORS]}>
                              {TYPE_LABELS[investment.type as keyof typeof TYPE_LABELS]}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right text-foreground font-medium">
                            {formatCurrency(investment.principalAmount)}
                          </td>
                          <td className="px-6 py-4 text-right text-foreground font-medium">
                            {formatCurrency(currentValue)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-medium ${returns >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {returns >= 0 ? '+' : ''}{returns.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={investment.isActive ? "default" : "secondary"}>
                              {investment.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-muted-foreground">
                            {new Date(investment.startDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button 
                                variant="ghost"
                                size="sm"
                                title="View Details"
                                data-testid={`button-view-${investment.id}`}
                              >
                                <Eye size={16} />
                              </Button>
                              <Button 
                                variant="ghost"
                                size="sm"
                                title="Edit"
                                onClick={() => handleEditInvestment(investment)}
                                data-testid={`button-edit-${investment.id}`}
                              >
                                <Edit size={16} />
                              </Button>
                              <Button 
                                variant="ghost"
                                size="sm"
                                title="Delete"
                                onClick={() => handleDelete(investment.id, investment.name)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-${investment.id}`}
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
      </main>

      <AddInvestmentModal 
        open={isAddModalOpen} 
        onOpenChange={handleCloseModal}
        editingInvestment={editingInvestment}
      />
    </div>
  );
}