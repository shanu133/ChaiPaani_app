import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Plus, Users } from "lucide-react";
import { invitationService } from "../lib/supabase-service";

// Build a shareable invite link using base from VITE_PUBLIC_APP_URL or current origin.
// For token security, place the token in the URL fragment instead of a query parameter.
function buildInviteLink(token?: string | null): string | null {
  if (!token) return null;
  const publicBase = (import.meta as any).env?.VITE_PUBLIC_APP_URL as string | undefined;
  const base = (publicBase && publicBase.trim().length > 0) ? publicBase.replace(/\/$/, '') : window.location.origin;
  return `${base}/#token=${encodeURIComponent(token)}`;
}

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: {
    id: string;
    name: string;
  };
  onMembersAdded: () => void;
}

export function AddMembersModal({ isOpen, onClose, group, onMembersAdded }: AddMembersModalProps) {
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastInviteToken, setLastInviteToken] = useState<string | null>(null);
  const [lastInviteEmail, setLastInviteEmail] = useState<string | null>(null);
  interface PendingInvitation {
    id: string;
    invitee_email: string;
    created_at: string;
    token?: string | null;
    status: string;
  }
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; email: string; created_at: string; token?: string }>>([]);

  const inviteLink = useMemo(() => buildInviteLink(lastInviteToken), [lastInviteToken]);

  // Load existing pending invitations for this group via service (typed)
  useEffect(() => {
    const loadPending = async () => {
      try {
        if (!group?.id) return;
        const { data, error } = await invitationService.getPendingInvitations(group.id);
        if (error) {
          console.warn('Could not load pending invites (service error):', error);
          return;
        }
        const typed = (data as PendingInvitation[] | null) || [];
        setPendingInvites(
          typed.map((i) => ({ id: i.id, email: i.invitee_email, created_at: i.created_at, token: i.token || undefined }))
        );
      } catch (e) {
        console.warn('Could not load pending invites (unexpected):', e)
      }
    }
    loadPending()
  }, [group?.id, isOpen])

  const addMember = async () => {
    if (!newMemberName.trim()) {
      console.error("Please enter member name");
      return;
    }

    if (!newMemberEmail.trim()) {
      console.error("Please enter member email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      console.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      if (!group?.id) {
        console.error("Group ID is missing");
        return;
      }

      // Invite the user to the group
      const { data: inviteData, error: inviteError } = await invitationService.inviteUser(
        group.id,
        newMemberEmail.trim().toLowerCase()
      );

      if (inviteError) {
        console.error(`Error inviting ${newMemberEmail}:`, inviteError);
        alert(`Failed to invite ${newMemberEmail}: ${(inviteError as any)?.message || 'Unknown error'}`);
        return;
      }

      if (!inviteData?.ok) {
        console.error(`Invitation failed for ${newMemberEmail}:`, inviteData);
        alert(`Failed to invite ${newMemberEmail}: Invitation creation failed`);
        return;
      }

  setLastInviteToken(inviteData.token);
  setLastInviteEmail(newMemberEmail.trim().toLowerCase());
  console.log(`Invitation sent to ${newMemberEmail}!`);
  alert(`Invitation created for ${newMemberEmail}`);

      setNewMemberName("");
      setNewMemberEmail("");
  onMembersAdded();
  // Update local pending list
  setPendingInvites(prev => [{ id: crypto.randomUUID?.() || String(Date.now()), email: newMemberEmail.trim().toLowerCase(), created_at: new Date().toISOString(), token: inviteData.token }, ...prev])

    } catch (error) {
      console.error("Error in addMember:", error);
      console.error("Failed to add member. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setNewMemberName("");
      setNewMemberEmail("");
      setLastInviteToken(null);
      setLastInviteEmail(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Add Members to {group?.name}
          </DialogTitle>
          <DialogDescription>
            Invite new members to join your group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Add Members */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add New Member</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Member name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  disabled={isLoading}
                  onKeyPress={(e) => e.key === 'Enter' && addMember()}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Email address"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    disabled={isLoading}
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && addMember()}
                  />
                  <Button
                    size="sm"
                    onClick={addMember}
                    disabled={isLoading || !newMemberName.trim() || !newMemberEmail.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Shareable invite link (if available) */}
          {lastInviteToken && inviteLink && (
            <div className="p-3 border rounded-md bg-muted/40 space-y-2">
              <div className="text-sm">
                <span className="font-medium">Invite created</span>
                {lastInviteEmail ? (
                  <span className="text-muted-foreground"> — share this link with {lastInviteEmail}</span>
                ) : null}
              </div>
              <div className="flex gap-2 items-center">
                <Input readOnly value={inviteLink} className="text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteLink);
                      alert("Invite link copied");
                    } catch {
                      // Fallback
                      const textarea = document.createElement('textarea');
                      textarea.value = inviteLink;
                      document.body.appendChild(textarea);
                      textarea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textarea);
                      alert("Invite link copied");
                    }
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The invitee must sign in with the same email to join. Once they accept, they’ll appear in Add Expense.
              </p>
            </div>
          )}

          {/* Pending invitations list with copy buttons */}
          {pendingInvites.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Pending invitations</div>
              <div className="space-y-2">
                {pendingInvites.map((inv) => {
                  const link = buildInviteLink(inv.token || undefined);
                  return (
                    <div key={inv.id} className="flex items-center gap-2 text-sm">
                      <div className="flex-1">
                        <div>{inv.email}</div>
                        <div className="text-xs text-muted-foreground">Sent {new Date(inv.created_at).toLocaleString()}</div>
                      </div>
                      {link ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(link)
                              alert('Invite link copied')
                            } catch {
                              const textarea = document.createElement('textarea');
                              textarea.value = link;
                              document.body.appendChild(textarea);
                              textarea.select();
                              document.execCommand('copy');
                              document.body.removeChild(textarea);
                              alert('Invite link copied')
                            }
                          }}
                        >
                          Copy link
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No link</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="sm:flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={addMember}
              disabled={isLoading || !newMemberName.trim() || !newMemberEmail.trim()}
              className="sm:flex-1"
            >
              {isLoading ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
