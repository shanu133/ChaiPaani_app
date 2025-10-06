import { useState, useEffect } from 'react'
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { AddExpenseModal } from "./add-expense-modal";
import { CreateGroupModal } from "./create-group-modal";
import { SettleUpModal } from "./settle-up-modal";
import { ScanReceiptModal } from "./scan-receipt-modal";
import ChaiPaaniLogo from "../assets/ed44a61a321c772f05e626fe7aae98312671f4e9.png";
import ChaiPaaniLogoFull from "../assets/eae4acbb88aec2ceea0a68082bc9da850f60105a.png";
import {
  Plus,
  Users,
  Receipt,
  Bell,
  Settings,
  LogOut,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Clock,
  Menu,
  X,
  Loader2,
} from "lucide-react";
import { groupService, expenseService, authService } from "../lib/supabase-service";

// Explicit type interfaces
interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface GroupMemberBasic {
  user_id: string;
  role?: string;
  status?: string;
}

interface Group {
  id: string;
  name: string;
  group_members?: GroupMemberBasic[];
}

interface ExpenseSplit {
  user_id: string;
  amount: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  created_at: string;
  payer: string;
  group: {
    id: string;
    name: string;
  };
  expense_splits: ExpenseSplit[];
}

interface BalanceItem {
  amount: number;
  user_id?: string;
  group_id?: string;
}

interface RpcGroupMember {
  user_id: string;
  display_name: string;
  status: string;
}

// Constants
const GROUP_MEMBER_STATUS_ACTIVE = 'active';

interface DashboardProps {
  onLogout: () => void;
  onGoToGroups?: () => void;
  onGoToNotifications?: () => void;
  onGoToActivity?: () => void;
  onGoToSettings?: () => void;
  onLogoClick?: () => void;
}

