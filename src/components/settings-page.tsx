import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import ChaiPaaniLogo from "../assets/ed44a61a321c772f05e626fe7aae98312671f4e9.png";
import ChaiPaaniLogoFull from "../assets/eae4acbb88aec2ceea0a68082bc9da850f60105a.png";
import { toast } from "sonner";
import { profileService, authService } from "../lib/supabase-service";
import { 
  ArrowLeft,
  User,
  Bell,
  Shield,
  Palette,
  
  Trash2,
  Download,
  Upload,
  
  LogOut,
  Camera,
  Edit,
  Save,
  X
} from "lucide-react";
import SmtpSettingsModal from "./smtp-settings-modal";

interface SettingsPageProps {
  onBack: () => void;
  onLogout: () => void;
  onLogoClick?: () => void;
}

export function SettingsPage({ onBack, onLogout, onLogoClick }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy' | 'appearance' | 'data'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [smtpOpen, setSmtpOpen] = useState(false);
  
  // Profile settings (loaded from Supabase)
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    defaultCurrency: 'INR',
    language: 'English'
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        setProfileError(null);

        // fetch profile from supabase
        const { data, error } = await profileService.getCurrentProfile();
        if (error) {
          setProfileError(error.message || "Failed to load profile");
          return;
        }

        // fallback to auth user email if display_name/full_name missing
        const user = await authService.getCurrentUser();

        setProfile({
          name: data?.display_name || data?.full_name || user?.email || "User",
          email: data?.email || user?.email || "",
          phone: "",
          defaultCurrency: "INR",
          language: "English",
        });
      } catch (e: any) {
        setProfileError(e?.message || "Failed to load profile");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    expenseAdded: true,
    paymentReceived: true,
    paymentReminders: true,
    weeklyDigest: true,
    groupInvitations: true,
    settlementRequests: true
  });
  
  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'friends',
    showActivity: true,
    allowInvitations: true,
    shareAnalytics: false
  });
  
  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: 'light',
    accentColor: 'default',
    compactView: false,
    showAvatars: true
  });

  const handleSaveProfile = async () => {
    try {
      const displayName = profile.name?.trim();
      if (!displayName) {
        toast.error("Name cannot be empty");
        return;
      }
      const { error } = await profileService.updateDisplayName(displayName);
      if (error) {
        toast.error(error.message || "Failed to update profile");
        return;
      }
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update profile");
    }
  };

  const handleDeleteAccount = () => {
    toast.error("Account deletion requested. Please contact support.");
  };

  const handleExportData = () => {
    toast.success("Data export started. You'll receive an email when ready.");
  };

  // const handleImportData = () => {
  //   toast.success("Data import feature coming soon!");
  // };

  const handleChangePhoto = () => {
    toast.success("Photo upload feature coming soon!");
  };

  const handleAppearanceChange = (setting: string, value: any) => {
    setAppearance(prev => ({ ...prev, [setting]: value }));
    if (setting === 'theme') {
      toast.success(`Theme changed to ${value}`);
    } else if (setting === 'compactView') {
      toast.success(`Compact view ${value ? 'enabled' : 'disabled'}`);
    } else {
      toast.success("Appearance setting updated!");
    }
  };

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
              <h1 className="text-xl font-semibold">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>
          
          <Button onClick={onLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="mb-6">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="w-4 h-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="data">
              <Download className="w-4 h-4 mr-2" />
              Data
            </TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Profile Information</CardTitle>
                  <Button
                    variant={isEditing ? "outline" : "ghost"}
                    size="sm"
                    onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  {loadingProfile ? (
                    <div className="h-20 w-full animate-pulse rounded-md bg-muted" />
                  ) : (
                    <>
                      <Avatar className="w-20 h-20">
                        <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                          {profile.name ? profile.name.split(' ').map(n => n[0]).join('') : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <h3 className="font-medium">{profile.name || 'User'}</h3>
                        <Button variant="outline" size="sm" disabled={!isEditing} onClick={handleChangePhoto}>
                          <Camera className="w-4 h-4 mr-2" />
                          Change Photo
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {profileError && (
                  <>
                    <Separator />
                    <div className="text-sm text-red-600">
                      {profileError}
                    </div>
                  </>
                )}

                <Separator />

                {/* Profile Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditing || loadingProfile}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      disabled
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select
                      value={profile.defaultCurrency}
                      onValueChange={(value) => setProfile(prev => ({ ...prev, defaultCurrency: value }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                        <SelectItem value="USD">US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                        <SelectItem value="GBP">British Pound (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={profile.language}
                      onValueChange={(value) => setProfile(prev => ({ ...prev, language: value }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Hindi">हिंदी</SelectItem>
                        <SelectItem value="Spanish">Español</SelectItem>
                        <SelectItem value="French">Français</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveProfile}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email delivery via SMTP */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Delivery (SMTP)</p>
                      <p className="text-sm text-muted-foreground">Configure SMTP to send invitations and updates.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        console.log("SMTP Configure button clicked, opening modal...");
                        setSmtpOpen(true);
                      }}
                    >
                      Configure SMTP
                    </Button>
                  </div>
                </div>

                {/* General Notifications */}
                <div>
                  <h3 className="font-medium mb-4">General Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Push Notifications</p>
                        <p className="text-sm text-muted-foreground">Receive notifications on your device</p>
                      </div>
                      <Switch
                        checked={notifications.pushEnabled}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushEnabled: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Switch
                        checked={notifications.emailEnabled}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailEnabled: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                      </div>
                      <Switch
                        checked={notifications.smsEnabled}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, smsEnabled: checked }))}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Specific Notifications */}
                <div>
                  <h3 className="font-medium mb-4">Activity Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">New Expenses</p>
                        <p className="text-sm text-muted-foreground">When someone adds a new expense</p>
                      </div>
                      <Switch
                        checked={notifications.expenseAdded}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, expenseAdded: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Payment Received</p>
                        <p className="text-sm text-muted-foreground">When someone pays you</p>
                      </div>
                      <Switch
                        checked={notifications.paymentReceived}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, paymentReceived: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Payment Reminders</p>
                        <p className="text-sm text-muted-foreground">Reminders for pending payments</p>
                      </div>
                      <Switch
                        checked={notifications.paymentReminders}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, paymentReminders: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Group Invitations</p>
                        <p className="text-sm text-muted-foreground">When someone invites you to a group</p>
                      </div>
                      <Switch
                        checked={notifications.groupInvitations}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, groupInvitations: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Weekly Digest</p>
                        <p className="text-sm text-muted-foreground">Summary of your weekly activity</p>
                      </div>
                      <Switch
                        checked={notifications.weeklyDigest}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, weeklyDigest: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Profile Visibility</Label>
                    <Select 
                      value={privacy.profileVisibility} 
                      onValueChange={(value) => setPrivacy(prev => ({ ...prev, profileVisibility: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="friends">Friends Only</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Activity Status</p>
                      <p className="text-sm text-muted-foreground">Let others see when you were last active</p>
                    </div>
                    <Switch
                      checked={privacy.showActivity}
                      onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, showActivity: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Allow Group Invitations</p>
                      <p className="text-sm text-muted-foreground">Let others invite you to groups</p>
                    </div>
                    <Switch
                      checked={privacy.allowInvitations}
                      onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, allowInvitations: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Share Analytics</p>
                      <p className="text-sm text-muted-foreground">Help improve ChaiPaani with usage data</p>
                    </div>
                    <Switch
                      checked={privacy.shareAnalytics}
                      onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, shareAnalytics: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select 
                      value={appearance.theme} 
                      onValueChange={(value) => handleAppearanceChange('theme', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <Select 
                      value={appearance.accentColor} 
                      onValueChange={(value) => setAppearance(prev => ({ ...prev, accentColor: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default (Blue)</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="purple">Purple</SelectItem>
                        <SelectItem value="orange">Orange</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Compact View</p>
                      <p className="text-sm text-muted-foreground">Show more information in less space</p>
                    </div>
                    <Switch
                      checked={appearance.compactView}
                      onCheckedChange={(checked) => setAppearance(prev => ({ ...prev, compactView: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Avatars</p>
                      <p className="text-sm text-muted-foreground">Display user avatars throughout the app</p>
                    </div>
                    <Switch
                      checked={appearance.showAvatars}
                      onCheckedChange={(checked) => setAppearance(prev => ({ ...prev, showAvatars: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Export Data</p>
                      <p className="text-sm text-muted-foreground">Download all your ChaiPaani data</p>
                    </div>
                    <Button onClick={handleExportData} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Import Data</p>
                      <p className="text-sm text-muted-foreground">Import data from other expense tracking apps</p>
                    </div>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="font-medium text-destructive">Danger Zone</h3>
                  
                  <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <SmtpSettingsModal open={smtpOpen} onOpenChange={setSmtpOpen} />
    </div>
  );
}
