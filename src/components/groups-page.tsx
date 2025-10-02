import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import ChaiPaaniLogo from "figma:asset/ed44a61a321c772f05e626fe7aae98312671f4e9.png";
import ChaiPaaniLogoFull from "figma:asset/eae4acbb88aec2ceea0a68082bc9da850f60105a.png";
import { AddExpenseModal } from "./add-expense-modal";
import { CreateGroupModal } from "./create-group-modal";
import { SettleUpModal } from "./settle-up-modal";
import { GroupMenuModal } from "./group-menu-modal";
import { DateFilterModal, DateFilter } from "./date-filter-modal";
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
  Calendar,
  TrendingUp,
  TrendingDown,
  Menu,
  X,
  ArrowLeft,
  Filter,
  Loader2
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { groupService, expenseService, authService } from "../lib/supabase-service";
import { supabase } from "../lib/supabase";

interface GroupsPageProps {
  onLogout: () => void;
  onBack: () => void;
  onLogoClick?: () => void;
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
  members: Array<{
    id: string;
    name: string;
    avatar: string;
  }>;
}

interface SettleUpGroup {
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
}

export function GroupsPage({ onLogout, onBack, onLogoClick }: GroupsPageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [currentDateFilter, setCurrentDateFilter] = useState<DateFilter>({ type: 'all', label: 'All Time' });
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Fetch user groups on component mount
  useEffect(() => {
    fetchUserGroups();
    fetchCurrentUser();
  }, []);

  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await groupService.getUserGroups();

      if (error) {
        console.error("Error fetching groups:", error);
        toast.error("Failed to load groups");
        return;
      }

      if (data) {
        // Transform Supabase data to match our Group interface
        const transformedGroups: Group[] = await Promise.all(data.map(async (group: any) => {
          // Calculate total expenses (sum of all expense amounts)
          const totalExpenses = group.expenses?.reduce((sum: number, expense: any) => sum + expense.amount, 0) || 0;

          // Calculate user's balance in this group
          let yourBalance = 0;
          try {
            const { data: balanceData } = await expenseService.getUserBalance(group.id);
            if (balanceData && balanceData.length > 0) {
              yourBalance = balanceData[0].net_balance || 0;
            }
          } catch (error) {
            console.error(`Error fetching balance for group ${group.id}:`, error);
          }

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
            members: group.group_members?.map((member: any) => ({
              id: member.user_id,
              name: member.profiles?.full_name || "Unknown",
              avatar: member.profiles?.full_name?.substring(0, 2).toUpperCase() || "UN"
            })) || []
          };
        }));

        setGroups(transformedGroups);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Failed to load groups");
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
    setSelectedGroup(group);
    setShowAddExpense(true);
  };

  const handleCreateGroup = async (groupData: any) => {
    try {
      const { data, error } = await groupService.createGroup(
        groupData.name,
        groupData.description || "",
        groupData.category || "general"
      );

      if (error) {
        console.error("Error creating group:", error);
        toast.error("Failed to create group");
        return;
      }

      if (data) {
        toast.success(`Group "${groupData.name}" created successfully!`);
        // Refresh groups list
        fetchUserGroups();
      }
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
    }
  };

  const handleSettleUp = (settlementData: any) => {
    // Update group balances after settlement
    toast.success("Settlement recorded successfully!");
  };

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

  const handleDateFilter = (filter: DateFilter) => {
    setCurrentDateFilter(filter);
    toast.success(`Date filter applied: ${filter.label}`);
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
            <Button className="w-full gap-2" onClick={() => setShowAddExpense(true)}>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDateFilter(true)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{currentDateFilter.label}</span>
            </Button>
            <Button variant="ghost" size="sm">
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 md:p-6 space-y-6">
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
                  <Card key={group.id} className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer" onClick={() => handleGroupClick(group)}>
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
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
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
                        <Button variant="outline" size="sm" className="flex-1 min-w-0 text-xs" onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setSelectedGroup(group);
                          setShowAddExpense(true);
                        }}>
                          <Plus className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Add Expense</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-0 text-xs"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
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
      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => {
          setShowAddExpense(false);
          setSelectedGroup(null);
        }}
        groupMembers={selectedGroup?.members || []}
        currentUser={currentUser}
        groupId={selectedGroup?.id || "demo-group"}
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
        onSettleUp={handleSettleUp}
      />

      <GroupMenuModal
        isOpen={showGroupMenu}
        onClose={() => {
          setShowGroupMenu(false);
          setSelectedGroup(null);
        }}
        group={selectedGroup ? {
          ...selectedGroup,
          description: selectedGroup.description || ""
        } : undefined}
        onSettleUp={() => {
          setShowGroupMenu(false);
          setShowSettleUp(true);
        }}
      />

      <DateFilterModal
        isOpen={showDateFilter}
        onClose={() => setShowDateFilter(false)}
        onApplyFilter={handleDateFilter}
        currentFilter={currentDateFilter}
      />
    </div>
  );
}