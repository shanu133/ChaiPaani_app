import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { 
  Settings, 
  Users, 
  Archive, 
  Trash2, 
  Edit3, 
  Download, 
  Share2,
  AlertTriangle,
  UserPlus,
  IndianRupee,
  BarChart3
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface GroupMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    totalExpenses: number;
    yourBalance: number;
    category: string;
    members: Array<{
      id: string;
      name: string;
      avatar: string;
    }>;
  };
  onEditGroup?: () => void;
  onAddMembers?: () => void;
  onViewExpenses?: () => void;
  onSettleUp?: () => void;
  onExportData?: () => void;
  onArchiveGroup?: () => void;
  onDeleteGroup?: () => void;
}

export function GroupMenuModal({ 
  isOpen, 
  onClose, 
  group,
  onEditGroup,
  onAddMembers,
  onViewExpenses,
  onSettleUp,
  onExportData,
  onArchiveGroup,
  onDeleteGroup
}: GroupMenuModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => void, loadingMessage: string, successMessage: string) => {
    if (!action) {
      toast.error("This feature is not yet implemented");
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
      action();
      toast.success(successMessage);
      onClose();
    } catch (error) {
      toast.error("Action failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareGroup = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group?.name} on ChaiPaani`,
          text: `Join our expense group "${group?.name}" to split bills easily!`,
          url: `${window.location.origin}/join-group/${group?.id}`
        });
        toast.success("Group link shared successfully!");
      } catch (error) {
        // Fallback to clipboard
        fallbackShare();
      }
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = () => {
    const shareText = `Join our expense group "${group?.name}" on ChaiPaani: ${window.location.origin}/join-group/${group?.id}`;
    navigator.clipboard.writeText(shareText).then(() => {
      toast.success("Group link copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy link. Please try again.");
    });
  };

  const handleDeleteConfirm = async () => {
    if (!onDeleteGroup) {
      toast.error("Delete functionality not available");
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onDeleteGroup();
      toast.success(`Group "${group?.name}" deleted successfully`);
      onClose();
    } catch (error) {
      toast.error("Failed to delete group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            {group.name}
          </DialogTitle>
          <DialogDescription>
            Manage group settings, members, and view detailed expense information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Group Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{group.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">{group.description}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="font-semibold">{group.memberCount}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="font-semibold">₹{group.totalExpenses.toLocaleString()}</p>
              </div>
            </div>

            {group.yourBalance !== 0 && (
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Your Balance</span>
                  <span className={`font-semibold ${
                    group.yourBalance > 0 ? 'text-destructive' : 'text-primary'
                  }`}>
                    {group.yourBalance > 0 ? '+' : ''}₹{group.yourBalance}
                  </span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {!showDeleteConfirm ? (
            <>
              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start gap-2"
                    onClick={() => handleAction(
                      onSettleUp || (() => {}), 
                      "Opening settle up...", 
                      "Settle up opened"
                    )}
                    disabled={isLoading}
                  >
                    <IndianRupee className="w-4 h-4" />
                    Settle Up
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start gap-2"
                    onClick={() => handleAction(
                      onAddMembers || (() => {}), 
                      "Opening add members...", 
                      "Add members opened"
                    )}
                    disabled={isLoading}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Members
                  </Button>
                </div>
              </div>

              {/* Group Management */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Group Management</h4>
                <div className="space-y-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start gap-2"
                    onClick={() => handleAction(
                      onEditGroup || (() => {}), 
                      "Opening edit group...", 
                      "Edit group opened"
                    )}
                    disabled={isLoading}
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Group Details
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start gap-2"
                    onClick={() => handleAction(
                      onViewExpenses || (() => {}), 
                      "Loading expenses...", 
                      "Expenses view opened"
                    )}
                    disabled={isLoading}
                  >
                    <BarChart3 className="w-4 h-4" />
                    View All Expenses
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start gap-2"
                    onClick={handleShareGroup}
                    disabled={isLoading}
                  >
                    <Share2 className="w-4 h-4" />
                    Share Group
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start gap-2"
                    onClick={() => handleAction(
                      onExportData || (() => {}), 
                      "Preparing export...", 
                      "Data exported successfully"
                    )}
                    disabled={isLoading}
                  >
                    <Download className="w-4 h-4" />
                    Export Data
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Danger Zone */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-destructive">Danger Zone</h4>
                <div className="space-y-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    onClick={() => handleAction(
                      onArchiveGroup || (() => {}), 
                      "Archiving group...", 
                      "Group archived successfully"
                    )}
                    disabled={isLoading}
                  >
                    <Archive className="w-4 h-4" />
                    Archive Group
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Group
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Delete Confirmation */
            <div className="space-y-4">
              <Alert className="border-destructive/50">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  <strong>Are you sure you want to delete "{group.name}"?</strong>
                  <br />
                  This action cannot be undone. All expenses and group data will be permanently deleted.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This will permanently delete:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• All {group.totalExpenses > 0 ? `₹${group.totalExpenses.toLocaleString()} in` : ''} expense records</li>
                  <li>• {group.memberCount} member associations</li>
                  <li>• All group chat and activity history</li>
                  <li>• Settlement records and balances</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="flex-1"
                  onClick={handleDeleteConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? "Deleting..." : "Delete Forever"}
                </Button>
              </div>
            </div>
          )}

          {/* Close Button */}
          {!showDeleteConfirm && (
            <div className="pt-2">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={onClose}
                disabled={isLoading}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}