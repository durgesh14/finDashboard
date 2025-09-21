import { useState } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Bell, 
  DollarSign, 
  Shield, 
  Download, 
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
  RefreshCw
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  
  // Profile settings
  const [profileSettings, setProfileSettings] = useState({
    firstName: "John",
    lastName: "Doe", 
    email: "john.doe@example.com",
    phone: "+91 98765 43210",
    currency: "INR",
    language: "en",
    timezone: "Asia/Kolkata"
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

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile settings have been saved successfully.",
    });
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

  const exportData = () => {
    toast({
      title: "Export Started",
      description: "Your data export will be ready shortly. You'll receive an email when it's complete.",
    });
  };

  const clearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast({
      title: "Cache Cleared",
      description: "Application cache has been cleared successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground mt-1">Manage your account and application preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="app" data-testid="tab-app">
              <Palette className="mr-2" size={16} />
              App
            </TabsTrigger>
          </TabsList>

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName"
                      value={profileSettings.firstName}
                      onChange={(e) => setProfileSettings({...profileSettings, firstName: e.target.value})}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName"
                      value={profileSettings.lastName}
                      onChange={(e) => setProfileSettings({...profileSettings, lastName: e.target.value})}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email"
                    type="email"
                    value={profileSettings.email}
                    onChange={(e) => setProfileSettings({...profileSettings, email: e.target.value})}
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone"
                    value={profileSettings.phone}
                    onChange={(e) => setProfileSettings({...profileSettings, phone: e.target.value})}
                    data-testid="input-phone"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select value={profileSettings.currency} onValueChange={(value) => setProfileSettings({...profileSettings, currency: value})}>
                      <SelectTrigger data-testid="select-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={profileSettings.language} onValueChange={(value) => setProfileSettings({...profileSettings, language: value})}>
                      <SelectTrigger data-testid="select-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="ta">Tamil</SelectItem>
                        <SelectItem value="te">Telugu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={profileSettings.timezone} onValueChange={(value) => setProfileSettings({...profileSettings, timezone: value})}>
                      <SelectTrigger data-testid="select-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} data-testid="button-save-profile">
                  <Save className="mr-2" size={16} />
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
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
                  <h4 className="text-sm font-medium text-foreground">Communication Channels</h4>
                  
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
                      <Smartphone className="text-muted-foreground" size={20} />
                      <div>
                        <p className="text-sm font-medium">SMS Notifications</p>
                        <p className="text-xs text-muted-foreground">Receive updates via SMS</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, smsNotifications: checked})}
                      data-testid="switch-sms-notifications"
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

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Investment Notifications</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Payment Reminders</p>
                      <p className="text-xs text-muted-foreground">Get notified about upcoming payments</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.paymentReminders}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, paymentReminders: checked})}
                      data-testid="switch-payment-reminders"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Performance Alerts</p>
                      <p className="text-xs text-muted-foreground">Alerts for significant portfolio changes</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.performanceAlerts}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, performanceAlerts: checked})}
                      data-testid="switch-performance-alerts"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Weekly Reports</p>
                      <p className="text-xs text-muted-foreground">Weekly portfolio summary</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.weeklyReports}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, weeklyReports: checked})}
                      data-testid="switch-weekly-reports"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Monthly Statements</p>
                      <p className="text-xs text-muted-foreground">Detailed monthly statements</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.monthlyStatements}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, monthlyStatements: checked})}
                      data-testid="switch-monthly-statements"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Market Updates</p>
                      <p className="text-xs text-muted-foreground">News and market insights</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.marketUpdates}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, marketUpdates: checked})}
                      data-testid="switch-market-updates"
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

          {/* Investment Settings */}
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

                <div className="space-y-2">
                  <Label htmlFor="compoundingFrequency">Compounding Frequency</Label>
                  <Select value={investmentSettings.compoundingFrequency} onValueChange={(value) => setInvestmentSettings({...investmentSettings, compoundingFrequency: value})}>
                    <SelectTrigger data-testid="select-compounding-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-Reinvest Returns</p>
                    <p className="text-xs text-muted-foreground">Automatically reinvest gains and dividends</p>
                  </div>
                  <Switch 
                    checked={investmentSettings.autoReinvest}
                    onCheckedChange={(checked) => setInvestmentSettings({...investmentSettings, autoReinvest: checked})}
                    data-testid="switch-auto-reinvest"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground flex items-center">
                    <Target className="mr-2" size={16} />
                    Financial Goals
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="portfolioTarget">Portfolio Target (₹)</Label>
                      <Input 
                        id="portfolioTarget"
                        type="number"
                        value={investmentSettings.portfolioTarget}
                        onChange={(e) => setInvestmentSettings({...investmentSettings, portfolioTarget: e.target.value})}
                        data-testid="input-portfolio-target"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="retirementGoal">Retirement Goal (₹)</Label>
                      <Input 
                        id="retirementGoal"
                        type="number"
                        value={investmentSettings.retirementGoal}
                        onChange={(e) => setInvestmentSettings({...investmentSettings, retirementGoal: e.target.value})}
                        data-testid="input-retirement-goal"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveInvestments} data-testid="button-save-investments">
                  <Save className="mr-2" size={16} />
                  Save Investment Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* App Settings */}
          <TabsContent value="app">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="mr-2" size={20} />
                  App Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Display Settings</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select value={appSettings.theme} onValueChange={(value) => setAppSettings({...appSettings, theme: value})}>
                        <SelectTrigger data-testid="select-theme">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Date Format</Label>
                      <Select value={appSettings.dateFormat} onValueChange={(value) => setAppSettings({...appSettings, dateFormat: value})}>
                        <SelectTrigger data-testid="select-date-format">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Compact Mode</p>
                      <p className="text-xs text-muted-foreground">Display more data in less space</p>
                    </div>
                    <Switch 
                      checked={appSettings.compactMode}
                      onCheckedChange={(checked) => setAppSettings({...appSettings, compactMode: checked})}
                      data-testid="switch-compact-mode"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Show Decimal Places</p>
                      <p className="text-xs text-muted-foreground">Display decimal places in currency values</p>
                    </div>
                    <Switch 
                      checked={appSettings.showDecimals}
                      onCheckedChange={(checked) => setAppSettings({...appSettings, showDecimals: checked})}
                      data-testid="switch-show-decimals"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Data & Performance</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Auto Refresh</p>
                      <p className="text-xs text-muted-foreground">Automatically refresh data</p>
                    </div>
                    <Switch 
                      checked={appSettings.autoRefresh}
                      onCheckedChange={(checked) => setAppSettings({...appSettings, autoRefresh: checked})}
                      data-testid="switch-auto-refresh"
                    />
                  </div>

                  {appSettings.autoRefresh && (
                    <div className="space-y-2">
                      <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                      <Select value={appSettings.refreshInterval} onValueChange={(value) => setAppSettings({...appSettings, refreshInterval: value})}>
                        <SelectTrigger data-testid="select-refresh-interval">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 seconds</SelectItem>
                          <SelectItem value="30">30 seconds</SelectItem>
                          <SelectItem value="60">1 minute</SelectItem>
                          <SelectItem value="300">5 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground flex items-center">
                    <Database className="mr-2" size={16} />
                    Data Management
                  </h4>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div>
                      <p className="text-sm font-medium">Export All Data</p>
                      <p className="text-xs text-muted-foreground">Download your complete investment data</p>
                    </div>
                    <Button variant="outline" onClick={exportData} data-testid="button-export-data">
                      <Download className="mr-2" size={16} />
                      Export Data
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div>
                      <p className="text-sm font-medium">Clear Cache</p>
                      <p className="text-xs text-muted-foreground">Clear application cache and stored data</p>
                    </div>
                    <Button variant="outline" onClick={clearCache} data-testid="button-clear-cache">
                      <RefreshCw className="mr-2" size={16} />
                      Clear Cache
                    </Button>
                  </div>
                </div>

                <Button onClick={handleSaveApp} data-testid="button-save-app">
                  <Save className="mr-2" size={16} />
                  Save App Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}