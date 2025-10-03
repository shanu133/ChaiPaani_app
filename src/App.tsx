import { useState, useEffect, lazy, Suspense } from "react";
const LandingPage = lazy(() => import("./components/landing-page").then(m => ({ default: m.LandingPage })));
const AuthPage = lazy(() => import("./components/auth-page").then(m => ({ default: m.AuthPage })));
const Dashboard = lazy(() => import("./components/dashboard").then(m => ({ default: m.Dashboard })));
const GroupsPage = lazy(() => import("./components/groups-page").then(m => ({ default: m.GroupsPage })));
const GroupPage = lazy(() => import("./components/group-page").then(m => ({ default: m.GroupPage })));
const NotificationsPage = lazy(() => import("./components/notifications-page").then(m => ({ default: m.NotificationsPage })));
const ActivityPage = lazy(() => import("./components/activity-page").then(m => ({ default: m.ActivityPage })));
const SettingsPage = lazy(() => import("./components/settings-page").then(m => ({ default: m.SettingsPage })));
import { Toaster } from "./components/ui/sonner";
import { authService } from "./lib/supabase-service";

type AppView = "landing" | "auth" | "dashboard" | "groups" | "group" | "notifications" | "activity" | "settings";

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>("landing");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  // Check for existing authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setIsAuthenticated(true);
          setCurrentView("dashboard");
        } else {
          setIsAuthenticated(false);
          setCurrentView("landing");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
        setCurrentView("landing");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        setCurrentView("dashboard");
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setCurrentView("landing");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    setCurrentView("auth");
  };

  const handleLogin = () => {
    // Auth is now handled by Supabase, this is just for navigation
    setCurrentView("auth");
  };

  const handleLogout = async () => {
    await authService.signOut();
    setIsAuthenticated(false);
    setCurrentView("landing");
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

  const handleGoToGroup = (groupId: string) => {
    setCurrentGroupId(groupId);
    setCurrentView("group");
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Render the appropriate view
  return (
    <>
      {(() => {
        switch (currentView) {
          case "auth":
            return (
              <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Loading…</p></div></div>}>
                <AuthPage
                onLogin={handleLogin}
                onBack={handleBackToLanding}
                onLogoClick={handleLogoClick}
                />
              </Suspense>
            );

          case "dashboard":
            return (
              <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Loading…</p></div></div>}>
                <Dashboard
                onLogout={handleLogout}
                onGoToGroups={handleGoToGroups}
                onGoToNotifications={handleGoToNotifications}
                onGoToActivity={handleGoToActivity}
                onGoToSettings={handleGoToSettings}
                onLogoClick={handleLogoClick}
                />
              </Suspense>
            );

          case "groups":
            return (
              <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Loading…</p></div></div>}>
                <GroupsPage
                onLogout={handleLogout}
                onBack={handleBackToDashboard}
                onLogoClick={handleLogoClick}
                onGoToGroup={handleGoToGroup}
                />
              </Suspense>
            );

          case "group":
            return currentGroupId ? (
              <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Loading…</p></div></div>}>
                <GroupPage
                groupId={currentGroupId}
                onBack={handleBackToDashboard}
                onLogout={handleLogout}
                onLogoClick={handleLogoClick}
                />
              </Suspense>
            ) : (
              <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Loading…</p></div></div>}>
                <GroupsPage
                onLogout={handleLogout}
                onBack={handleBackToDashboard}
                onLogoClick={handleLogoClick}
                onGoToGroup={handleGoToGroup}
                />
              </Suspense>
            );

          case "notifications":
            return (
              <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Loading…</p></div></div>}>
                <NotificationsPage
                onBack={handleBackToDashboard}
                onLogoClick={handleLogoClick}
                />
              </Suspense>
            );

          case "activity":
            return (
              <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Loading…</p></div></div>}>
                <ActivityPage
                onBack={handleBackToDashboard}
                onLogoClick={handleLogoClick}
                />
              </Suspense>
            );

          case "settings":
            return (
              <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Loading…</p></div></div>}>
                <SettingsPage
                onBack={handleBackToDashboard}
                onLogout={handleLogout}
                onLogoClick={handleLogoClick}
                />
              </Suspense>
            );

          default:
            return (
              <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Loading…</p></div></div>}>
                <LandingPage
                onGetStarted={handleGetStarted}
                />
              </Suspense>
            );
        }
      })()}
      <Toaster />
    </>
  );
}
