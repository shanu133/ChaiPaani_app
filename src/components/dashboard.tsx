import { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { AddExpenseModal } from "./add-expense-modal";
import { CreateGroupModal } from "./create-group-modal";
import { SettleUpModal } from "./settle-up-modal";
import { ScanReceiptModal } from "./scan-receipt-modal";
import ChaiPaaniLogo from "figma:asset/ed44a61a321c772f05e626fe7aae98312671f4e9.png";
import ChaiPaaniLogoFull from "figma:asset/eae4acbb88aec2ceea0a68082bc9da850f60105a.png";
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
} from "lucide-react";

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

  // Mock data for the add expense modal
  const mockGroupMembers = [
    { id: "1", name: "You", avatar: "YU" },
    { id: "2", name: "Arjun", avatar: "AR" },
    { id: "3", name: "Priya", avatar: "PR" },
    { id: "4", name: "Rahul", avatar: "RA" },
  ];

  const currentUser = mockGroupMembers[0];

  const recentExpenses = [
    {
      id: 1,
      description: "Lunch at Udupi Palace",
      amount: 450,
      paidBy: "You",
      group: "Office Squad",
      date: "Today",
      yourShare: 150,
      type: "owed" as const,
    },
    {
      id: 2,
      description: "Movie Tickets",
      amount: 800,
      paidBy: "Arjun",
      group: "Weekend Gang",
      date: "Yesterday",
      yourShare: 200,
      type: "owes" as const,
    },
    {
      id: 3,
      description: "Grocery Shopping",
      amount: 1200,
      paidBy: "Priya",
      group: "Roommates",
      date: "2 days ago",
      yourShare: 400,
      type: "owes" as const,
    },
  ];

  const groups = [
    { id: 1, name: "Office Squad", members: 4, balance: 250 },
    { id: 2, name: "Weekend Gang", members: 6, balance: -180 },
    { id: 3, name: "Roommates", members: 3, balance: 75 },
    { id: 4, name: "Goa Trip 2024", members: 8, balance: 420 },
  ];

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
              onClick={() => setIsAddExpenseModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </Button>
          </div>

          {/* User Menu */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarFallback>YU</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">You</p>
                <p className="text-sm text-muted-foreground truncate">
                  demo@chaipaani.com
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
                  +₹545
                </div>
                <p className="text-xs text-muted-foreground">
                  You are owed overall
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
                  ₹380
                </div>
                <p className="text-xs text-muted-foreground">
                  Across 2 groups
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
                  ₹925
                </div>
                <p className="text-xs text-muted-foreground">
                  From 3 people
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
                {recentExpenses.map((expense) => (
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
                          <span>Paid by {expense.paidBy}</span>
                          <span>•</span>
                          <span className="truncate">
                            {expense.group}
                          </span>
                          <span className="hidden sm:inline">
                            •
                          </span>
                          <span className="hidden sm:inline">
                            {expense.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-medium text-sm md:text-base">
                        ₹{expense.amount}
                      </p>
                      <p
                        className={`text-xs md:text-sm ${expense.type === "owed" ? "text-primary" : "text-destructive"}`}
                      >
                        {expense.type === "owed" ? "+" : "-"}₹
                        {expense.yourShare}
                      </p>
                    </div>
                  </div>
                ))}
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
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
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
                          {group.members} members
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {group.balance === 0 ? (
                        <Badge variant="secondary">
                          Settled
                        </Badge>
                      ) : (
                        <p
                          className={`font-medium ${group.balance > 0 ? "text-primary" : "text-destructive"}`}
                        >
                          {group.balance > 0 ? "+" : ""}₹
                          {group.balance}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
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
                  onClick={() => setIsAddExpenseModalOpen(true)}
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
        </main>
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        groupMembers={mockGroupMembers}
        currentUser={currentUser}
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
          setIsSettleUpModalOpen(false);
        }}
      />

      <ScanReceiptModal
        isOpen={isScanReceiptModalOpen}
        onClose={() => setIsScanReceiptModalOpen(false)}
        onReceiptScanned={(receiptData) => {
          console.log("Receipt scanned:", receiptData);
          setIsScanReceiptModalOpen(false);
          setIsAddExpenseModalOpen(true);
        }}
      />
    </div>
  );
}