import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import * as Sonner from "sonner";
import { supabase } from "../lib/supabase";

type SmtpConfig = {
  host: string;
  port: string; // keep as string for input handling
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  secure: boolean; // TLS/STARTTLS
};

interface SmtpSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Local storage keys for ephemeral client-side config. Do NOT ship secrets to clients in production.
const LS_KEY = "smtp_config_local";

function loadLocal(): SmtpConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return {
      host: obj.host || "",
      port: obj.port || "587",
      username: obj.username || "",
      password: "", // never rehydrate password back into inputs
      fromName: obj.fromName || "ChaiPaani",
      fromEmail: obj.fromEmail || "noreply@example.com",
      secure: Boolean(obj.secure),
    };
  } catch {
    return null;
  }
}

function saveLocal(cfg: Partial<SmtpConfig>) {
  try {
    const existing = loadLocal() || {
      host: "",
      port: "587",
      username: "",
      password: "",
      fromName: "ChaiPaani",
      fromEmail: "noreply@example.com",
      secure: false,
    } as SmtpConfig;
    const merged = { ...existing, ...cfg };
    // Never persist the password
    const { password, ...rest } = merged;
    localStorage.setItem(LS_KEY, JSON.stringify(rest));
  } catch {
    // ignore
  }
}

export function SmtpSettingsModal({ open, onOpenChange }: SmtpSettingsModalProps) {
  const [cfg, setCfg] = useState<SmtpConfig>(
    () =>
      loadLocal() || {
        host: "",
        port: "587",
        username: "",
        password: "",
        fromName: "ChaiPaani",
        fromEmail: "noreply@example.com",
        secure: true,
      }
  );
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Persist changes except password
    saveLocal(cfg);
  }, [cfg.host, cfg.port, cfg.username, cfg.fromName, cfg.fromEmail, cfg.secure]);

  const canSend = useMemo(() => {
    return (
      cfg.host.trim() &&
      cfg.port.trim() &&
      cfg.username.trim() &&
      cfg.password.trim() &&
      cfg.fromEmail.trim() &&
      testEmail.trim()
    );
  }, [cfg, testEmail]);

  const handleSendTest = async () => {
    try {
      if (!canSend) {
        (Sonner as any)?.toast?.error?.("Fill SMTP fields and a test email first");
        return;
      }
      setIsSending(true);

      // Invoke an Edge Function to send mail using server-side SMTP creds.
      // The function should read its SMTP settings from environment, not from client.
      // We pass only the recipient and allow a server-side template to be used.
      const { data, error } = await supabase.functions.invoke("smtp-send", {
        body: {
          to: testEmail,
          subject: "ChaiPaani SMTP test",
          html: `<p>This is a test email from ChaiPaani.</p><p>Time: ${new Date().toISOString()}</p>`
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

      (Sonner as any)?.toast?.success?.("Test email sent. Check your inbox.");
      // Clear the password after use
      setCfg((prev) => ({ ...prev, password: "" }));
    } catch (e: any) {
      (Sonner as any)?.toast?.error?.(e?.message || "Could not send test email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>SMTP Settings</DialogTitle>
          <DialogDescription>
            Configure email delivery. For production, set credentials in your backend/Edge Functions env.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>SMTP Host</Label>
              <Input
                placeholder="smtp.sendgrid.net"
                value={cfg.host}
                onChange={(e) => setCfg((p) => ({ ...p, host: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Port</Label>
              <Input
                type="number"
                placeholder="587"
                value={cfg.port}
                onChange={(e) => setCfg((p) => ({ ...p, port: e.target.value }))}
                min={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Username</Label>
              <Input
                placeholder="apikey"
                value={cfg.username}
                onChange={(e) => setCfg((p) => ({ ...p, username: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={cfg.password}
                onChange={(e) => setCfg((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>From Name</Label>
              <Input
                placeholder="ChaiPaani"
                value={cfg.fromName}
                onChange={(e) => setCfg((p) => ({ ...p, fromName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>From Email</Label>
              <Input
                type="email"
                placeholder="noreply@your-domain.com"
                value={cfg.fromEmail}
                onChange={(e) => setCfg((p) => ({ ...p, fromEmail: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="block">Use TLS (STARTTLS/SSL)</Label>
              <p className="text-xs text-muted-foreground">Enable for ports 465/587 depending on your provider.</p>
            </div>
            <Switch
              checked={cfg.secure}
              onCheckedChange={(checked) => setCfg((p) => ({ ...p, secure: checked }))}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Send a test email</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSendTest} disabled={isSending || !canSend}>
                {isSending ? "Sending..." : "Send Test"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: The actual SMTP credentials must be configured on the server. These fields help you validate settings locally.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SmtpSettingsModal;
