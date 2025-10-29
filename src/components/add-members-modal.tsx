import { useEffect, useState } from "react";
import { Button } from "./ui/button";import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Plus, Users, RefreshCw, Mail } from "lucide-react";
import { invitationService } from "../lib/supabase-service";

// Copy-link was removed; invites are email-based.

// Reusable helper to copy text to clipboard with a DOM fallback
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if ((navigator as any)?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      alert('Invite link copied');
      return true;
    }
    throw new Error('Clipboard API unavailable');
  } catch {
    // Fallback to textarea for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const ok = document.execCommand('copy');
      if (ok) {
        alert('Invite link copied');
        return true;
      }
    } catch {
      // ignore and fall through to failure
    } finally {
      document.body.removeChild(textarea);
    }
    alert('Failed to copy link');
    return false;
  }
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
  const [lastInviteEmail, setLastInviteEmail] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  interface PendingInvitation {
    id: string;
    invitee_email: string;
    created_at: string;
    token?: string | null;
    status: string;
  }
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; email: string; created_at: string; token?: string }>>([]);

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
    // Inline validation with user-visible errors
    if (!newMemberName.trim()) {
      setNameError("Please enter member name");
      return;
    } else {
      setNameError(null);
    }

    if (!newMemberEmail.trim()) {
      setEmailError("Please enter member email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    } else {
      setEmailError(null);
    }
    setIsLoading(true);

    try {
      if (!group?.id) {
        console.error("Group ID is missing");
        alert("Group ID is missing. Please try again.");
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

  setLastInviteEmail(newMemberEmail.trim().toLowerCase());
  console.log(`Invitation sent to ${newMemberEmail}!`);
  alert(`Invitation email sent to ${newMemberEmail}`);

      setNewMemberName("");
      setNewMemberEmail("");
      onMembersAdded();
      // Update local pending list
      if (inviteData?.ok && inviteData?.token) {
        setPendingInvites(prev => [
          { 
            id: inviteData.token, 
            email: newMemberEmail.trim().toLowerCase(), 
            created_at: new Date().toISOString(), 
            token: inviteData.token 
          }, 
          ...prev
        ]);
      }
    } catch (error) {
      console.error("Error in addMember:", error);
      alert("Failed to add member. Please try again.");
    } finally {
      setIsLoading(false);
    }  };

  const handleClose = () => {
    if (!isLoading) {
      setNewMemberName("");
      setNewMemberEmail("");
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
                <div className="flex flex-col gap-1">
                  <Input
                    placeholder="Member name"
                    value={newMemberName}
                    onChange={(e) => {
                      setNewMemberName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    disabled={isLoading}
                    onKeyPress={(e) => e.key === 'Enter' && addMember()}
                  />
                  {nameError ? (
                    <p className="text-xs text-red-600">{nameError}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Email address"
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => {
                        setNewMemberEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
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
                  {emailError ? (
                    <p className="text-xs text-red-600">{emailError}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Invite status */}
          {lastInviteEmail && (
            <div className="p-3 border rounded-md bg-muted/40 space-y-2">
              <div className="text-sm flex items-center justify-between">
                <div>
                  <span className="font-medium">Invitation email sent</span>
                  <span className="text-muted-foreground"> — {lastInviteEmail}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!group?.id || !lastInviteEmail) return;
                    try {
                      const { error } = await invitationService.resendInvite(group.id, lastInviteEmail);
                      if (error) {
                        if ((error as any)?.message?.includes('email_exists')) {
                          alert('This email is already registered. Please ask them to log in or use password reset.');
                        } else {
                          alert(`Failed to resend email: ${(error as any)?.message || 'Unknown error'}`);
                        }
                        return;
                      }
                      alert('Invitation email resent');
                    } catch (e) {
                      alert('Failed to resend email');
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Resend
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The invitee must sign in with the same email to join. Once they accept, they’ll appear in Add Expense.
              </p>
            </div>
          )}

          {/* Pending invitations list with resend buttons */}
          {pendingInvites.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Pending invitations</div>
              <div className="space-y-2">
                {pendingInvites.map((inv) => {
                  return (
                    <div key={inv.id} className="flex items-center gap-2 text-sm">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!group?.id) return;
                          try {
                            const { error } = await invitationService.resendInvite(group.id, inv.email);
                            if (error) {
                              if ((error as any)?.message?.includes('email_exists')) {
                                alert('This email is already registered. Please ask them to log in or use password reset.');
                              } else {
                                alert(`Failed to resend: ${(error as any)?.message || 'Unknown error'}`);
                              }
                              return;
                            }
                            alert('Invitation email resent');
                          } catch (e) {
                            alert('Failed to resend email');
                          }
                        }}
                      >
                        <Mail className="w-4 h-4 mr-2" /> Resend
                      </Button>
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
