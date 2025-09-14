import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { 
  X, 
  IndianRupee, 
  Receipt, 
  Upload,
  Users,
  Calculator,
  Camera
} from "lucide-react";

interface GroupMember {
  id: string;
  name: string;
  avatar: string;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupMembers: GroupMember[];
  currentUser: GroupMember;
}

export function AddExpenseModal({ isOpen, onClose, groupMembers, currentUser }: AddExpenseModalProps) {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "",
    notes: "",
    payerId: currentUser.id,
    splitMethod: "equally" as "equally" | "custom",
    selectedMembers: new Set([currentUser.id]),
    customAmounts: {} as Record<string, string>
  });

  const categories = [
    { value: "food", label: "🍽️ Food & Dining", color: "bg-orange-100 text-orange-800" },
    { value: "transport", label: "🚗 Transportation", color: "bg-blue-100 text-blue-800" },
    { value: "entertainment", label: "🎬 Entertainment", color: "bg-purple-100 text-purple-800" },
    { value: "shopping", label: "🛍️ Shopping", color: "bg-pink-100 text-pink-800" },
    { value: "utilities", label: "⚡ Utilities", color: "bg-green-100 text-green-800" },
    { value: "travel", label: "✈️ Travel", color: "bg-cyan-100 text-cyan-800" },
    { value: "other", label: "📦 Other", color: "bg-gray-100 text-gray-800" }
  ];

  const handleMemberToggle = (memberId: string) => {
    const newSelected = new Set(formData.selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setFormData({ ...formData, selectedMembers: newSelected });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.description.trim() || !formData.amount || formData.selectedMembers.size === 0) {
      return;
    }

    // Calculate splits
    const totalAmount = parseFloat(formData.amount);
    const selectedMembersList = Array.from(formData.selectedMembers);
    
    let splits: Record<string, number> = {};
    
    if (formData.splitMethod === "equally") {
      const splitAmount = totalAmount / selectedMembersList.length;
      selectedMembersList.forEach(memberId => {
        splits[memberId] = splitAmount;
      });
    } else {
      // Custom amounts logic would go here
      splits = Object.fromEntries(
        selectedMembersList.map(memberId => [
          memberId, 
          parseFloat(formData.customAmounts[memberId] || "0")
        ])
      );
    }

    // Create expense object
    const expense = {
      description: formData.description,
      amount: totalAmount,
      category: formData.category,
      notes: formData.notes,
      payerId: formData.payerId,
      splits,
      createdAt: new Date().toISOString()
    };

    console.log("Creating expense:", expense);
    
    // Reset form and close
    setFormData({
      description: "",
      amount: "",
      category: "",
      notes: "",
      payerId: currentUser.id,
      splitMethod: "equally",
      selectedMembers: new Set([currentUser.id]),
      customAmounts: {}
    });
    
    onClose();
  };

  const selectedCategory = categories.find(cat => cat.value === formData.category);
  const splitAmount = formData.amount ? parseFloat(formData.amount) / formData.selectedMembers.size : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Add New Expense
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Split a bill with your group members
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[70vh] space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  placeholder="e.g., Dinner at Restaurant"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-10"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>
            </div>

            {/* Paid By */}
            <div className="space-y-3">
              <Label>Paid by</Label>
              <Select value={formData.payerId} onValueChange={(value) => setFormData({...formData, payerId: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groupMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">{member.avatar}</AvatarFallback>
                        </Avatar>
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Split Method */}
            <div className="space-y-3">
              <Label>Split method</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.splitMethod === "equally" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData({...formData, splitMethod: "equally"})}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Equally
                </Button>
                <Button
                  type="button"
                  variant={formData.splitMethod === "custom" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData({...formData, splitMethod: "custom"})}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Custom Amounts
                </Button>
              </div>
            </div>

            {/* Split Between */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Split between ({formData.selectedMembers.size} people)</Label>
                {formData.splitMethod === "equally" && formData.amount && (
                  <Badge variant="secondary">
                    ₹{splitAmount.toFixed(2)} each
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                {groupMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={formData.selectedMembers.has(member.id)}
                        onCheckedChange={() => handleMemberToggle(member.id)}
                      />
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{member.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </div>
                    
                    {formData.splitMethod === "equally" && formData.selectedMembers.has(member.id) && (
                      <span className="text-sm text-muted-foreground">
                        ₹{splitAmount.toFixed(2)}
                      </span>
                    )}
                    
                    {formData.splitMethod === "custom" && formData.selectedMembers.has(member.id) && (
                      <div className="w-24">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.customAmounts[member.id] || ""}
                          onChange={(e) => setFormData({
                            ...formData, 
                            customAmounts: {
                              ...formData.customAmounts,
                              [member.id]: e.target.value
                            }
                          })}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Receipt Upload */}
            <div className="space-y-3">
              <Label>Receipt (Optional)</Label>
              <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Add a receipt photo</p>
                    <p className="text-xs text-muted-foreground">Drag & drop or click to upload</p>
                  </div>
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </Button>
                </div>
              </div>
            </div>

            {/* Summary */}
            {formData.amount && formData.selectedMembers.size > 0 && (
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Amount:</span>
                  <span className="font-bold">₹{parseFloat(formData.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Split among:</span>
                  <span className="text-sm text-muted-foreground">{formData.selectedMembers.size} people</span>
                </div>
                {selectedCategory && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <Badge className={selectedCategory.color}>{selectedCategory.label}</Badge>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Expense
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}