import { Bell, ChartLine, User } from "lucide-react";
import { Link, useLocation } from "wouter";

export function Header() {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ChartLine className="text-primary-foreground text-sm" size={16} />
            </div>
            <Link href="/">
              <h1 className="text-xl font-semibold text-foreground cursor-pointer">WealthTrack</h1>
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-6">
            <Link 
              href="/" 
              className={`${isActive("/") ? "text-primary font-medium border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} transition-colors pb-4`}
              data-testid="nav-dashboard"
            >
              Dashboard
            </Link>
            <Link 
              href="/investments" 
              className={`${isActive("/investments") ? "text-primary font-medium border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} transition-colors pb-4`}
              data-testid="nav-investments"
            >
              Investments
            </Link>
            <Link 
              href="/bills" 
              className={`${isActive("/bills") ? "text-primary font-medium border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} transition-colors pb-4`}
              data-testid="nav-bills"
            >
              Bills
            </Link>
            <Link 
              href="/reports" 
              className={`${isActive("/reports") ? "text-primary font-medium border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} transition-colors pb-4`}
              data-testid="nav-reports"
            >
              Reports
            </Link>
            <Link 
              href="/settings" 
              className={`${isActive("/settings") ? "text-primary font-medium border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} transition-colors pb-4`}
              data-testid="nav-settings"
            >
              Settings
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center" data-testid="avatar-user">
              <User className="text-muted-foreground" size={16} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
