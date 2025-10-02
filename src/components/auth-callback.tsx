import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2 } from "lucide-react";

interface AuthCallbackProps {
  onAuthSuccess: () => void;
  onAuthError: () => void;
}

export function AuthCallback({ onAuthSuccess, onAuthError }: AuthCallbackProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          setError(error.message);
          // Redirect to auth page after a delay
          setTimeout(() => onAuthError(), 3000);
          return;
        }

        if (data.session) {
          console.log("Authentication successful:", data.session.user);
          // Redirect to dashboard
          onAuthSuccess();
        } else {
          // No session, redirect to auth
          onAuthError();
        }
      } catch (err) {
        console.error("Unexpected error during auth callback:", err);
        setError("An unexpected error occurred");
        setTimeout(() => onAuthError(), 3000);
      }
    };

    handleAuthCallback();
  }, [onAuthSuccess, onAuthError]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-red-600">
            <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
            <p>{error}</p>
          </div>
          <p className="text-muted-foreground">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <h2 className="text-xl font-semibold">Completing Authentication</h2>
        <p className="text-muted-foreground">Please wait while we log you in...</p>
      </div>
    </div>
  );
}