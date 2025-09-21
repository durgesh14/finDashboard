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
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors pb-4" data-testid="nav-investments">
              Investments
            </a>
            <Link 
              href="/reports" 
              className={`${isActive("/reports") ? "text-primary font-medium border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} transition-colors pb-4`}
              data-testid="nav-reports"
            >
              Reports
            </Link>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors pb-4" data-testid="nav-settings">
              Settings
            </a>
          </nav>
          
          <div className="flex items-center space-x-4">
            <button 
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors" 
              data-testid="button-notifications"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </button>
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center" data-testid="avatar-user">
              <User className="text-muted-foreground" size={16} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
