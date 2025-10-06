import React, { useState } from 'react';
import * as Sonner from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, Edit, Trash2, Users } from 'lucide-react';
import { groupService } from '../lib/supabase-service';
import { AddMembersModal } from './add-members-modal';

interface GroupMenuModalProps {
  groupId: string;
  groupName: string;
  isOwner: boolean;
  onClose: () => void;
  onGroupUpdate?: () => void;
  onGroupLeave?: () => void;
  onGroupDelete?: () => void;
  // Optional callback to open the edit group modal in the parent
  openEditGroupModal?: (group: { id: string; name: string }) => void;
}

export const GroupMenuModal: React.FC<GroupMenuModalProps> = ({
  groupId,
  groupName,
  isOwner,
  onClose,
  onGroupUpdate,
  onGroupLeave,
  onGroupDelete,
  openEditGroupModal,
}) => {
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // NOTE: Wire this up to a member selector UI elsewhere in this modal
  const [selectedMemberId] = useState<string | null>(null);
  const notify = {
    success: (msg: string) => (Sonner as any)?.toast?.success ? (Sonner as any).toast.success(msg) : (Sonner as any)?.toast ? (Sonner as any).toast(msg) : console.info(msg),
    error: (msg: string) => (Sonner as any)?.toast?.error ? (Sonner as any).toast.error(msg) : (Sonner as any)?.toast ? (Sonner as any).toast(msg) : console.error(msg),
  };
  const handleAddMember = () => {
    setShowAddMembers(true);
  };

  const handleEditGroup = () => {
    // Trigger parent-provided edit modal with current group payload
    if (openEditGroupModal) {
      openEditGroupModal({ id: groupId, name: groupName });
      // Close this menu only after successfully triggering the edit modal
      onClose();
      return;
    }

    // If no callback provided, inform developer
    console.warn('openEditGroupModal prop not provided to GroupMenuModal.');
  };

  const handleTransferOwnership = async () => {
    // Validate selection
    if (!selectedMemberId) {
      notify.error('Please select a member to transfer ownership to.');
      return;
    }

    const confirmed = confirm('Are you sure you want to transfer ownership of this group? You will lose owner permissions.');
    if (!confirmed) return;

    setIsTransferring(true);
    try {
      const { error } = await groupService.transferOwnership(groupId, selectedMemberId);
      if (error) throw error;

      notify.success('Ownership transferred successfully.');
      onGroupUpdate?.();
      onClose();
    } catch (error: any) {
      const message = error?.message || 'Failed to transfer ownership. Please try again.';
      notify.error(message);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm(`Are you sure you want to delete "${groupName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await groupService.deleteGroup(groupId);
      if (error) throw error;

      console.log(`Group "${groupName}" deleted successfully`);
      onGroupDelete?.();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      console.error(error.message || 'Failed to delete group');
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const { error } = await groupService.leaveGroup(groupId);
      if (error) throw error;

      notify.success(`Left group "${groupName}" successfully`);
      setShowLeaveConfirm(false);
      onGroupLeave?.();
    } catch (error: any) {
      const message = error?.message || 'Failed to leave group';
      notify.error(message);
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Group Options</DialogTitle>
            <DialogDescription>
              Manage settings and members for {groupName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-2">
            {/* Group Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{groupName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Group settings and member management
                    </p>
                  </div>
                  {isOwner && (
                    <Badge variant="secondary">Owner</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Member Management */}
            <div className="grid gap-2">
              <Button variant="ghost" className="justify-start" onClick={handleAddMember}>
                <Users className="mr-2 h-4 w-4" />
                Add Members
              </Button>

              {isOwner && (
                <>
                  <Button variant="ghost" className="justify-start" onClick={handleEditGroup}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Group
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={handleTransferOwnership} disabled={isTransferring}>
                    <Edit className="mr-2 h-4 w-4" />
                    {isTransferring ? 'Transferring…' : 'Transfer Ownership'}
                  </Button>
                </>
              )}
            </div>

            {/* Group Actions */}
            <div className="grid gap-2 pt-2">
              {!isOwner ? (
                <Button variant="ghost" className="justify-start text-destructive" onClick={() => setShowLeaveConfirm(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Leave Group
                </Button>
              ) : (
                <Button variant="ghost" className="justify-start text-destructive" onClick={handleDeleteGroup}>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Delete Group
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Group Confirmation */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave "{groupName}"? You will no longer have access to this group's expenses.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowLeaveConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLeaveGroup}>
              Leave Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-modals */}
      <AddMembersModal
        isOpen={showAddMembers}
        onClose={() => setShowAddMembers(false)}
        group={{
          id: groupId,
          name: groupName
        }}
        onMembersAdded={() => {
          // Keep the modal open so the shareable invite link remains visible
          onGroupUpdate?.(); // Refresh the group data
        }}
      />
    </>
  );
};
