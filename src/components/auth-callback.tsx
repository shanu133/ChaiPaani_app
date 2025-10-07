import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";
import { invitationService } from "../lib/supabase-service";
import { Loader2 } from "lucide-react";

interface AuthCallbackProps {
  onAuthSuccess: () => void;
  onAuthError: () => void;
}

export function AuthCallback({ onAuthSuccess, onAuthError }: AuthCallbackProps) {
  const [error, setError] = useState<string | null>(null);
  const [processingInvite, setProcessingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
  logger.debug("AuthCallback mounted");

    const handleAuthCallback = async () => {
      try {
        // Check for invitation token in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        setInviteToken(token);

  if (token) logger.info("Invitation token present");

        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();

  // Do not log raw session; only log presence of session and any error message
  logger.debug("getSession called", { hasSession: Boolean(data?.session), error: error?.message });

        if (error) {
          logger.error("Auth callback error", { message: error.message });
          setError(error.message);
          // Redirect to auth page after a delay
          setTimeout(() => onAuthError(), 3000);
          return;
        }

        if (data.session) {
          logger.info("Authentication successful", { userId: data.session.user?.id });

          // If there's an invitation token, process it
          if (token) {
            setProcessingInvite(true);
            logger.info("Processing invitation token");

            try {
              const inviteResult = await invitationService.acceptByToken(token);
              logger.debug("Invitation acceptance attempted", { success: !inviteResult.error });

              if (inviteResult.error) {
                logger.error("Failed to accept invitation", { message: (inviteResult.error as any)?.message || String(inviteResult.error) });
                const msg = (inviteResult.error as any)?.message || 'Unknown error';
                setInviteError(`You are logged in but were not added to the group: ${msg}`);
                setProcessingInvite(false);
                return; // Do not auto-redirect; show retry UI instead
              }

              logger.info("Joined group via invitation");
              // Continue to dashboard
            } catch (inviteError) {
              logger.error("Error processing invitation", { message: (inviteError as any)?.message || String(inviteError) });
              const msg = (inviteError as any)?.message || 'Unknown error';
              setInviteError(`You are logged in but were not added to the group: ${msg}`);
              setProcessingInvite(false);
              return; // Do not auto-redirect; show retry UI instead
            }
          }

          // Redirect to dashboard
          onAuthSuccess();
        } else {
          logger.info("No session found, redirecting to auth");
          // No session, redirect to auth
          onAuthError();
        }
      } catch (err) {
        logger.error("Unexpected error during auth callback", { message: (err as any)?.message || String(err) });
        setError("An unexpected error occurred");
        setTimeout(() => onAuthError(), 3000);
      }
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-red-600">
            <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
            <p>{error}</p>
          </div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }          <div className="flex items-center justify-center gap-3">
            <button
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              onClick={async () => {
                if (!inviteToken) return;
                setProcessingInvite(true);
                setInviteError(null);
                try {
                  const result = await invitationService.acceptByToken(inviteToken);
                  if (result.error) {
                    const msg = (result.error as any)?.message || 'Unknown error';
                    setInviteError(`You are logged in but were not added to the group: ${msg}`);
                    setProcessingInvite(false);
                    return;
                  }
                  logger.info("Invitation accepted after retry");
                  onAuthSuccess();
                } catch (err) {
                  logger.error("Retry invitation failed", { message: (err as any)?.message || String(err) });
                  const msg = (err as any)?.message || 'Unknown error';
                  setInviteError(`You are logged in but were not added to the group: ${msg}`);
                  setProcessingInvite(false);
                }
              }}
              disabled={processingInvite}
            >
              {processingInvite ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Retrying...</span>
              ) : (
                <span>Retry adding me to the group</span>
              )}
            </button>
            <button
              className="inline-flex items-center px-4 py-2 rounded-md border border-input hover:bg-accent"
              onClick={() => onAuthSuccess()}
            >
              Go to dashboard
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            You can retry now or proceed to your dashboard. If the issue persists, the invite may be expired or you may already be a member.
          </p>
        </div>
      </div>
    );
  }

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
