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
import * as Sonner from "sonner";
import { authService, invitationService } from "./lib/supabase-service";

type AppView = "landing" | "auth" | "dashboard" | "groups" | "group" | "notifications" | "activity" | "settings";

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    // Restore last view from localStorage
    const saved = localStorage.getItem("app_current_view");
    const validViews: AppView[] = ["landing", "auth", "dashboard", "groups", "group", "notifications", "activity", "settings"];
    return (saved && validViews.includes(saved as AppView)) ? (saved as AppView) : "landing";
  });  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(() => {
    // Restore last group ID from localStorage
    return localStorage.getItem("app_current_group_id");
  });
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);

  // Check for existing authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Capture invite token from URL on first load (query or hash)
        const url = new URL(window.location.href);
        const tokenFromUrl = url.searchParams.get("token");
        // Hash format: #token=abc
        const hash = window.location.hash || "";
        const tokenFromHash = (() => {
          if (!hash) return null;
          const match = /[#&]?token=([^&]+)/.exec(hash);
          return match ? decodeURIComponent(match[1]) : null;
        })();

        const token = tokenFromUrl || tokenFromHash;
        if (token) {
          // Persist token until we complete acceptance after login
          sessionStorage.setItem("invite_token", token);
          setPendingInviteToken(token);
          // Clean the URL so token isn't kept in history
          url.searchParams.delete("token");
          const cleanHash = hash.replace(/[#&]?token=[^&]*/g, "").replace(/^#&/, "#");
          const finalHash = cleanHash === "#" ? "" : cleanHash;
          window.history.replaceState({}, "", url.pathname + url.search + finalHash);
        } else {
          const saved = sessionStorage.getItem("invite_token");
          if (saved) setPendingInviteToken(saved);
        }

        const user = await authService.getCurrentUser();
        if (user) {
          setIsAuthenticated(true);
          // Keep the restored view from localStorage if valid, otherwise go to dashboard
          // Use a callback to access current state
          setCurrentView(prevView => {
            if (!prevView || prevView === "landing" || prevView === "auth") {
              return "dashboard";
            }
            return prevView;
          });
          // Check group ID in a separate state update
          setCurrentView(prevView => {
            if (prevView === "group" && !currentGroupId) {
              return "dashboard";
            }
            return prevView;
          });        } else {
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

  // Persist currentView to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      localStorage.setItem("app_current_view", currentView);
    }
  }, [currentView, isAuthenticated, isLoading]);

  // Persist currentGroupId to localStorage whenever it changes
  useEffect(() => {
    if (currentGroupId) {
      localStorage.setItem("app_current_group_id", currentGroupId);
    } else {
      localStorage.removeItem("app_current_group_id");
    }
  }, [currentGroupId]);

  // When authenticated and we have a pending invite token, accept it once
  useEffect(() => {
    const acceptIfPending = async () => {
      if (!isAuthenticated) return;
      const token = pendingInviteToken || sessionStorage.getItem("invite_token");
      if (!token) return;
      try {
        const { error } = await invitationService.acceptByToken(token);
        if (error) {
          console.error("Failed to accept invite token:", error);
          (Sonner as any)?.toast?.error?.((error as any)?.message || "Failed to join group from invitation");
        } else {
          (Sonner as any)?.toast?.success?.("Joined group successfully");
        }
      } catch (e) {
        console.error("Error accepting invite token:", e);
        (Sonner as any)?.toast?.error?.("Unable to accept invitation");
      } finally {
        sessionStorage.removeItem("invite_token");
        setPendingInviteToken(null);
      }
    };
    acceptIfPending();
  }, [isAuthenticated, pendingInviteToken]);
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
    setCurrentGroupId(null);
    // Clear saved state on logout
    localStorage.removeItem("app_current_view");
    localStorage.removeItem("app_current_group_id");
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
