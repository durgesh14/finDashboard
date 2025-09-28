import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { InvestmentType, BillCategory } from "@shared/schema";
import { 
  User, 
  Bell, 
  DollarSign, 
  Shield, 
  Download, 
  Upload,
  Moon, 
  Sun, 
  Globe,
  Palette,
  Database,
  Calendar,
  Target,
  TrendingUp,
  Mail,
  Smartphone,
  Save,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Settings as SettingsIcon,
  Tags,
  FolderOpen,
  FileText,
  AlertCircle
} from "lucide-react";

const investmentTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isDefault: z.boolean().optional()
});

const billCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  isDefault: z.boolean().optional()
});

const profileSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profile"],
  });

  // Profile form
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        username: (userProfile as any).username || "",
        email: (userProfile as any).email || "",
      });
    }
  }, [userProfile, profileForm]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { username?: string; email?: string }) => {
      return apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    paymentReminders: true,
    performanceAlerts: true,
    weeklyReports: true,
    monthlyStatements: false,
    marketUpdates: false
  });

  // Investment preferences
  const [investmentSettings, setInvestmentSettings] = useState({
    defaultCurrency: "INR",
    riskTolerance: "moderate",
    defaultReturnRate: "8",
    autoReinvest: false,
    compoundingFrequency: "monthly",
    portfolioTarget: "1000000",
    retirementGoal: "5000000"
  });

  // App preferences
  const [appSettings, setAppSettings] = useState({
    theme: "system",
    compactMode: false,
    showDecimals: true,
    dateFormat: "DD/MM/YYYY",
    autoRefresh: true,
    refreshInterval: "30",
    dashboardLayout: "default"
  });

  // Modal states
  const [isAddInvestmentTypeOpen, setIsAddInvestmentTypeOpen] = useState(false);
  const [isAddBillCategoryOpen, setIsAddBillCategoryOpen] = useState(false);
  const [editingInvestmentType, setEditingInvestmentType] = useState<InvestmentType | null>(null);
  const [editingBillCategory, setEditingBillCategory] = useState<BillCategory | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch custom investment types
  const { data: investmentTypes, isLoading: investmentTypesLoading } = useQuery<InvestmentType[]>({
    queryKey: ["/api/investment-types"],
  });

  // Fetch custom bill categories
  const { data: billCategories, isLoading: billCategoriesLoading } = useQuery<BillCategory[]>({
    queryKey: ["/api/bill-categories"],
  });

  // Investment type form
  const investmentTypeForm = useForm<z.infer<typeof investmentTypeSchema>>({
    resolver: zodResolver(investmentTypeSchema),
    defaultValues: {
      name: "",
      isDefault: false,
    },
  });

  // Bill category form
  const billCategoryForm = useForm<z.infer<typeof billCategorySchema>>({
    resolver: zodResolver(billCategorySchema),
    defaultValues: {
      name: "",
      isDefault: false,
    },
  });

  // Investment type mutations
  const createInvestmentTypeMutation = useMutation({
    mutationFn: (data: z.infer<typeof investmentTypeSchema>) =>
      apiRequest("POST", "/api/investment-types", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investment-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setIsAddInvestmentTypeOpen(false);
      investmentTypeForm.reset();
      toast({ title: "Investment type created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create investment type", variant: "destructive" });
    },
  });

  const updateInvestmentTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof investmentTypeSchema> }) =>
      apiRequest("PUT", `/api/investment-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investment-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setIsAddInvestmentTypeOpen(false);
      setEditingInvestmentType(null);
      investmentTypeForm.reset();
      toast({ title: "Investment type updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update investment type", variant: "destructive" });
    },
  });

  const deleteInvestmentTypeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/investment-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investment-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      toast({ title: "Investment type deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete investment type", variant: "destructive" });
    },
  });

  // Bill category mutations
  const createBillCategoryMutation = useMutation({
    mutationFn: (data: z.infer<typeof billCategorySchema>) =>
      apiRequest("POST", "/api/bill-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bill-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      setIsAddBillCategoryOpen(false);
      billCategoryForm.reset();
      toast({ title: "Bill category created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create bill category", variant: "destructive" });
    },
  });

  const updateBillCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof billCategorySchema> }) =>
      apiRequest("PUT", `/api/bill-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bill-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      setIsAddBillCategoryOpen(false);
      setEditingBillCategory(null);
      billCategoryForm.reset();
      toast({ title: "Bill category updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update bill category", variant: "destructive" });
    },
  });

  const deleteBillCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bill-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bill-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({ title: "Bill category deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete bill category", variant: "destructive" });
    },
  });

  // Import mutation
  const importDataMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/data/import", data),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setIsImporting(false);
      toast({ title: "Data imported successfully" });
    },
    onError: () => {
      setIsImporting(false);
      toast({ title: "Failed to import data", variant: "destructive" });
    },
  });

  const handleSaveProfile = (data: { username: string; email?: string }) => {
    const updateData: { username?: string; email?: string } = {};
    
    if (data.username) updateData.username = data.username;
    if (data.email && data.email.trim() !== "") updateData.email = data.email;
    
    updateProfileMutation.mutate(updateData);
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notifications Updated", 
      description: "Your notification preferences have been saved.",
    });
  };

  const handleSaveInvestments = () => {
    toast({
      title: "Investment Preferences Updated",
      description: "Your investment settings have been saved.",
    });
  };

  const handleSaveApp = () => {
    toast({
      title: "App Settings Updated",
      description: "Your app preferences have been saved.",
    });
  };

  const handleExportData = async () => {
    try {
      const response = await fetch("/api/data/export");
      if (!response.ok) throw new Error("Export failed");
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `financial-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setIsImporting(true);
        importDataMutation.mutate(data);
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid file format. Please select a valid export file.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleEditInvestmentType = (type: InvestmentType) => {
    setEditingInvestmentType(type);
    investmentTypeForm.reset({
      name: type.name,
      isDefault: type.isDefault,
    });
    setIsAddInvestmentTypeOpen(true);
  };

  const handleEditBillCategory = (category: BillCategory) => {
    setEditingBillCategory(category);
    billCategoryForm.reset({
      name: category.name,
      isDefault: category.isDefault,
    });
    setIsAddBillCategoryOpen(true);
  };

  const handleDeleteInvestmentType = (id: string, name: string, isDefault: boolean) => {
    if (isDefault) {
      toast({
        title: "Cannot Delete",
        description: "Default investment types cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteInvestmentTypeMutation.mutate(id);
    }
  };

  const handleDeleteBillCategory = (id: string, name: string, isDefault: boolean) => {
    if (isDefault) {
      toast({
        title: "Cannot Delete",
        description: "Default bill categories cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteBillCategoryMutation.mutate(id);
    }
  };

  const onSubmitInvestmentType = (data: z.infer<typeof investmentTypeSchema>) => {
    if (editingInvestmentType) {
      updateInvestmentTypeMutation.mutate({ id: editingInvestmentType.id, data });
    } else {
      createInvestmentTypeMutation.mutate(data);
    }
  };

  const onSubmitBillCategory = (data: z.infer<typeof billCategorySchema>) => {
    if (editingBillCategory) {
      updateBillCategoryMutation.mutate({ id: editingBillCategory.id, data });
    } else {
      createBillCategoryMutation.mutate(data);
    }
  };

  const closeInvestmentTypeModal = () => {
    setIsAddInvestmentTypeOpen(false);
    setEditingInvestmentType(null);
    investmentTypeForm.reset();
  };

  const closeBillCategoryModal = () => {
    setIsAddBillCategoryOpen(false);
    setEditingBillCategory(null);
    billCategoryForm.reset();
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground mt-1">Manage your account and application preferences</p>
        </div>

        <Tabs defaultValue="customization" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="customization" data-testid="tab-customization">
              <Tags className="mr-2" size={16} />
              Customization
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="mr-2" size={16} />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">
              <Bell className="mr-2" size={16} />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="investments" data-testid="tab-investments">
              <TrendingUp className="mr-2" size={16} />
              Investments
            </TabsTrigger>
            <TabsTrigger value="data" data-testid="tab-data">
              <Database className="mr-2" size={16} />
              Data
            </TabsTrigger>
          </TabsList>

          {/* Customization Settings */}
          <TabsContent value="customization">
            <div className="space-y-6">
              {/* Investment Types */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <TrendingUp className="mr-2" size={20} />
                      Investment Types
                    </span>
                    <Button 
                      onClick={() => setIsAddInvestmentTypeOpen(true)}
                      size="sm"
                      data-testid="button-add-investment-type"
                    >
                      <Plus className="mr-2" size={16} />
                      Add Type
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your custom investment types. These will appear in the Investment section dropdowns.
                  </p>
                  
                  {investmentTypesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {investmentTypes?.map((type) => (
                        <div 
                          key={type.id} 
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-testid={`investment-type-${type.id}`}
                        >
                          <div>
                            <p className="font-medium text-foreground">{type.name}</p>
                            {type.isDefault && (
                              <p className="text-xs text-muted-foreground">Default type</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditInvestmentType(type)}
                              data-testid={`button-edit-investment-type-${type.id}`}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInvestmentType(type.id, type.name, type.isDefault)}
                              disabled={type.isDefault}
                              data-testid={`button-delete-investment-type-${type.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bill Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <FolderOpen className="mr-2" size={20} />
                      Bill Categories
                    </span>
                    <Button 
                      onClick={() => setIsAddBillCategoryOpen(true)}
                      size="sm"
                      data-testid="button-add-bill-category"
                    >
                      <Plus className="mr-2" size={16} />
                      Add Category
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your custom bill categories. These will appear in the Bills section dropdowns.
                  </p>
                  
                  {billCategoriesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {billCategories?.map((category) => (
                        <div 
                          key={category.id} 
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-testid={`bill-category-${category.id}`}
                        >
                          <div>
                            <p className="font-medium text-foreground">{category.name}</p>
                            {category.isDefault && (
                              <p className="text-xs text-muted-foreground">Default category</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditBillCategory(category)}
                              data-testid={`button-edit-bill-category-${category.id}`}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBillCategory(category.id, category.name, category.isDefault)}
                              disabled={category.isDefault}
                              data-testid={`button-delete-bill-category-${category.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Data Management */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2" size={20} />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Export & Import</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Export Data</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Download all your financial data including investments, bills, and custom categories.
                      </p>
                      <Button 
                        onClick={handleExportData}
                        variant="outline"
                        className="w-full"
                        data-testid="button-export-data"
                      >
                        <Download className="mr-2" size={16} />
                        Export All Data
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Import Data</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Import financial data from a previously exported file.
                      </p>
                      <div className="w-full">
                        <Input
                          type="file"
                          accept=".json"
                          onChange={handleImportData}
                          disabled={isImporting}
                          className="hidden"
                          id="import-file"
                        />
                        <Label
                          htmlFor="import-file"
                          className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-md"
                          data-testid="button-import-data"
                        >
                          <Upload className="mr-2" size={16} />
                          {isImporting ? "Importing..." : "Import Data"}
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 p-4 bg-muted rounded-lg">
                    <AlertCircle className="text-muted-foreground mt-0.5" size={16} />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">Important Notes:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Exported data includes all investments, bills, payments, and custom types</li>
                        <li>Import will add to existing data, not replace it</li>
                        <li>Default investment types and bill categories are not included in exports</li>
                        <li>Keep your export files secure as they contain sensitive financial information</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2" size={20} />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {profileLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="animate-spin mr-2" size={16} />
                    Loading profile...
                  </div>
                ) : (
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-6">
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-username"
                                placeholder="Enter your username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                data-testid="input-email"
                                placeholder="Enter your email address"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? (
                          <RefreshCw className="animate-spin mr-2" size={16} />
                        ) : (
                          <Save className="mr-2" size={16} />
                        )}
                        {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings - Keep existing */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2" size={20} />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="text-muted-foreground" size={20} />
                      <div>
                        <p className="text-sm font-medium">Email Notifications</p>
                        <p className="text-xs text-muted-foreground">Receive updates via email</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailNotifications: checked})}
                      data-testid="switch-email-notifications"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="text-muted-foreground" size={20} />
                      <div>
                        <p className="text-sm font-medium">Push Notifications</p>
                        <p className="text-xs text-muted-foreground">Receive browser notifications</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, pushNotifications: checked})}
                      data-testid="switch-push-notifications"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveNotifications} data-testid="button-save-notifications">
                  <Save className="mr-2" size={16} />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Investment Settings - Keep existing */}
          <TabsContent value="investments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2" size={20} />
                  Investment Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                    <Select value={investmentSettings.riskTolerance} onValueChange={(value) => setInvestmentSettings({...investmentSettings, riskTolerance: value})}>
                      <SelectTrigger data-testid="select-risk-tolerance">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="aggressive">Aggressive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultReturnRate">Default Expected Return (%)</Label>
                    <Input 
                      id="defaultReturnRate"
                      type="number"
                      step="0.1"
                      value={investmentSettings.defaultReturnRate}
                      onChange={(e) => setInvestmentSettings({...investmentSettings, defaultReturnRate: e.target.value})}
                      data-testid="input-default-return-rate"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveInvestments} data-testid="button-save-investments">
                  <Save className="mr-2" size={16} />
                  Save Investment Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Investment Type Modal */}
      <Dialog open={isAddInvestmentTypeOpen} onOpenChange={closeInvestmentTypeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInvestmentType ? "Edit Investment Type" : "Add Investment Type"}
            </DialogTitle>
          </DialogHeader>
          <Form {...investmentTypeForm}>
            <form onSubmit={investmentTypeForm.handleSubmit(onSubmitInvestmentType)} className="space-y-4">
              <FormField
                control={investmentTypeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-investment-type-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={closeInvestmentTypeModal}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createInvestmentTypeMutation.isPending || updateInvestmentTypeMutation.isPending}
                  data-testid="button-submit-investment-type"
                >
                  {editingInvestmentType ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Bill Category Modal */}
      <Dialog open={isAddBillCategoryOpen} onOpenChange={closeBillCategoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBillCategory ? "Edit Bill Category" : "Add Bill Category"}
            </DialogTitle>
          </DialogHeader>
          <Form {...billCategoryForm}>
            <form onSubmit={billCategoryForm.handleSubmit(onSubmitBillCategory)} className="space-y-4">
              <FormField
                control={billCategoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-bill-category-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={closeBillCategoryModal}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createBillCategoryMutation.isPending || updateBillCategoryMutation.isPending}
                  data-testid="button-submit-bill-category"
                >
                  {editingBillCategory ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}