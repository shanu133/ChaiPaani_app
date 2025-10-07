import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import ChaiPaaniLogo from "../assets/ed44a61a321c772f05e626fe7aae98312671f4e9.png";
import ChaiPaaniLogoFull from "../assets/eae4acbb88aec2ceea0a68082bc9da850f60105a.png";
import { AddExpenseModal } from "./add-expense-modal";
import { CreateGroupModal } from "./create-group-modal";
import { SettleUpModal } from "./settle-up-modal";
import { GroupMenuModal } from "./group-menu-modal";
import { EditGroupModal } from "./edit-group-modal";
import {
  Plus,
  Users,
  Receipt,
  Bell,
  Settings,
  LogOut,
  IndianRupee,
  Search,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Menu,
  X,
  ArrowLeft,
  Calendar
} from "lucide-react";
import { groupService, expenseService, authService, invitationService } from "../lib/supabase-service";
import { supabase } from "../lib/supabase";
import * as Sonner from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

interface GroupsPageProps {
  onLogout: () => void;
  onBack: () => void;
  onLogoClick?: () => void;
  onGoToGroup?: (groupId: string) => void;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  totalExpenses: number;
  yourBalance: number;
  recentActivity: string;
  category: string;
  currency: string;
  created_at: string;
  created_by: string;
  members: Array<{
    id: string;
    name: string;
    avatar: string;
  }>;
}

// interface SettleUpGroup { /* unused */ }