export function Dashboard({
  onLogout,
  onGoToGroups,
  onGoToNotifications,
  onGoToActivity,
  onGoToSettings,
  onLogoClick,
}: DashboardProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isSettleUpModalOpen, setIsSettleUpModalOpen] = useState(false);
  const [isScanReceiptModalOpen, setIsScanReceiptModalOpen] = useState(false);
  const [modalGroupMembers, setModalGroupMembers] = useState<{ id: string; name: string; avatar: string }[]>([]);
  const [modalGroupId, setModalGroupId] = useState<string | null>(null);

  // Real data state with explicit types
  const [groups, setGroups] = useState<Group[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [userBalance, setUserBalance] = useState<{ owed: number; owes: number; net: number }>({ owed: 0, owes: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Data fetching functions
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const user = await authService.getCurrentUser();
      setCurrentUser(user as AuthUser | null);

      // Fetch user groups
      const { data: groupsData, error: groupsError } = await groupService.getUserGroups();
      if (groupsError) throw groupsError;
      setGroups((groupsData || []) as unknown as Group[]);

      // Fetch recent expenses
      const { data: expensesData, error: expensesError } = await expenseService.getRecentExpenses(10);
      if (expensesError) throw expensesError;
      setRecentExpenses((expensesData || []) as unknown as Expense[]);

      // Fetch user balance
      const { data: balanceData, error: balanceError } = await expenseService.getUserBalance();
      if (balanceError) throw balanceError;

      // Normalize balanceData to array if needed
      let balances: BalanceItem[] = [];
      if (Array.isArray(balanceData)) {
        balances = balanceData as unknown as BalanceItem[];
      } else if (balanceData && typeof balanceData === "object") {
        balances = [balanceData as unknown as BalanceItem];
      }

      // Calculate balance summary
// Calculate balance summary
if (balances.length > 0) {
  const owed = balances
    .filter((item) => typeof item.amount === "number" && item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0);
  const owes = Math.abs(
    balances
      .filter((item) => typeof item.amount === "number" && item.amount < 0)
      .reduce((sum, item) => sum + item.amount, 0)
  );
  setUserBalance({ owed, owes, net: owed - owes });
} else {
  // Avoid stale totals if API returns empty/null
  setUserBalance({ owed: 0, owes: 0, net: 0 });
}
      

    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper to open Add Expense for a specific group, fetching members via RPC
  const openAddExpenseForGroup = async (gid: string) => {
    try {
      setModalGroupId(gid);
      setModalGroupMembers([]);
      const { data, error } = await groupService.getGroupMembersWithStatus(gid);
      
      if (error) {
        setError('Failed to fetch group members');
        return;
      }
      
      if (!Array.isArray(data)) {
        setError('Invalid group members data');
        return;
      }
      
      // Validate and map members
      const actives = (data as RpcGroupMember[])
        .filter((m) => {
          // Validate required fields
          if (!m.user_id || typeof m.user_id !== 'string') return false;
          if (!m.display_name || typeof m.display_name !== 'string') return false;
          return m.status === GROUP_MEMBER_STATUS_ACTIVE;
        })
        .map((m) => ({
          id: m.user_id,
          name: m.display_name, // Already validated as non-empty string
          avatar: m.display_name.substring(0, 2).toUpperCase()
        }));
      
      if (actives.length === 0) {
        setError('No active members found in this group');
        return;
      }
      
      setModalGroupMembers(actives);
      setIsAddExpenseModalOpen(true);
    } catch (e) {
      console.error('Could not fetch members for Add Expense modal:', e);
      setError('Failed to open Add Expense modal');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 lg:p-6 border-b">
            <div className="flex items-center justify-between">
              <button
                onClick={onLogoClick}
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
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
            >
              <Receipt className="w-4 h-4" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={onGoToGroups}
            >
              <Users className="w-4 h-4" />
              Groups
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={onGoToActivity}
            >
              <Clock className="w-4 h-4" />
              Activity
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={onGoToNotifications}
            >
              <Bell className="w-4 h-4" />
              Notifications
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={onGoToSettings}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>

          {/* Add Expense Button */}
          <div className="p-4 border-t">
            <Button
              className="w-full gap-2"
              onClick={() => {
                if (groups.length > 0) {
                  openAddExpenseForGroup(groups[0].id);
                } else {
                  console.error('No groups available. Create a group first.');
                }
              }}
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </Button>
          </div>

          {/* User Menu */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarFallback>
                  {currentUser?.user_metadata?.full_name
                    ? currentUser.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                    : 'U'
                  }
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {currentUser?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {currentUser?.email || 'user@example.com'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={onLogout}
            >
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
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onGoToNotifications}
              className="relative p-2 h-9 w-9 rounded-full hover:bg-primary/10 transition-all duration-200 group"
            >
              <Bell className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full text-xs flex items-center justify-center text-white font-medium shadow-lg animate-pulse">
                3
              </span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 md:p-6 space-y-6 md:space-y-8">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading your dashboard...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive font-medium">Error loading dashboard</p>
              <p className="text-destructive/80 text-sm mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={fetchDashboardData}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Main Content - Only show when not loading and no error */}
          {!loading && !error && (
            <>
              {/* Summary Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Balance
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-primary">
                  {userBalance.net >= 0 ? "+" : ""}₹{Math.abs(userBalance.net)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {userBalance.net >= 0 ? "You are owed overall" : "You owe overall"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  You Owe
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-destructive">
                  ₹{userBalance.owes}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {groups.length} groups
                </p>
              </CardContent>
            </Card>

            <Card className="sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  You Are Owed
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-primary">
                  ₹{userBalance.owed}
                </div>
                <p className="text-xs text-muted-foreground">
                  From group members
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Groups */}
          <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
            {/* Recent Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base md:text-lg">
                  Recent Expenses
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs md:text-sm"
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                {recentExpenses.length > 0 ? recentExpenses.map((expense: any) => {
                  const isCurrentUserPayer = expense.payer?.id === currentUser?.id;
                  const userSplit = expense.expense_splits?.find((split: any) => split.user_id === currentUser?.id);
                  const yourShare = userSplit?.amount || 0;
                  const expenseType = isCurrentUserPayer ? "owed" : (yourShare > 0 ? "owes" : "owed");

                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Receipt className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm md:text-base truncate">
                            {expense.description}
                          </p>
                          <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground">
                            <span>Paid by {expense.payer?.full_name || "Someone"}</span>
                            <span>•</span>
                            <span className="truncate">
                              {expense.group?.name || "Group"}
                            </span>
                            <span className="hidden sm:inline">
                              •
                            </span>
                            <span className="hidden sm:inline">
                              {new Date(expense.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-sm md:text-base">
                          ₹{expense.amount}
                        </p>
                        <p
                          className={`text-xs md:text-sm ${expenseType === "owed" ? "text-primary" : "text-destructive"}`}
                        >
                          {expenseType === "owed" ? "+" : "-"}₹{yourShare}
                        </p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No expenses yet</p>
                    <p className="text-sm">Create your first expense to get started!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Groups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Your Groups
                  <Button variant="ghost" size="sm" onClick={() => setIsCreateGroupModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Group
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {groups.length > 0 ? groups.map((group: any) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={onGoToGroups}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {group.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {group.group_members?.length || 0} members
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Active</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddExpenseForGroup(group.id);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Expense
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No groups yet</p>
                    <p className="text-sm">Create your first group to get started!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <Button
                  variant="outline"
                  className="h-16 md:h-20 flex-col gap-1 md:gap-2 text-xs md:text-sm"
                  onClick={() => {
                    if (groups.length > 0) {
                      openAddExpenseForGroup(groups[0].id);
                    } else {
                      console.error('No groups available. Create a group first.');
                    }
                  }}
                >
                  <Plus className="w-5 h-5 md:w-6 md:h-6" />
                  Add Expense
                </Button>
                <Button
                  variant="outline"
                  className="h-16 md:h-20 flex-col gap-1 md:gap-2 text-xs md:text-sm"
                  onClick={() => setIsCreateGroupModalOpen(true)}
                >
                  <Users className="w-5 h-5 md:w-6 md:h-6" />
                  Create Group
                </Button>
                <Button
                  variant="outline"
                  className="h-16 md:h-20 flex-col gap-1 md:gap-2 text-xs md:text-sm"
                  onClick={() => setIsSettleUpModalOpen(true)}
                >
                  <IndianRupee className="w-5 h-5 md:w-6 md:h-6" />
                  Settle Up
                </Button>
                <Button
                  variant="outline"
                  className="h-16 md:h-20 flex-col gap-1 md:gap-2 text-xs md:text-sm"
                  onClick={() => setIsScanReceiptModalOpen(true)}
                >
                  <Receipt className="w-5 h-5 md:w-6 md:h-6" />
                  Scan Receipt
                </Button>
              </div>
            </CardContent>
          </Card>
          </>
        )}
        </main>
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        groupMembers={modalGroupMembers}
        currentUser={currentUser ? {
          id: currentUser.id,
          name: currentUser.user_metadata?.full_name || "You",
          avatar: (currentUser.user_metadata?.full_name || "You").substring(0, 2).toUpperCase()
        } : { id: "temp", name: "You", avatar: "YO" }}
        groupId={modalGroupId || (groups.length > 0 ? groups[0].id : "")}
        onExpenseCreated={() => {
          console.log("Expense created successfully");
          fetchDashboardData(); // Refresh dashboard data
        }}
      />

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onCreateGroup={(groupData) => {
          console.log("Group created:", groupData);
          setIsCreateGroupModalOpen(false);
        }}
      />

      <SettleUpModal
        isOpen={isSettleUpModalOpen}
        onClose={() => setIsSettleUpModalOpen(false)}
        onSettleUp={(settlementData) => {
          console.log("Settlement recorded:", settlementData);
          // Refresh dashboard data so balances and recent activity reflect the settlement
          fetchDashboardData();
          setIsSettleUpModalOpen(false);
        }}
      />

      <ScanReceiptModal
        isOpen={isScanReceiptModalOpen}
        onClose={() => setIsScanReceiptModalOpen(false)}
        onSuccess={() => {
          console.log("Receipt scanned");
          setIsScanReceiptModalOpen(false);
          setIsAddExpenseModalOpen(true);
        }}
      />
    </div>
  );
}
