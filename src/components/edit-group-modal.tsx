import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { groupService } from "../lib/supabase-service";
interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: {
    id: string;
    name: string;
    description: string | null;
    category: string;
  };
  onGroupUpdated: (groupData: any) => void;
}

export function EditGroupModal({ isOpen, onClose, group, onGroupUpdated }: EditGroupModalProps) {
  const [groupName, setGroupName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [category, setCategory] = useState(group?.category || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (group) {
      setGroupName(group.name || "");
      setDescription(group.description || "");
      setCategory(group.category || "");
    }
  }, [group]);

  const categories = [
    "Work",
    "Entertainment",
    "Home",
    "Travel",
    "Food",
    "Shopping",
    "Utilities",
    "Sports",
    "Other"
  ];

  const handleUpdateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter group name");
      return;
    }

    if (!category) {
      toast.error("Please select a category");
      return;
    }

    setIsLoading(true);

    try {
      if (!group?.id) {
        toast.error("Group ID is missing");
        return;
      }

      // Update the group in Supabase
      const { data: groupData, error: groupError } = await groupService.updateGroup(
        group.id,
        groupName.trim(),
        description.trim(),
        category
      );

      if (groupError) {
        console.error("Error updating group:", groupError);
        toast.error("Failed to update group");
        return;
      }

      if (!groupData) {
        toast.error("Failed to update group - no data returned");
        return;
      }

      toast.success(`Group "${groupName}" updated successfully!`);

      // Call parent callback with the updated group data
      onGroupUpdated(groupData);

      onClose();
    } catch (error) {
      console.error("Error in handleUpdateGroup:", error);
      toast.error("Failed to update group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Edit Group
          </DialogTitle>
          <DialogDescription>
            Update group settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Group Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                placeholder="e.g., Weekend Squad, Office Lunch"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this group for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              onClick={handleUpdateGroup}
              disabled={isLoading || !groupName.trim() || !category}
              className="sm:flex-1"
            >
              {isLoading ? "Updating..." : "Update Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
