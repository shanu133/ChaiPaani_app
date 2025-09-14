import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import ChaiPaaniLogo from "figma:asset/ed44a61a321c772f05e626fe7aae98312671f4e9.png";
import ChaiPaaniLogoFull from "figma:asset/eae4acbb88aec2ceea0a68082bc9da850f60105a.png";
import { 
  ArrowLeft,
  Bell,
  Check,
  X,
  IndianRupee,
  Users,
  Receipt,
  UserPlus,
  DollarSign,
  Calendar,
  Settings,
  Trash2,
  MoreVertical,
  Filter,
  Mail
} from "lucide-react";

interface NotificationsPageProps {
  onBack: () => void;
  onLogoClick?: () => void;
}

interface Notification {
  id: string;
  type: 'expense_added' | 'payment_received' | 'payment_reminder' | 'group_invitation' | 'settlement_request' | 'group_update';
  title: string;
  message: string;
  isRead: boolean;
  timestamp: Date;
  data?: {
    amount?: number;
    groupName?: string;
    payerName?: string;
    expenseTitle?: string;
    avatar?: string;
  };
}

// Mock notification data
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'expense_added',
    title: 'New Expense Added',
    message: 'Rahul added "Dinner at Pizza Hut" for ₹1,200. You owe ₹300.',
    isRead: false,
    timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    data: {
      amount: 300,
      groupName: 'Goa Trip 2024',
      payerName: 'Rahul',
      expenseTitle: 'Dinner at Pizza Hut',
      avatar: 'R'
    }
  },
  {
    id: '2',
    type: 'payment_received',
    title: 'Payment Received',
    message: 'Priya paid you ₹450 for "Uber rides"',
    isRead: false,
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    data: {
      amount: 450,
      groupName: 'Office Lunch Group',
      payerName: 'Priya',
      expenseTitle: 'Uber rides',
      avatar: 'P'
    }
  },
  {
    id: '3',
    type: 'group_invitation',
    title: 'Group Invitation',
    message: 'Amit invited you to join "Weekend Movie Gang"',
    isRead: false,
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    data: {
      groupName: 'Weekend Movie Gang',
      payerName: 'Amit',
      avatar: 'A'
    }
  },
  {
    id: '4',
    type: 'payment_reminder',
    title: 'Payment Reminder',
    message: 'You owe Neha ₹250 for "Coffee meetup". Due 2 days ago.',
    isRead: true,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    data: {
      amount: 250,
      groupName: 'Friends Circle',
      payerName: 'Neha',
      expenseTitle: 'Coffee meetup',
      avatar: 'N'
    }
  },
  {
    id: '5',
    type: 'settlement_request',
    title: 'Settlement Request',
    message: 'Karan wants to settle up. You owe ₹1,125 total.',
    isRead: true,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    data: {
      amount: 1125,
      groupName: 'Goa Trip 2024',
      payerName: 'Karan',
      avatar: 'K'
    }
  },
  {
    id: '6',
    type: 'group_update',
    title: 'Group Updated',
    message: 'Pooja updated group details for "Office Lunch Group"',
    isRead: true,
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    data: {
      groupName: 'Office Lunch Group',
      payerName: 'Pooja',
      avatar: 'P'
    }
  }
];

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'expense_added':
      return <Receipt className="w-4 h-4 text-orange-500" />;
    case 'payment_received':
      return <IndianRupee className="w-4 h-4 text-green-500" />;
    case 'payment_reminder':
      return <Bell className="w-4 h-4 text-red-500" />;
    case 'group_invitation':
      return <UserPlus className="w-4 h-4 text-blue-500" />;
    case 'settlement_request':
      return <DollarSign className="w-4 h-4 text-purple-500" />;
    case 'group_update':
      return <Users className="w-4 h-4 text-gray-500" />;
    default:
      return <Bell className="w-4 h-4 text-gray-500" />;
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

export function NotificationsPage({ onBack, onLogoClick }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const displayNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
  };

  const markAsUnread = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: false } : n
      )
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
              <h1 className="text-xl font-semibold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
              >
                <Check className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'unread')}>
              <TabsList>
                <TabsTrigger value="all">
                  All ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread ({unreadCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent className="p-0">
            {displayNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
                </h3>
                <p className="text-muted-foreground">
                  {activeTab === 'unread' 
                    ? 'All caught up! Check back later for new notifications.'
                    : 'When you have new notifications, they\'ll appear here.'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {displayNotifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50/50 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <Avatar className="w-10 h-10 mt-1">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {notification.data?.avatar || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 mb-1">
                            {getNotificationIcon(notification.type)}
                            <h4 className="font-medium text-sm">
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-foreground mb-2">
                          {notification.message}
                        </p>
                        
                        {/* Additional data */}
                        {notification.data?.groupName && (
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="secondary" className="text-xs">
                              {notification.data.groupName}
                            </Badge>
                            {notification.data.amount && (
                              <Badge variant="outline" className="text-xs">
                                ₹{notification.data.amount}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {notification.type === 'group_invitation' && (
                            <>
                              <Button size="sm" className="h-7 text-xs">
                                Accept
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs">
                                Decline
                              </Button>
                            </>
                          )}
                          
                          {notification.type === 'payment_reminder' && (
                            <Button size="sm" className="h-7 text-xs">
                              Pay Now
                            </Button>
                          )}
                          
                          {notification.type === 'settlement_request' && (
                            <Button size="sm" className="h-7 text-xs">
                              Settle Up
                            </Button>
                          )}
                          
                          <div className="flex-1" />
                          
                          {notification.isRead ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsUnread(notification.id)}
                              className="h-7 text-xs text-muted-foreground"
                            >
                              <Mail className="w-3 h-3 mr-1" />
                              Mark unread
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-7 text-xs text-muted-foreground"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Mark read
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Settings Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified about new expenses and payments</p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive daily summary emails</p>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Payment Reminders</p>
                <p className="text-sm text-muted-foreground">Get reminded about pending payments</p>
              </div>
              <Button variant="outline" size="sm">
                Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}