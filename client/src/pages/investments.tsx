import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Investment, InvestmentType } from "@shared/schema";
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

// Dynamic color generation for investment types
const getTypeColor = (index: number) => {
  const colors = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  ];
  return colors[index % colors.length];
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

  const { data: investmentTypes, isLoading: investmentTypesLoading } = useQuery<InvestmentType[]>({
    queryKey: ["/api/investment-types"],
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
    
    const csvData = filteredInvestments.map(inv => {
      const typeLabel = investmentTypes?.find(t => t.id === inv.type)?.name || inv.type;
      return {
        Name: inv.name,
        Type: typeLabel,
        'Principal Amount': inv.principalAmount,
        'Start Date': inv.startDate,
        'Payment Frequency': inv.paymentFrequency,
        'Expected Return': inv.expectedReturn || 'N/A',
        'Maturity Date': inv.maturityDate || 'N/A',
        Status: inv.isActive ? 'Active' : 'Inactive'
      };
    });

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
    activeCount: filteredInvestments.filter(inv => inv.isActive).length
  };

  // Group investments by year and month
  const groupedInvestments = filteredInvestments.reduce((groups, investment) => {
    const date = new Date(investment.startDate);
    const monthYear = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
    const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!groups[sortKey]) {
      groups[sortKey] = {
        displayName: monthYear,
        sortKey,
        investments: []
      };
    }
    
    groups[sortKey].investments.push(investment);
    return groups;
  }, {} as Record<string, { displayName: string; sortKey: string; investments: Investment[] }>);

  // Sort groups by date (most recent first)
  const sortedGroups = Object.values(groupedInvestments).sort((a, b) => 
    b.sortKey.localeCompare(a.sortKey)
  );

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                      {investmentTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
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

        {/* Investments Grouped by Month */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">Investments ({filteredInvestments.length})</h3>
          </div>
          
          {filteredInvestments.length === 0 ? (
            <Card>
              <CardContent>
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
              </CardContent>
            </Card>
          ) : (
            sortedGroups.map((group) => (
              <Card key={group.sortKey}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-foreground flex items-center">
                      <Calendar className="mr-2" size={18} />
                      {group.displayName}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {group.investments.length} investment{group.investments.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Investment</th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Type</th>
                          <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Invested</th>
                          <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">Start Date</th>
                          <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {group.investments.map((investment) => {
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
                                {(() => {
                                  const typeIndex = investmentTypes?.findIndex(t => t.id === investment.type) ?? 0;
                                  const typeLabel = investmentTypes?.find(t => t.id === investment.type)?.name || investment.type;
                                  return (
                                    <Badge className={getTypeColor(typeIndex)}>
                                      {typeLabel}
                                    </Badge>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-4 text-right text-foreground font-medium">
                                {formatCurrency(investment.principalAmount)}
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
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      <AddInvestmentModal 
        open={isAddModalOpen} 
        onOpenChange={handleCloseModal}
        editingInvestment={editingInvestment}
      />
    </div>
  );
}