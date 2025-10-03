import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, Calendar, ChevronDown, Clock, DollarSign, Edit, Eye, Menu, MoreHorizontal, Trash2, Users } from 'lucide-react';
import { groupService } from '../lib/supabase-service';
import { CreateGroupModal } from './create-group-modal';
import { AddMembersModal } from './add-members-modal';

interface GroupMenuModalProps {
  groupId: string;
  groupName: string;
  isOwner: boolean;
  onClose: () => void;
  onGroupUpdate?: () => void;
  onGroupLeave?: () => void;
  onGroupDelete?: () => void;
}

export const GroupMenuModal: React.FC<GroupMenuModalProps> = ({
  groupId,
  groupName,
  isOwner,
  onClose,
  onGroupUpdate,
  onGroupLeave,
  onGroupDelete,
}) => {
  const [showAddMembers, setShowAddMembers] = useState(false);
  const handleAddMember = () => {
    setShowAddMembers(true);
  };

  const handleEditGroup = () => {
    // TODO: Open edit group modal
    console.log('Edit group functionality coming soon');
    onClose();
  };

  const handleTransferOwnership = async () => {
    try {
      // TODO: Implement transfer ownership functionality
      console.log('Transfer ownership functionality coming soon');
    } catch (error) {
      console.error('Error transferring ownership:', error);
      console.error('Failed to transfer ownership');
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
    if (!confirm(`Are you sure you want to leave "${groupName}"?`)) {
      return;
    }

    try {
      const { error } = await groupService.leaveGroup(groupId);
      if (error) throw error;

      console.log(`Left group "${groupName}" successfully`);
      onGroupLeave?.();
    } catch (error: any) {
      console.error('Error leaving group:', error);
      console.error(error.message || 'Failed to leave group');
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
                  <Button variant="ghost" className="justify-start" onClick={handleTransferOwnership}>
                    <Edit className="mr-2 h-4 w-4" />
                    Transfer Ownership
                  </Button>
                </>
              )}
            </div>

            {/* Group Actions */}
            <div className="grid gap-2 pt-2">
              {!isOwner ? (
                <Button variant="ghost" className="justify-start text-destructive" onClick={handleLeaveGroup}>
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

      {/* Sub-modals */}
      <AddMembersModal
        isOpen={showAddMembers}
        onClose={() => setShowAddMembers(false)}
        group={{
          id: groupId,
          name: groupName
        }}
        onMembersAdded={() => {
          setShowAddMembers(false);
          onGroupUpdate?.(); // Refresh the group data
        }}
      />
    </>
  );
};
