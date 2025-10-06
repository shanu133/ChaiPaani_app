import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import ChaiPaaniLogo from "../assets/ed44a61a321c772f05e626fe7aae98312671f4e9.png";
import ChaiPaaniLogoFull from "../assets/eae4acbb88aec2ceea0a68082bc9da850f60105a.png";
import { expenseService } from "../lib/supabase-service";
import { toast } from "sonner";
import {
  ArrowLeft,
  Receipt,
  IndianRupee,
  Users,
  UserPlus,
  UserMinus,
  Calendar as CalendarIcon,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Activity as ActivityIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Loader2
} from "lucide-react";

interface ActivityPageProps {
  onBack: () => void;
  onLogoClick?: () => void;
}

interface ActivityItem {
  id: string;
  type: 'expense_added' | 'expense_updated' | 'payment_made' | 'member_joined' | 'member_left' | 'group_created' | 'settlement_completed';
  title: string;
  description: string;
  timestamp: Date;
  user: {
    name: string;
    avatar: string;
  };
  group: {
    name: string;
    id: string;
  };
  metadata?: {
    amount?: number;
    currency?: string;
    expenseTitle?: string;
    payerName?: string;
    receiverName?: string;
  };
}

// Real activity data will be fetched from Supabase

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'expense_added':
      return <Receipt className="w-4 h-4 text-orange-500" />;
    case 'expense_updated':
      return <Receipt className="w-4 h-4 text-blue-500" />;
    case 'payment_made':
      return <IndianRupee className="w-4 h-4 text-green-500" />;
    case 'member_joined':
      return <UserPlus className="w-4 h-4 text-blue-500" />;
    case 'member_left':
      return <UserMinus className="w-4 h-4 text-red-500" />;
    case 'group_created':
      return <Users className="w-4 h-4 text-purple-500" />;
    case 'settlement_completed':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    default:
      return <ActivityIcon className="w-4 h-4 text-gray-500" />;
  }
};

const formatTimestamp = (timestamp: Date) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return timestamp.toLocaleDateString();
};

const groupActivitiesByDate = (activities: ActivityItem[]) => {
  const grouped: { [key: string]: ActivityItem[] } = {};
  
  activities.forEach(activity => {
    const date = activity.timestamp.toDateString();
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(activity);
  });
  
  return grouped;
};

