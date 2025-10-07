import { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { IndianRupee, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { expenseService, authService } from "../lib/supabase-service";

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: {
    id: string;
    name: string;
    members: Array<{
      id: string;
      name: string;
      avatar: string;
    }>;
  };
  onSettleUp: (settlementData: any) => void;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export function SettleUpModal({ isOpen, onClose, group, onSettleUp }: SettleUpModalProps) {
  const [selectedPayer, setSelectedPayer] = useState("");
  const [selectedReceiver, setSelectedReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [memberBalances, setMemberBalances] = useState<Record<string, number>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Stable callbacks for effects
  const fetchCurrentUser = useCallback(async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  }, []);

  const fetchMemberBalances = useCallback(async () => {
    if (!group?.id) return;

  // Optionally show a loading indicator for balances here if desired
    try {
      console.log(`Fetching balances for group ${group.id}`);
      const { data, error } = await expenseService.getUserBalance(group.id);
      if (error) {
        console.error("Error fetching balances:", error);
        toast.error("Failed to load balances");
        return;
      }

      if (data) {
        // Transform balance data into memberBalances format
        const balances: Record<string, number> = {};
        data.forEach((balance: any) => {
          balances[balance.user_id] = balance.net_balance || 0;
        });
        setMemberBalances(balances);
        console.log("Loaded member balances:", balances);
      }
    } catch (error) {
      console.error("Error fetching member balances:", error);
      toast.error("Failed to load balances");
    } finally {
      // Done loading balances
    }
  }, [group?.id]);

  // Fetch current user and balances when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCurrentUser();
      fetchMemberBalances();
    }
  }, [isOpen, fetchCurrentUser, fetchMemberBalances]);

  const getCurrentUserBalance = () => {
    return currentUser ? memberBalances[currentUser.id] || 0 : 0;
  };
  
  const getOptimalSettlements = () => {
    // Simplified settlement calculation
    const settlements: Settlement[] = [];
    
    if (!group) return settlements;

    // For demo purposes, calculate some optimal settlements
    const debtors = group.members.filter(member => (memberBalances[member.id] || 0) > 0);
    const creditors = group.members.filter(member => (memberBalances[member.id] || 0) < 0);

    debtors.forEach(debtor => {
      const debtAmount = memberBalances[debtor.id] || 0;
      creditors.forEach(creditor => {
        const creditAmount = Math.abs(memberBalances[creditor.id] || 0);
        if (debtAmount > 0 && creditAmount > 0) {
          const settleAmount = Math.min(debtAmount, creditAmount);
          if (settleAmount >= 10) { // Only suggest settlements >= ₹10
            settlements.push({
              from: debtor.id,
              to: creditor.id,
              amount: settleAmount
            });
          }
        }
      });
    });

    return settlements.slice(0, 3); // Show top 3 suggestions
  };

  const getMemberName = (memberId: string) => {
    if (memberId === "user1") return "You";
    return group?.members.find(m => m.id === memberId)?.name || "Unknown";
  };

  const getMemberAvatar = (memberId: string) => {
    if (memberId === "user1") return "YU";
    return group?.members.find(m => m.id === memberId)?.avatar || "??";
  };

  const handleQuickSettle = (settlement: Settlement) => {
    setSelectedPayer(settlement.from);
    setSelectedReceiver(settlement.to);
    setAmount(settlement.amount.toString());
  };

  const handleSettleUp = async () => {
    console.log("handleSettleUp called with:", {
      selectedPayer,
      selectedReceiver,
      amount,
      groupId: group?.id
    });

    if (!selectedPayer || !selectedReceiver) {
      toast.error("Please select both payer and receiver");
      return;
    }

    if (selectedPayer === selectedReceiver) {
      toast.error("Payer and receiver cannot be the same person");
      return;
    }

    const settlementAmount = parseFloat(amount);
    if (!settlementAmount || settlementAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (settlementAmount > 10000) {
      toast.error("Settlement amount cannot exceed ₹10,000");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Recording real settlement:", {
        from: selectedPayer,
        to: selectedReceiver,
        amount: settlementAmount,
        groupId: group?.id
      });

      const { data, error } = await expenseService.settleUp(
        selectedPayer,
        selectedReceiver,
        settlementAmount,
        group?.id || ""
      );

      if (error) {
        console.error("Error recording settlement:", error);
        toast.error(error.message || "Failed to record settlement");
        return;
      }

      console.log("Settlement recorded successfully:", data);

      const settlementData = {
        id: Date.now().toString(),
        groupId: group?.id,
        groupName: group?.name,
        from: selectedPayer,
        to: selectedReceiver,
        amount: settlementAmount,
        timestamp: new Date().toISOString(),
        status: 'completed',
        settledSplits: data?.settled_splits || []
      };

      onSettleUp(settlementData);

      // Refresh balances after settlement
      if (group?.id) {
        await fetchMemberBalances();
      }
      const payerName = getMemberName(selectedPayer);
      const receiverName = getMemberName(selectedReceiver);

      toast.success(`Settlement of ₹${settlementAmount} from ${payerName} to ${receiverName} recorded successfully!`);

      // Reset form
      setSelectedPayer("");
      setSelectedReceiver("");
      setAmount("");
      onClose();
    } catch (error) {
      console.error("Error in handleSettleUp:", error);
      toast.error("Failed to record settlement. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedPayer("");
      setSelectedReceiver("");
      setAmount("");
      onClose();
    }
  };

  const availableMembers = group?.members || [];
  const optimalSettlements = getOptimalSettlements();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-primary" />
            Settle Up{group ? ` - ${group.name}` : ''}
          </DialogTitle>
          <DialogDescription>
            Record a settlement between group members to balance expenses and payments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Current Balance */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your current balance</span>
              <div className="flex items-center gap-1">
                <span className={`font-semibold ${
                  getCurrentUserBalance() > 0 ? 'text-destructive' : 
                  getCurrentUserBalance() < 0 ? 'text-primary' : 
                  'text-muted-foreground'
                }`}>
                  {getCurrentUserBalance() > 0 ? '+' : ''}₹{getCurrentUserBalance()}
                </span>
                {getCurrentUserBalance() === 0 && (
                  <Badge variant="secondary" className="ml-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Settled
                  </Badge>
                )}
              </div>
            </div>
            {getCurrentUserBalance() !== 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {getCurrentUserBalance() > 0 
                  ? "You owe money to the group" 
                  : "You are owed money by the group"
                }
              </p>
            )}
          </div>

          {/* Quick Settlement Suggestions */}
          {optimalSettlements.length > 0 && (
            <div className="space-y-3">
              <Label>Suggested Settlements</Label>
              <div className="space-y-2">
                {optimalSettlements.map((settlement, index) => (
                  <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {getMemberAvatar(settlement.from)}
                          </AvatarFallback>
                        </Avatar>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {getMemberAvatar(settlement.to)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {getMemberName(settlement.from)} → {getMemberName(settlement.to)}
                          </p>
                          <p className="text-primary font-semibold">₹{settlement.amount}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleQuickSettle(settlement)}
                        disabled={isLoading}
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* Manual Settlement */}
          <div className="space-y-4">
            <Label>Record Settlement</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="payer">Payer</Label>
                <Select value={selectedPayer} onValueChange={setSelectedPayer} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Who is paying?" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">{member.avatar}</AvatarFallback>
                          </Avatar>
                          {member.id === "user1" ? "You" : member.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiver">Receiver</Label>
                <Select value={selectedReceiver} onValueChange={setSelectedReceiver} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Who receives?" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">{member.avatar}</AvatarFallback>
                          </Avatar>
                          {member.id === "user1" ? "You" : member.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
                min="0"
                max="10000"
                step="0.01"
              />
            </div>
          </div>

          {/* Preview */}
          {selectedPayer && selectedReceiver && amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {getMemberAvatar(selectedPayer)}
                  </AvatarFallback>
                </Avatar>
                <ArrowRight className="w-4 h-4 text-primary" />
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {getMemberAvatar(selectedReceiver)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {getMemberName(selectedPayer)} pays {getMemberName(selectedReceiver)}
                  </p>
                  <p className="text-primary font-semibold">₹{parseFloat(amount).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={isLoading}
              className="sm:flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSettleUp} 
              disabled={isLoading || !selectedPayer || !selectedReceiver || !amount || parseFloat(amount) <= 0}
              className="sm:flex-1"
            >
              {isLoading ? "Recording..." : "Record Settlement"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
