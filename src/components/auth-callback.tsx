import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { invitationService } from "../lib/supabase-service";
import { Loader2 } from "lucide-react";

interface AuthCallbackProps {
  onAuthSuccess: () => void;
  onAuthError: () => void;
}

export function AuthCallback({ onAuthSuccess, onAuthError }: AuthCallbackProps) {
  const [error, setError] = useState<string | null>(null);
  const [processingInvite, setProcessingInvite] = useState(false);

  useEffect(() => {
    console.log("AuthCallback component mounted, checking URL:", window.location.href);
    console.log("URL hash:", window.location.hash);
    console.log("URL search:", window.location.search);

    const handleAuthCallback = async () => {
      try {
        // Check for invitation token in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const inviteToken = urlParams.get('token');

        console.log("Invitation token found:", inviteToken);

        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();

        console.log("getSession result:", { data, error });

        if (error) {
          console.error("Auth callback error:", error);
          setError(error.message);
          // Redirect to auth page after a delay
          setTimeout(() => onAuthError(), 3000);
          return;
        }

        if (data.session) {
          console.log("Authentication successful:", data.session.user);

          // If there's an invitation token, process it
          if (inviteToken) {
            setProcessingInvite(true);
            console.log("Processing invitation token:", inviteToken);

            try {
              const inviteResult = await invitationService.acceptByToken(inviteToken);
              console.log("Invitation acceptance result:", inviteResult);

              if (inviteResult.error) {
                console.error("Failed to accept invitation:", inviteResult.error);
                setError(`Failed to join group: ${inviteResult.error.message || 'Unknown error'}`);
                setTimeout(() => onAuthSuccess(), 3000); // Still redirect to dashboard
                return;
              }

              console.log("Successfully joined group via invitation!");
              // Continue to dashboard
            } catch (inviteError) {
              console.error("Error processing invitation:", inviteError);
              setError("Successfully logged in, but failed to process group invitation");
              setTimeout(() => onAuthSuccess(), 3000);
              return;
            }
          }

          // Redirect to dashboard
          onAuthSuccess();
        } else {
          console.log("No session found, redirecting to auth");
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
        <h2 className="text-xl font-semibold">
          {processingInvite ? "Joining Group" : "Completing Authentication"}
        </h2>
        <p className="text-muted-foreground">
          {processingInvite
            ? "Please wait while we add you to the group..."
            : "Please wait while we log you in..."
          }
        </p>
      </div>
    </div>
  );
}
