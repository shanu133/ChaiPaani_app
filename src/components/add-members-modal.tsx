import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Plus, X, Users, Mail } from "lucide-react";
import { groupService, invitationService } from "../lib/supabase-service";

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: {
    id: string;
    name: string;
  };
  onMembersAdded: () => void;
}

interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export function AddMembersModal({ isOpen, onClose, group, onMembersAdded }: AddMembersModalProps) {
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateAvatar = (name: string) => {
    const nameParts = name.trim().split(" ");
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

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
        alert(`Failed to invite ${newMemberEmail}: ${inviteError.message || 'Unknown error'}`);
        return;
      }

      if (!inviteData?.ok) {
        console.error(`Invitation failed for ${newMemberEmail}:`, inviteData);
        alert(`Failed to invite ${newMemberEmail}: Invitation creation failed`);
        return;
      }

      console.log(`Invitation sent to ${newMemberEmail}!`);
      alert(`Invitation sent to ${newMemberEmail}!`);

      setNewMemberName("");
      setNewMemberEmail("");
      onMembersAdded();
      onClose();

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
