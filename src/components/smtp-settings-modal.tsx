import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import * as Sonner from "sonner";
import { supabase } from "../lib/supabase";

interface SmtpSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SmtpSettingsModal({ open, onOpenChange }: SmtpSettingsModalProps) {
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendTest = async () => {
    // Validate test email
    const email = testEmail.trim();
    if (!email) {
      (Sonner as any)?.toast?.error?.("Please enter a test email address");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      (Sonner as any)?.toast?.error?.("Please enter a valid email address");
      return;
    }

    try {
      setIsSending(true);

      // Invoke Edge Function - server-side SMTP configuration is used
      const { data, error } = await supabase.functions.invoke("smtp-send", {
        body: {
          to: email,
          subject: "ChaiPaani SMTP Test",
          html: `<p>This is a test email from ChaiPaani.</p><p>If you received this, your SMTP configuration is working correctly.</p><p>Sent at: ${new Date().toISOString()}</p>`
        },
      });

      if (error) {
        (Sonner as any)?.toast?.error?.(error.message || "Failed to send test email");
        return;
      }

      if (!data?.ok) {
        (Sonner as any)?.toast?.error?.(data?.error || "SMTP function returned an error");
        return;
      }

      (Sonner as any)?.toast?.success?.("Test email sent successfully! Check your inbox.");
      setTestEmail(""); // Clear email after successful send
    } catch (e: any) {
      (Sonner as any)?.toast?.error?.(e?.message || "Could not send test email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Test SMTP Configuration</DialogTitle>
          <DialogDescription>
            Send a test email to verify your server's SMTP configuration. SMTP credentials are configured in your Supabase Edge Function environment variables (SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, etc).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Test Email Address</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="test-email"
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSending) {
                    handleSendTest();
                  }
                }}
                className="flex-1"
                autoComplete="email"
              />
              <Button 
                onClick={handleSendTest} 
                disabled={isSending || !testEmail.trim()}
              >
                {isSending ? "Sending..." : "Send Test"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your email address to receive a test message. The email will be sent using the SMTP settings configured on the server.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SmtpSettingsModal;
