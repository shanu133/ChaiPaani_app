import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import ChaiPaaniLogo from "../assets/ed44a61a321c772f05e626fe7aae98312671f4e9.png";
import ChaiPaaniLogoFull from "../assets/chaipaani_logo.png";
import { AddExpenseModal } from "./add-expense-modal";
import { CreateGroupModal } from "./create-group-modal";
import { SettleUpModal } from "./settle-up-modal";
import { AddMembersModal } from "./add-members-modal";
import {
  Plus,
  Users,
  Receipt,
  Bell,
  Settings,
  LogOut,
  IndianRupee,
  
  Menu,
  X,
  ArrowLeft,
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { groupService, expenseService, authService } from "../lib/supabase-service";
import { supabase } from "../lib/supabase";

interface GroupPageProps {
  groupId: string;
  onBack: () => void;
  onLogout: () => void;
  onLogoClick?: () => void;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  status: 'active' | 'pending' | 'inactive';
  profile?: {
    id: string;
    full_name: string;
    display_name: string;
    email: string;
    avatar_url?: string;
  };
  invitation?: {
    id: string;
    token: string;
    status: string;
    created_at: string;
    invitee_email: string;
  };
}

interface GroupDetails {
  id: string;
  name: string;
  description: string | null;
  category: string;
  currency: string;
  created_at: string;
  created_by: string;
  members: GroupMember[];
  expenses: any[];
  totalExpenses: number;
  userBalance: number;
}

export function GroupPage({ groupId, onBack, onLogout, onLogoClick }: GroupPageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  // const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [modalMembers, setModalMembers] = useState<{ id: string; name: string; avatar: string }[]>([]);

  // Fetch group details on component mount
  useEffect(() => {
    fetchGroupDetails();
    fetchCurrentUser();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);

      // Get group details with members and expenses
      const { data: groupData, error: groupError } = await groupService.getGroupDetails(groupId);

      if (groupError) {
        console.error("Error fetching group details:", groupError);
        console.error("Failed to load group details");
        setGroup(null); // This will trigger the "Group Not Found" UI
        setLoading(false);
        return;
      }

      if (!groupData) {
        console.error("Group not found");
        setGroup(null); // This will trigger the "Group Not Found" UI
        setLoading(false);
        return;
      }

      // Get current user to determine ownership
      const user = await authService.getCurrentUser();
      const isGroupOwner = groupData.created_by === user?.id;
      setIsOwner(isGroupOwner);

      // Transform members data to include invitation status
      const transformedMembers: GroupMember[] = await Promise.all(
        (groupData.group_members || []).map(async (member: any) => {
          // Prefer status provided by backend service (RPC), else infer
          let status: 'active' | 'pending' | 'inactive' = (member.status as any) || 'active';
          let invitation = member.invitation || null;

          if (!status) status = 'active';

          // If status not provided and no profile, attempt to detect pending invite
          if (status === 'active' && !member.profiles) {
            try {
              const { data: invites } = await supabase
                .from('invitations')
                .select('*')
                .eq('group_id', groupId)
                .eq('invitee_email', member.email || '')
                .eq('status', 'pending')
                .single();
              if (invites) {
                status = 'pending';
                invitation = invites;
              } else {
                status = 'inactive';
              }
            } catch (error) {
              status = 'inactive';
            }
          }

          return {
            id: member.id,
            user_id: member.user_id,
            role: member.role,
            joined_at: member.joined_at,
            status,
            profile: member.profiles ? {
              id: member.profiles.id,
              full_name: member.profiles.full_name || member.profiles.email || 'Unknown',
              display_name: member.profiles.display_name,
              email: member.profiles.email,
              avatar_url: member.profiles.avatar_url
            } : undefined,
            invitation
          };
        })
      );

      // Calculate total expenses
      const totalExpenses = (groupData.expenses || []).reduce((sum: number, expense: any) => sum + expense.amount, 0);

      // Calculate user's balance
      let userBalance = 0;
      try {
        const { data: balanceData } = await expenseService.getUserBalance(groupId);
        if (Array.isArray(balanceData) && balanceData.length > 0) {
          const first: any = balanceData[0] as any;
          // Prefer computed net_balance if available; otherwise derive if amount fields exist
          if (typeof first.net_balance === 'number') {
            userBalance = first.net_balance;
          } else if (typeof first.amount_owed === 'number' && typeof first.amount_owes === 'number') {
            userBalance = (first.amount_owed as number) - (first.amount_owes as number);
          }
        }
      } catch (error) {
        console.error(`Error fetching balance for group ${groupId}:`, error);
      }

      setGroup({
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        category: groupData.category,
        currency: groupData.currency,
        created_at: groupData.created_at,
        created_by: groupData.created_by,
        members: transformedMembers,
        expenses: groupData.expenses || [],
        totalExpenses,
        userBalance
      });

    } catch (error) {
      console.error("Error fetching group details:", error);
      console.error("Failed to load group details");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.full_name || user.email || "You",
          avatar: (user.user_metadata?.full_name || user.email || "You").substring(0, 2).toUpperCase()
        });
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const handleAddExpense = async () => {
    try {
      // Fetch fresh members via RPC to ensure latest active members are included
      const { data } = await groupService.getGroupMembersWithStatus(groupId);
      const active = (data || []).filter((r: any) => r.status === 'active');
      const mapped = active.map((m: any) => ({
        id: m.user_id,
        name: m.display_name,
        avatar: (m.display_name || 'UN').substring(0, 2).toUpperCase()
      }));
      setModalMembers(mapped);
    } catch (e) {
      // Fallback to existing group members if RPC fails
      if (group) {
        setModalMembers(group.members.filter(m => m.status === 'active').map(m => ({
          id: m.user_id,
          name: m.profile?.full_name || 'Unknown',
          avatar: m.profile?.full_name?.substring(0, 2).toUpperCase() || 'UN'
        })));
      }
    } finally {
      setShowAddExpense(true);
    }
  };

  const handleSettleUp = () => {
    setShowSettleUp(true);
  };

  const handleAddMembers = () => {
    setShowAddMembers(true);
  };

  const handleEditGroup = () => {
    setShowEditGroup(true);
  };

  const handleDeleteGroup = async () => {
    if (!group) return;

    try {
      // Implement delete group functionality
      console.log("Delete group functionality coming soon");
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting group:", error);
      console.error("Failed to delete group");
    }
  };

  const handleLeaveGroup = async () => {
    if (!group) return;

    try {
      // Implement leave group functionality
      console.log("Leave group functionality coming soon");
      setShowLeaveConfirm(false);
    } catch (error) {
      console.error("Error leaving group:", error);
      console.error("Failed to leave group");
    }
  };

  const handleRemoveMember = async (member: GroupMember) => {
    if (!group) return;

    try {
      let error = null as any;

      if (member.status === 'pending' && member.invitation?.invitee_email) {
        // Cancel a pending invitation instead of trying to remove a non-existent membership
        const res = await supabase
          .from('invitations')
          .delete()
          .eq('group_id', group.id)
          .eq('invitee_email', member.invitation.invitee_email)
          .eq('status', 'pending');
        error = res.error;
      } else {
        // Remove an active member by group_id + user_id (not by synthetic id)
        const res = await supabase
          .from('group_members')
          .delete()
          .eq('group_id', group.id)
          .eq('user_id', member.user_id);
        error = res.error;
      }

      if (error) throw error;

      console.log("Member removed successfully");
      // Refresh group data
      fetchGroupDetails();
    } catch (error) {
      console.error("Error removing member:", error);
      console.error("Failed to remove member");
    }
  };

  const handleMembersAdded = () => {
    fetchGroupDetails(); // Refresh group data
  };

  const handleExpenseCreated = () => {
    fetchGroupDetails(); // Refresh group data
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Work": return "bg-blue-100 text-blue-800";
      case "Entertainment": return "bg-purple-100 text-purple-800";
      case "Home": return "bg-green-100 text-green-800";
      case "Travel": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getMemberStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'inactive':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getMemberStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending':
        return 'Invite Pending';
      case 'inactive':
        return 'Inactive';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Group Not Found</h2>
          <p className="text-muted-foreground mb-4">The group you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Same as Dashboard */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 lg:p-6 border-b">
            <div className="flex items-center justify-between">
              <button
                onClick={onLogoClick || onBack}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                {/* Mobile Logo */}
                <img
                  src={ChaiPaaniLogo}
                  alt="ChaiPaani Logo"
                  className="h-15 w-auto md:hidden"
                />
                {/* Desktop Logo */}
                <img
                  src={ChaiPaaniLogoFull}
                  alt="ChaiPaani Logo"
                  className="h-18 w-auto hidden md:block"
                />
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={onBack}>
              <Receipt className="w-4 h-4" />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Users className="w-4 h-4" />
              Groups
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Clock className="w-4 h-4" />
              Activity
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Bell className="w-4 h-4" />
              Notifications
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>

          {/* Add Expense Button */}
          <div className="p-4 border-t">
            <Button className="w-full gap-2" onClick={handleAddExpense}>
              <Plus className="w-4 h-4" />
              Add Expense
            </Button>
          </div>

          {/* User Menu */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarFallback>{currentUser?.avatar || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{currentUser?.name || "Loading..."}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {currentUser ? "Logged in" : "Loading..."}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="bg-card border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{group.name}</h1>
                <p className="text-sm text-muted-foreground">{group.members.length} members</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddMembers(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSettleUp}
              className="gap-2"
            >
              <IndianRupee className="w-4 h-4" />
              Settle Up
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditGroup}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isOwner) {
                  setShowDeleteConfirm(true);
                } else {
                  setShowLeaveConfirm(true);
                }
              }}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 md:p-6 space-y-6">
          {/* Group Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl">{group.name}</CardTitle>
                    <Badge className={getCategoryColor(group.category)} variant="secondary">
                      {group.category}
                    </Badge>
                    {isOwner && (
                      <Badge variant="secondary">Owner</Badge>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-muted-foreground">{group.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
                    <span>{group.currency}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">₹{group.totalExpenses.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Expenses</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${group.userBalance > 0 ? 'text-primary' : group.userBalance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {group.userBalance > 0 ? '+' : ''}₹{group.userBalance}
                  </div>
                  <div className="text-sm text-muted-foreground">Your Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{group.members.filter(m => m.status === 'active').length}</div>
                  <div className="text-sm text-muted-foreground">Active Members</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Members ({group.members.filter(m => m.status === 'active').length})</span>
                <Button variant="outline" size="sm" onClick={handleAddMembers}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {group.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.profile?.full_name?.substring(0, 2).toUpperCase() ||
                           member.invitation?.invitee_email?.substring(0, 2).toUpperCase() ||
                           'UN'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {member.profile?.full_name || member.invitation?.invitee_email || 'Unknown User'}
                          </p>
                          {getMemberStatusIcon(member.status)}
                          <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {getMemberStatusText(member.status)}
                          </Badge>
                          {member.role === 'admin' && (
                            <Badge variant="outline" className="text-xs">Admin</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.profile?.email || member.invitation?.invitee_email}
                        </p>
                        {member.status === 'pending' && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Invitation sent {member.invitation ? new Date(member.invitation.created_at).toLocaleDateString() : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    {isOwner && member.user_id !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {group.expenses.length > 0 ? (
                <div className="space-y-4">
                  {group.expenses.slice(0, 5).map((expense: any) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-muted-foreground">
                          Paid by {expense.payer?.full_name || 'Someone'} • {new Date(expense.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{expense.amount}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No expenses yet</p>
                  <p className="text-sm">Create your first expense to get started!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        groupMembers={(modalMembers && modalMembers.length > 0) ? modalMembers : group.members.filter(m => m.status === 'active').map(m => ({
          id: m.user_id,
          name: m.profile?.full_name || 'Unknown',
          avatar: m.profile?.full_name?.substring(0, 2).toUpperCase() || 'UN'
        }))}
        currentUser={currentUser}
        groupId={group.id}
        onExpenseCreated={handleExpenseCreated}
      />

      <SettleUpModal
        isOpen={showSettleUp}
        onClose={() => setShowSettleUp(false)}
        group={{
          id: group.id,
          name: group.name,
          members: group.members.filter(m => m.status === 'active').map(m => ({
            id: m.user_id,
            name: m.profile?.full_name || 'Unknown',
            avatar: m.profile?.full_name?.substring(0, 2).toUpperCase() || 'UN'
          }))
        }}
        onSettleUp={() => {
          // Sync group view after a successful settlement
          fetchGroupDetails();
          console.log("Settlement recorded successfully!");
        }}
      />

      <AddMembersModal
        isOpen={showAddMembers}
        onClose={() => setShowAddMembers(false)}
        group={{
          id: group.id,
          name: group.name
        }}
        onMembersAdded={handleMembersAdded}
      />

      <CreateGroupModal
        isOpen={showEditGroup}
        onClose={() => setShowEditGroup(false)}
        onCreateGroup={() => {
          // This should be an edit operation
          console.log("Edit group functionality coming soon");
          setShowEditGroup(false);
        }}
      />

      {/* Delete Group Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{group.name}"? This action cannot be undone and will remove all expenses and member data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup}>
              Delete Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Group Confirmation */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave "{group.name}"? You will no longer have access to this group's expenses.
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
    </div>
  );
}