export function ActivityPage({ onBack, onLogoClick }: ActivityPageProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'timeline' | 'summary'>('timeline');

  // Fetch real activity data on component mount
  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await expenseService.getActivitySafe();

      if (error) {
        console.error("Error fetching activities:", error);
        toast.error("Failed to load activities");
        return;
      }

      if (data) {
        // Helper to map incoming activity type/fields to ActivityItem['type']
        const mapActivityType = (activity: any): ActivityItem['type'] => {
          const typeField = (activity.type || activity.action || '').toLowerCase();
          const descField = (activity.description || '').toLowerCase();
          
          // Map based on type/action field or description keywords
          if (typeField.includes('settlement') || descField.includes('settlement')) return 'settlement_completed';
          if (typeField.includes('payment') || typeField === 'paid') return 'payment_made';
          if (typeField.includes('member_left') || typeField === 'left') return 'member_left';
          if (typeField.includes('member_join') || typeField === 'joined' || typeField.includes('invite_accept')) return 'member_joined';
          if (typeField.includes('group_create')) return 'group_created';
          if (typeField.includes('expense_updated') || (typeField === 'update' && descField.includes('expense'))) return 'expense_updated';
          
          // Default to expense_added for general expense records
          return 'expense_added';
        };

        // Transform Supabase data to match our ActivityItem interface
        const transformedActivities: ActivityItem[] = data.map((activity: any) => {
          const activityType = mapActivityType(activity);
          
          return {
            id: activity.id,
            type: activityType,
            title: activity.payer.isCurrentUser ? 'You added an expense' : `${activity.payer.name} added an expense`,
            description: `${activity.payer.name} added "${activity.description}" for ₹${activity.amount}`,
            timestamp: new Date(activity.created_at),
            user: {
              name: activity.payer.name,
              avatar: activity.payer.name.substring(0, 1).toUpperCase()
            },
            group: {
              name: activity.group.name,
              id: activity.group.id
            },
            metadata: {
              amount: activity.amount,
              expenseTitle: activity.description
            }
          };
        });

        setActivities(transformedActivities);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  // Get unique groups
  const groups = Array.from(new Set(activities.map(a => a.group.name)));
  
  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (selectedGroup !== 'all' && activity.group.name !== selectedGroup) return false;
    if (selectedType !== 'all' && activity.type !== selectedType) return false;
    if (dateRange) {
      const activityDate = new Date(activity.timestamp);
      const selectedDate = new Date(dateRange);
      if (activityDate.toDateString() !== selectedDate.toDateString()) return false;
    }
    return true;
  });

  const groupedActivities = groupActivitiesByDate(filteredActivities);

  // Calculate summary stats
  const totalExpenses = filteredActivities.filter(a => a.type === 'expense_added').length;
  const totalPayments = filteredActivities.filter(a => a.type === 'payment_made').length;
  const totalAmount = filteredActivities
    .filter(a => a.metadata?.amount)
    .reduce((sum, a) => sum + (a.metadata?.amount || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
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
            
            <div>
              <h1 className="text-xl font-semibold">Activity</h1>
              <p className="text-sm text-muted-foreground">
                {filteredActivities.length} activities
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Group</label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="All groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All groups</SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Activity Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="expense_added">Expenses Added</SelectItem>
                    <SelectItem value="payment_made">Payments Made</SelectItem>
                    <SelectItem value="member_joined">Members Joined</SelectItem>
                    <SelectItem value="settlement_completed">Settlements</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {dateRange ? dateRange.toLocaleDateString() : "All dates"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange}
                      onSelect={setDateRange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedGroup('all');
                    setSelectedType('all');
                    setDateRange(undefined);
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'timeline' | 'summary')}>
          <TabsList className="mb-6">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <Receipt className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalExpenses}</div>
                  <p className="text-xs text-muted-foreground">
                    In selected period
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                  <IndianRupee className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalPayments}</div>
                  <p className="text-xs text-muted-foreground">
                    Completed transactions
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    All activities combined
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="timeline">
            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  // Loading skeleton
                  <div className="p-4 space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-start gap-3 p-4">
                        <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between">
                            <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                            <div className="h-3 bg-muted rounded w-16 animate-pulse" />
                          </div>
                          <div className="h-4 bg-muted rounded w-full animate-pulse" />
                          <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : Object.keys(groupedActivities).length === 0 ? (
                  <div className="p-8 text-center">
                    <ActivityIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No activities found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your filters to see more activities.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {Object.entries(groupedActivities)
                      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                      .map(([date, dayActivities]) => (
                        <div key={date} className="p-4">
                          <h3 className="font-medium text-sm text-muted-foreground mb-4 sticky top-0 bg-background">
                            {new Date(date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </h3>
                          
                          <div className="space-y-3">
                            {dayActivities
                              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                              .map((activity) => (
                                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                  {/* Timeline line */}
                                  <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-full bg-card border-2 border-muted flex items-center justify-center">
                                      {getActivityIcon(activity.type)}
                                    </div>
                                    <div className="w-px h-8 bg-muted mt-2" />
                                  </div>
                                  
                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <h4 className="font-medium text-sm">{activity.title}</h4>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatTimestamp(activity.timestamp)}
                                      </span>
                                    </div>
                                    
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {activity.description}
                                    </p>
                                    
                                    <div className="flex items-center gap-2">
                                      <Avatar className="w-6 h-6">
                                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                          {activity.user.avatar}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-muted-foreground">
                                        {activity.user.name}
                                      </span>
                                      <Badge variant="secondary" className="text-xs">
                                        {activity.group.name}
                                      </Badge>
                                      {activity.metadata?.amount && (
                                        <Badge variant="outline" className="text-xs">
                                          ₹{activity.metadata.amount}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
