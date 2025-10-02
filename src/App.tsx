import { useState, useEffect } from "react";
import { LandingPage } from "./components/landing-page";
import { AuthPage } from "./components/auth-page";
import { AuthCallback } from "./components/auth-callback";
import { Dashboard } from "./components/dashboard";
import { GroupsPage } from "./components/groups-page";
import { NotificationsPage } from "./components/notifications-page";
import { ActivityPage } from "./components/activity-page";
import { SettingsPage } from "./components/settings-page";
import { authService } from "./lib/supabase-service";

type AppView = "landing" | "auth" | "auth-callback" | "dashboard" | "groups" | "notifications" | "activity" | "settings";

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>("landing");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for existing authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setIsAuthenticated(true);
          setCurrentView("dashboard");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: authListener } = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        setCurrentView("dashboard");
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setCurrentView("landing");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleGetStarted = () => {
    setCurrentView("auth");
  };

  const handleLogin = () => {
    // Authentication is now handled by Supabase auth state listener
    // This function is kept for compatibility with existing components
    setIsAuthenticated(true);
    setCurrentView("dashboard");
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setIsAuthenticated(false);
      setCurrentView("landing");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleBackToLanding = () => {
    setCurrentView("landing");
  };

  const handleLogoClick = () => {
    if (isAuthenticated) {
      setCurrentView("dashboard");
    } else {
      setCurrentView("landing");
    }
  };

  const handleGoToGroups = () => {
    setCurrentView("groups");
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
  };

  const handleGoToNotifications = () => {
    setCurrentView("notifications");
  };

  const handleGoToActivity = () => {
    setCurrentView("activity");
  };

  const handleGoToSettings = () => {
    setCurrentView("settings");
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ChaiPaani...</p>
        </div>
      </div>
    );
  }

  // Render the appropriate view
  switch (currentView) {
    case "auth":
      return (
        <AuthPage
          onLogin={handleLogin}
          onBack={handleBackToLanding}
          onLogoClick={handleLogoClick}
        />
      );

    case "auth-callback":
      return (
        <AuthCallback
          onAuthSuccess={() => setCurrentView("dashboard")}
          onAuthError={() => setCurrentView("auth")}
        />
      );
    
    case "dashboard":
      return (
        <Dashboard 
          onLogout={handleLogout}
          onGoToGroups={handleGoToGroups}
          onGoToNotifications={handleGoToNotifications}
          onGoToActivity={handleGoToActivity}
          onGoToSettings={handleGoToSettings}
          onLogoClick={handleLogoClick}
        />
      );
    
    case "groups":
      return (
        <GroupsPage 
          onLogout={handleLogout}
          onBack={handleBackToDashboard}
          onLogoClick={handleLogoClick}
        />
      );
    
    case "notifications":
      return (
        <NotificationsPage 
          onBack={handleBackToDashboard}
          onLogoClick={handleLogoClick}
        />
      );
    
    case "activity":
      return (
        <ActivityPage 
          onBack={handleBackToDashboard}
          onLogoClick={handleLogoClick}
        />
      );
    
    case "settings":
      return (
        <SettingsPage 
          onBack={handleBackToDashboard}
          onLogout={handleLogout}
          onLogoClick={handleLogoClick}
        />
      );
    
    default:
      return (
        <LandingPage 
          onGetStarted={handleGetStarted}
        />
      );
  }
}