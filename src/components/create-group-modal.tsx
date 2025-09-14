import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Plus, X, Users, Mail } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: any) => void;
}

interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export function CreateGroupModal({ isOpen, onClose, onCreateGroup }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const generateAvatar = (name: string) => {
    const nameParts = name.trim().split(" ");
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const addMember = () => {
    if (!newMemberName.trim()) {
      toast.error("Please enter member name");
      return;
    }

    if (!newMemberEmail.trim()) {
      toast.error("Please enter member email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Check if email already exists
    if (members.some(member => member.email.toLowerCase() === newMemberEmail.toLowerCase())) {
      toast.error("Member with this email already exists");
      return;
    }

    const newMember: Member = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      email: newMemberEmail.trim().toLowerCase(),
      avatar: generateAvatar(newMemberName)
    };

    setMembers([...members, newMember]);
    setNewMemberName("");
    setNewMemberEmail("");
    toast.success(`${newMember.name} added to group`);
  };

  const removeMember = (memberId: string) => {
    setMembers(members.filter(member => member.id !== memberId));
    toast.success("Member removed from group");
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter group name");
      return;
    }

    if (!category) {
      toast.error("Please select a category");
      return;
    }

    if (members.length === 0) {
      toast.error("Please add at least one member");
      return;
    }

    setIsLoading(true);

    try {
      // Add current user to members
      const allMembers = [
        { id: "current-user", name: "You", email: "demo@chaipaani.com", avatar: "YU" },
        ...members
      ];

      const groupData = {
        id: Date.now().toString(),
        name: groupName.trim(),
        description: description.trim(),
        category,
        members: allMembers,
        memberCount: allMembers.length,
        totalExpenses: 0,
        yourBalance: 0,
        recentActivity: "Just created",
        createdAt: new Date().toISOString()
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      onCreateGroup(groupData);
      toast.success(`Group "${groupName}" created successfully!`);
      
      // Reset form
      setGroupName("");
      setDescription("");
      setCategory("");
      setMembers([]);
      onClose();
    } catch (error) {
      toast.error("Failed to create group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setGroupName("");
      setDescription("");
      setCategory("");
      setMembers([]);
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
            Create New Group
          </DialogTitle>
          <DialogDescription>
            Set up a new group to share expenses with friends, family, or colleagues.
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

          {/* Add Members */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add Members</Label>
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

            {/* Members List */}
            {members.length > 0 && (
              <div className="space-y-2">
                <Label>Group Members ({members.length + 1})</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {/* Current user */}
                  <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">YU</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">You (Admin)</p>
                      <p className="text-xs text-muted-foreground truncate">demo@chaipaani.com</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Admin</Badge>
                  </div>

                  {/* Added members */}
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 bg-background border rounded-lg">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">{member.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.id)}
                        disabled={isLoading}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              onClick={handleCreateGroup} 
              disabled={isLoading || !groupName.trim() || !category || members.length === 0}
              className="sm:flex-1"
            >
              {isLoading ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}