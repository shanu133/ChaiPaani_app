import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Switch } from "./ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { Slider } from "./ui/slider";
import { 
  Plus, 
  Users, 
  Receipt, 
  PieChart, 
  Settings, 
  Bell, 
  Search, 
  Filter,
  Edit3,
  Trash2,
  Eye,
  Download,
  Share2,
  ChevronRight,
  ChevronDown,
  Coffee,
  Droplets
} from "lucide-react";

export function DesignSystemShowcase() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Coffee className="w-8 h-8 text-primary" />
              <Droplets className="w-8 h-8 text-secondary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">ChaiPaani Design System</h1>
              <p className="text-muted-foreground">A friendly expense-splitting experience</p>
            </div>
          </div>
          
          {/* Brand Colors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className="w-12 h-12 rounded-lg bg-[#D87F49]"></div>
              <div>
                <h3 className="font-medium">Chai (Primary)</h3>
                <p className="text-sm text-muted-foreground">#D87F49</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className="w-12 h-12 rounded-lg bg-[#46908E]"></div>
              <div>
                <h3 className="font-medium">Paani (Secondary)</h3>
                <p className="text-sm text-muted-foreground">#46908E</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className="w-12 h-12 rounded-lg bg-[#F5F5F5] border"></div>
              <div>
                <h3 className="font-medium">Background</h3>
                <p className="text-sm text-muted-foreground">#F5F5F5</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        
        {/* Typography */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Typography</h2>
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h1 className="mb-2">Heading 1 - Welcome to ChaiPaani</h1>
                <p className="text-sm text-muted-foreground">Inter, 24px, Medium (500)</p>
              </div>
              <div>
                <h2 className="mb-2">Heading 2 - Your Expenses</h2>
                <p className="text-sm text-muted-foreground">Inter, 20px, Medium (500)</p>
              </div>
              <div>
                <h3 className="mb-2">Heading 3 - Recent Activity</h3>
                <p className="text-sm text-muted-foreground">Inter, 18px, Medium (500)</p>
              </div>
              <div>
                <h4 className="mb-2">Heading 4 - Trip to Goa</h4>
                <p className="text-sm text-muted-foreground">Inter, 16px, Medium (500)</p>
              </div>
              <div>
                <p className="mb-2">Body text - Split your expenses effortlessly with friends and family. Track who owes what and settle up with ease.</p>
                <p className="text-sm text-muted-foreground">Inter, 16px, Regular (400)</p>
              </div>
              <div>
                <p className="text-sm mb-2">Small text - Last updated 2 minutes ago</p>
                <p className="text-sm text-muted-foreground">Inter, 14px, Regular (400)</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Primary Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Primary Buttons</CardTitle>
                <CardDescription>Main actions, warm chai color</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
                <Button size="sm" className="w-full">Small Primary</Button>
                <Button size="lg" className="w-full">Large Primary</Button>
                <Button disabled className="w-full">Disabled</Button>
              </CardContent>
            </Card>

            {/* Secondary Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Secondary Buttons</CardTitle>
                <CardDescription>Supporting actions, calm paani color</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="secondary" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  View Group
                </Button>
                <Button variant="secondary" size="sm" className="w-full">Small Secondary</Button>
                <Button variant="secondary" size="lg" className="w-full">Large Secondary</Button>
                <Button variant="secondary" disabled className="w-full">Disabled</Button>
              </CardContent>
            </Card>

            {/* Tertiary Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Tertiary Buttons</CardTitle>
                <CardDescription>Subtle actions, minimal styling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="ghost" className="w-full">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
                <Button variant="outline" className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="link" className="w-full">View More</Button>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Form Elements */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Form Elements</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <Card>
              <CardHeader>
                <CardTitle>Input Fields</CardTitle>
                <CardDescription>Clean, accessible form inputs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-name">Expense Name</Label>
                  <Input id="expense-name" placeholder="e.g., Dinner at Restaurant" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input id="amount" type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Add details about this expense..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">🍽️ Food & Dining</SelectItem>
                      <SelectItem value="transport">🚗 Transportation</SelectItem>
                      <SelectItem value="entertainment">🎬 Entertainment</SelectItem>
                      <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                      <SelectItem value="utilities">⚡ Utilities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
                <CardDescription>Checkboxes, radios, and switches</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Split equally among:</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="person1" defaultChecked />
                      <Label htmlFor="person1">You</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="person2" defaultChecked />
                      <Label htmlFor="person2">Alice</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="person3" />
                      <Label htmlFor="person3">Bob</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Payment method:</Label>
                  <RadioGroup defaultValue="cash">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash">Cash</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card">Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="upi" id="upi" />
                      <Label htmlFor="upi">UPI</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications">Send notifications</Label>
                  <Switch id="notifications" defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Icons & Components */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Icons & Components</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <Card>
              <CardHeader>
                <CardTitle>Iconography</CardTitle>
                <CardDescription>Simple, outlined icons from Lucide</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-4">
                  {[Plus, Users, Receipt, PieChart, Settings, Bell, Search, Filter, Edit3, Trash2, Eye, Download].map((Icon, index) => (
                    <div key={index} className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
                      <Icon className="w-6 h-6 text-foreground" />
                      <span className="text-xs text-muted-foreground">{Icon.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>UI Components</CardTitle>
                <CardDescription>Badges, avatars, and feedback</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Badges</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Settled</Badge>
                    <Badge variant="destructive">Overdue</Badge>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Avatars</Label>
                  <div className="flex gap-2">
                    <Avatar>
                      <AvatarFallback>YU</AvatarFallback>
                    </Avatar>
                    <Avatar>
                      <AvatarFallback>AL</AvatarFallback>
                    </Avatar>
                    <Avatar>
                      <AvatarFallback>BO</AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Progress</Label>
                  <Progress value={65} className="w-full" />
                </div>

                <div className="space-y-2">
                  <Label>Slider</Label>
                  <Slider defaultValue={[50]} max={100} step={1} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Sample UI Cards */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Sample Interface</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">Recent Expenses</CardTitle>
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Lunch at Cafe</p>
                      <p className="text-sm text-muted-foreground">Split between 3 people</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹450</p>
                    <p className="text-sm text-muted-foreground">₹150 each</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium">Movie Tickets</p>
                      <p className="text-sm text-muted-foreground">Entertainment</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹800</p>
                    <Badge variant="secondary">Settled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Group Summary</CardTitle>
                <CardDescription>Trip to Goa - 4 people</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Expenses</span>
                  <span className="text-xl font-semibold">₹12,450</span>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">YU</AvatarFallback>
                      </Avatar>
                      <span>You</span>
                    </div>
                    <span className="text-primary">+₹250</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">AL</AvatarFallback>
                      </Avatar>
                      <span>Alice</span>
                    </div>
                    <span className="text-destructive">-₹120</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">BO</AvatarFallback>
                      </Avatar>
                      <span>Bob</span>
                    </div>
                    <span className="text-destructive">-₹130</span>
                  </div>
                </div>
                <Button className="w-full mt-4">
                  <Share2 className="w-4 h-4 mr-2" />
                  Settle Up
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Design Principles */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Design Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Coffee className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Warm & Welcoming</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Like sharing chai with friends, our interface feels approachable and friendly, reducing anxiety around money conversations.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                  <Droplets className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle>Clear & Calm</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Like refreshing paani, our design brings clarity to complex financial relationships with clean, uncluttered layouts.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-foreground" />
                </div>
                <CardTitle>Inclusive & Accessible</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Designed for everyone to use comfortably, with clear contrast, readable fonts, and intuitive interactions.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}