export function GroupsPage({ onLogout, onBack, onLogoClick, onGoToGroup }: GroupsPageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const openEditGroupModal = (group: { id: string; name: string }) => {
    setSelectedGroup((prev) => {
      // if we already have the full selectedGroup, keep other fields; else set minimal
      if (prev && prev.id === group.id) return prev;
      return {
        id: group.id,
        name: group.name,
        description: "",
        memberCount: 0,
        totalExpenses: 0,
        yourBalance: 0,
        recentActivity: "",
        category: "Other",
        currency: "INR",
        created_at: "",
        created_by: currentUser?.id || "",
        members: []
      };
    });
    setShowEditGroup(true);
  };
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [modalMembers, setModalMembers] = useState<{ id: string; name: string; avatar: string }[]>([]);
  const [pendingGroups, setPendingGroups] = useState<Array<{ group_id: string; token: string; group_name: string; category: string; created_at: string }>>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const notify = {
    error: (msg: string) => (Sonner as any)?.toast?.error ? (Sonner as any).toast.error(msg) : (Sonner as any)?.toast ? (Sonner as any).toast(msg) : alert(msg),
    success: (msg: string) => (Sonner as any)?.toast?.success ? (Sonner as any).toast.success(msg) : (Sonner as any)?.toast ? (Sonner as any).toast(msg) : console.info(msg),
  };

  // Fetch user groups on component mount
  useEffect(() => {
    fetchUserGroups();
    fetchCurrentUser();
    fetchPendingInvitations();
  }, []);

  const refreshAll = async () => {
    try {
      setRefreshing(true);
      setGroupsError(null);
      await Promise.all([fetchUserGroups(), fetchPendingInvitations()]);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await groupService.getUserGroups();

      if (error) {
        console.error("Error fetching groups:", error);
        const msg = typeof error === 'string' ? error : (error as any)?.message || 'Failed to load groups';
        setGroupsError(msg);
        notify.error(msg);
        return;
      }

      if (data) {
        // Transform Supabase data to match our Group interface
        // Fetch all balances in one call for all group IDs
        const groupIds = data.map((group: any) => group.id);
        let balancesMap: Record<string, number> = {};
        try {
          const { data: balancesData } = await expenseService.getUserBalancesForGroups(groupIds);
          // balancesData should be an array of { group_id, net_balance }
          if (balancesData) {
            balancesMap = balancesData.reduce((acc: Record<string, number>, item: any) => {
              acc[item.group_id] = item.net_balance || 0;
              return acc;
            }, {});
          }
        } catch (error) {
          console.error("Error fetching balances for groups:", error);
        }

        const transformedGroups: Group[] = data.map((group: any) => {
          // Calculate total expenses (sum of all expense amounts)
          const totalExpenses = group.expenses?.reduce((sum: number, expense: any) => sum + expense.amount, 0) || 0;

          // Get user's balance from the map
          const yourBalance = balancesMap[group.id] || 0;

          // Calculate recent activity
          const recentActivity = group.expenses?.length > 0
            ? `Last expense ${new Date(group.expenses[0].created_at).toLocaleDateString()}`
            : "No recent activity";

          return {
            id: group.id,
            name: group.name,
            description: group.description,
            memberCount: group.group_members?.length || 0,
            totalExpenses,
            yourBalance,
            recentActivity,
            category: group.category,
            currency: group.currency,
            created_at: group.created_at,
            created_by: group.created_by,
            members: group.group_members?.map((member: any) => ({
              id: member.user_id,
              name: member.profiles?.full_name || "Unknown",
              avatar: member.profiles?.full_name?.substring(0, 2).toUpperCase() || "UN"
            })) || []
          };
        });

        setGroups(transformedGroups);
        setGroupsError(null);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      const msg = typeof error === 'string' ? error : (error as any)?.message || 'Failed to load groups';
      setGroupsError(msg);
      notify.error(msg);
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

  const fetchPendingInvitations = async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_invitations')
      if (error) {
        console.warn('Could not fetch pending invitations:', error)
        return
      }
      setPendingGroups((data || []) as any)
    } catch (e) {
      console.warn('Error fetching pending invitations:', e)
    }
  }


  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Work": return "bg-blue-100 text-blue-800";
      case "Entertainment": return "bg-purple-100 text-purple-800";
      case "Home": return "bg-green-100 text-green-800";
      case "Travel": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleGroupClick = (group: Group) => {
    // Navigate to group detail page
    if (onGoToGroup) {
      onGoToGroup(group.id);
    } else {
      setSelectedGroup(group);
      setShowAddExpense(true);
    }
  };

  const handleCreateGroup = async (groupData: any) => {
    // Group was already created by CreateGroupModal
    // Just refresh the groups list
    console.log(`Group "${groupData.name}" created successfully!`);
    fetchUserGroups();
  };

  // Removed unused handleSettleUp; inline callbacks now refresh data

  const handleGroupMenuAction = (group: Group, action: string) => {
    setSelectedGroup(group);
    switch (action) {
      case 'settle':
        setShowSettleUp(true);
        break;
      case 'menu':
        setShowGroupMenu(true);
        break;
      default:
        break;
    }
  };

  const acceptPendingInvite = async (token: string) => {
    const result = await invitationService.acceptByToken(token);
    const error = result?.error;
    const hasMessage = (e: unknown): e is { message?: string } => typeof e === 'object' && e !== null && 'message' in (e as Record<string, unknown>);
    if (error) {
      console.error('Failed to accept invitation:', error);
      const msg = typeof error === 'string' ? error : hasMessage(error) ? (error.message || 'Failed to accept invitation') : 'Failed to accept invitation';
      notify.error(msg);
      return;
    }
    await fetchUserGroups();
    await fetchPendingInvitations();
    notify.success('Joined group successfully');
  }

  const openAddExpenseForGroup = async (group: Group) => {
    setSelectedGroup(group);
    try {
      const { data } = await groupService.getGroupMembersWithStatus(group.id);
      const active = (data || []).filter((r: any) => r.status === 'active');
      const mapped = active.map((m: any) => ({
        id: m.user_id,
        name: m.display_name,
        avatar: (m.display_name || 'UN').substring(0, 2).toUpperCase()
      }));
      setModalMembers(mapped);
    } catch (_) {
      setModalMembers(group.members);
    } finally {
      setShowAddExpense(true);
    }
  };


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
            <Button variant="default" className="w-full justify-start gap-3">
              <Users className="w-4 h-4" />
              Groups
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Calendar className="w-4 h-4" />
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
            <Button
              className="w-full gap-2"
              onClick={async () => {
                if (groups.length === 0) {
                  notify.error("Please create a group first before adding expenses");
                  return;
                }
                if (groups.length === 1) {
                  await openAddExpenseForGroup(groups[0]);
                  return;
                }
                setShowGroupPicker(true);
              }}
              disabled={groups.length === 0}
            >
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
                className="md:hidden"
                onClick={onBack}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold">My Groups</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 md:p-6 space-y-6">
          {groupsError && (
            <div className="p-3 border border-destructive/30 bg-destructive/10 text-destructive rounded-md flex items-center justify-between">
              <span className="text-sm truncate">{groupsError}</span>
              <div className="flex gap-2 ml-4">
                <Button size="sm" variant="outline" onClick={() => fetchUserGroups()} disabled={loading}>
                  Retry
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setGroupsError(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button className="gap-2" onClick={() => setShowCreateGroup(true)}>
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          </div>

          {/* Pending Invitations */}
          {pendingGroups.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Pending invitations</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingGroups.map(pg => (
                  <Card key={`pending-${pg.group_id}-${pg.token}`} className="hover:shadow-lg transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg leading-tight">{pg.group_name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{pg.category || 'general'}</Badge>
                            <span className="text-xs text-muted-foreground">Invited on {new Date(pg.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge variant="secondary">Invited</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => acceptPendingInvite(pg.token)}>Join</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Groups Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="space-y-2">
                      <div className="h-5 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <div className="h-6 bg-muted rounded w-16"></div>
                      <div className="h-6 bg-muted rounded w-12"></div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="w-8 h-8 bg-muted rounded-full"></div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <div className="h-4 bg-muted rounded w-24"></div>
                        <div className="h-4 bg-muted rounded w-16"></div>
                      </div>
                      <div className="flex justify-between">
                        <div className="h-4 bg-muted rounded w-20"></div>
                        <div className="h-4 bg-muted rounded w-12"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              filteredGroups.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                    <Users className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? "No groups found" : "No groups yet"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery
                      ? "Try adjusting your search terms"
                      : "Create your first group to start splitting expenses with friends"
                    }
                  </p>
                  {!searchQuery && (
                    <Button className="gap-2" onClick={() => setShowCreateGroup(true)}>
                      <Plus className="w-4 h-4" />
                      Create Your First Group
                    </Button>
                  )}
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <Card
                    key={group.id}
                    className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest('[data-no-nav]')) return
                      handleGroupClick(group)
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg leading-tight">{group.name}</CardTitle>
                          <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto"
                          data-no-nav
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleGroupMenuAction(group, 'menu');
                          }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Badge className={getCategoryColor(group.category)} variant="secondary">
                          {group.category}
                        </Badge>
                        <Badge variant="outline">
                          <Users className="w-3 h-3 mr-1" />
                          {group.memberCount}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Members Preview */}
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {group.members.slice(0, 4).map((member) => (
                            <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
                              <AvatarFallback className="text-xs">{member.avatar}</AvatarFallback>
                            </Avatar>
                          ))}
                          {group.members.length > 4 && (
                            <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">+{group.members.length - 4}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Expenses</span>
                          <span className="font-medium">₹{group.totalExpenses.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Your Balance</span>
                          <div className="flex items-center gap-1">
                            {group.yourBalance > 0 ? (
                              <TrendingUp className="w-4 h-4 text-primary" />
                            ) : group.yourBalance < 0 ? (
                              <TrendingDown className="w-4 h-4 text-destructive" />
                            ) : null}
                            <span className={`font-medium ${
                              group.yourBalance > 0 ? 'text-primary' :
                              group.yourBalance < 0 ? 'text-destructive' :
                              'text-muted-foreground'
                            }`}>
                              {group.yourBalance > 0 ? '+' : ''}₹{group.yourBalance}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Last Activity</span>
                          <span className="text-sm">{group.recentActivity}</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-0 text-xs"
                          data-no-nav
                          onClick={async (e: React.MouseEvent) => {
                            e.stopPropagation();
                            e.preventDefault();
                            await openAddExpenseForGroup(group);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Add Expense</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-0 text-xs"
                          data-no-nav
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleGroupMenuAction(group, 'settle');
                          }}
                        >
                          <IndianRupee className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Settle Up</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <Dialog open={showGroupPicker} onOpenChange={(open) => setShowGroupPicker(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select a group</DialogTitle>
            <DialogDescription>Choose a group to add your expense to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-auto">
            {groups.map((g) => (
              <Button
                key={`pick-${g.id}`}
                variant="ghost"
                className="w-full justify-between"
                onClick={async () => {
                  setShowGroupPicker(false);
                  await openAddExpenseForGroup(g);
                }}
              >
                <span className="truncate text-left">{g.name}</span>
                <Badge variant="outline" className="ml-2">{g.category}</Badge>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AddExpenseModal
        isOpen={!!selectedGroup?.id && showAddExpense}
        onClose={() => {
          setShowAddExpense(false);
          setSelectedGroup(null);
        }}
        groupMembers={(modalMembers && modalMembers.length > 0) ? modalMembers : (selectedGroup?.members || [])}
        currentUser={currentUser}
        groupId={selectedGroup?.id || ""}
        onExpenseCreated={() => {
          console.log("Expense created successfully");
          fetchUserGroups(); // Refresh groups data
        }}
      />

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreateGroup={handleCreateGroup}
      />

      <SettleUpModal
        isOpen={showSettleUp}
        onClose={() => {
          setShowSettleUp(false);
          setSelectedGroup(null);
        }}
        group={selectedGroup ? {
          id: selectedGroup.id,
          name: selectedGroup.name,
          members: selectedGroup.members
        } : undefined}
        onSettleUp={() => {
          // After settling, refresh groups to sync balances and recent activity
          fetchUserGroups();
        }}
      />

      {selectedGroup && showGroupMenu && (
        <GroupMenuModal
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          isOwner={currentUser && selectedGroup.created_by === currentUser.id}
          onClose={() => {
            setShowGroupMenu(false);
            setSelectedGroup(null);
          }}
          onGroupUpdate={() => {
            fetchUserGroups();
            setShowGroupMenu(false);
            setSelectedGroup(null);
          }}
          onGroupLeave={() => {
            fetchUserGroups();
            setShowGroupMenu(false);
            setSelectedGroup(null);
          }}
          onGroupDelete={() => {
            fetchUserGroups();
            setShowGroupMenu(false);
            setSelectedGroup(null);
          }}
          openEditGroupModal={openEditGroupModal}
        />
      )}

      {/* Edit Group Modal */}
      <EditGroupModal
        isOpen={showEditGroup}
        onClose={() => setShowEditGroup(false)}
        group={selectedGroup ? {
          id: selectedGroup.id,
          name: selectedGroup.name,
          description: selectedGroup.description,
          category: selectedGroup.category
        } : undefined}
        onGroupUpdated={() => {
          // Refresh groups to reflect updated details
          fetchUserGroups();
          setShowEditGroup(false);
        }}
      />

    </div>
  );
}
