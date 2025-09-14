import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Calendar } from "./ui/calendar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { 
  Calendar as CalendarIcon, 
  X, 
  Check,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface DateFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (filter: DateFilter) => void;
  currentFilter?: DateFilter;
}

export interface DateFilter {
  type: 'all' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';
  startDate?: Date;
  endDate?: Date;
  label: string;
}

export function DateFilterModal({ isOpen, onClose, onApplyFilter, currentFilter }: DateFilterModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<DateFilter>(
    currentFilter || { type: 'all', label: 'All Time' }
  );
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const thisYearStart = new Date(today.getFullYear(), 0, 1);
  const thisYearEnd = new Date(today.getFullYear(), 11, 31);

  const predefinedFilters: DateFilter[] = [
    { type: 'all', label: 'All Time' },
    { type: 'today', label: 'Today', startDate: today, endDate: today },
    { type: 'yesterday', label: 'Yesterday', startDate: yesterday, endDate: yesterday },
    { type: 'this_week', label: 'This Week', startDate: thisWeekStart, endDate: thisWeekEnd },
    { type: 'last_week', label: 'Last Week', startDate: lastWeekStart, endDate: lastWeekEnd },
    { type: 'this_month', label: 'This Month', startDate: thisMonthStart, endDate: thisMonthEnd },
    { type: 'last_month', label: 'Last Month', startDate: lastMonthStart, endDate: lastMonthEnd },
    { type: 'this_year', label: 'This Year', startDate: thisYearStart, endDate: thisYearEnd },
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handlePredefinedFilter = (filter: DateFilter) => {
    setSelectedFilter(filter);
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setShowStartCalendar(false);
    setShowEndCalendar(false);
  };

  const handleCustomFilter = () => {
    if (!customStartDate) {
      toast.error("Please select a start date");
      return;
    }

    if (!customEndDate) {
      toast.error("Please select an end date");
      return;
    }

    if (customStartDate > customEndDate) {
      toast.error("Start date cannot be after end date");
      return;
    }

    const customFilter: DateFilter = {
      type: 'custom',
      label: `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`,
      startDate: customStartDate,
      endDate: customEndDate
    };

    setSelectedFilter(customFilter);
  };

  const handleApply = () => {
    if (selectedFilter.type === 'custom' && (!customStartDate || !customEndDate)) {
      toast.error("Please complete the custom date selection");
      return;
    }

    const filterToApply = selectedFilter.type === 'custom' 
      ? {
          ...selectedFilter,
          startDate: customStartDate,
          endDate: customEndDate,
          label: `${formatDate(customStartDate!)} - ${formatDate(customEndDate!)}`
        }
      : selectedFilter;

    onApplyFilter(filterToApply);
    toast.success(`Filter applied: ${filterToApply.label}`);
    onClose();
  };

  const handleClearFilter = () => {
    const allTimeFilter = { type: 'all' as const, label: 'All Time' };
    setSelectedFilter(allTimeFilter);
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    onApplyFilter(allTimeFilter);
    toast.success("Filter cleared");
    onClose();
  };

  const isFilterActive = (filter: DateFilter) => {
    return selectedFilter.type === filter.type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Filter by Date
          </DialogTitle>
          <DialogDescription>
            Filter expenses and activities by selecting a date range or using quick filters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Current Filter */}
          {currentFilter && currentFilter.type !== 'all' && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Filter</p>
                  <p className="font-medium">{currentFilter.label}</p>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
            </div>
          )}

          {/* Predefined Filters */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Quick Filters</h4>
            <div className="grid grid-cols-2 gap-2">
              {predefinedFilters.map((filter) => (
                <Button
                  key={filter.type}
                  variant={isFilterActive(filter) ? "default" : "outline"}
                  size="sm"
                  className="justify-start text-left h-auto py-3"
                  onClick={() => handlePredefinedFilter(filter)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {isFilterActive(filter) && <Check className="w-4 h-4" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{filter.label}</p>
                      {filter.startDate && filter.endDate && (
                        <p className="text-xs opacity-70 truncate">
                          {filter.startDate.toDateString() === filter.endDate.toDateString() 
                            ? formatDate(filter.startDate)
                            : `${formatDate(filter.startDate)} - ${formatDate(filter.endDate)}`
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom Date Range */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Custom Date Range</h4>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => {
                    setShowStartCalendar(!showStartCalendar);
                    setShowEndCalendar(false);
                  }}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {customStartDate ? formatDate(customStartDate) : "Select start date"}
                </Button>
                
                {showStartCalendar && (
                  <div className="border rounded-lg p-3 bg-background">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={(date) => {
                        setCustomStartDate(date);
                        setShowStartCalendar(false);
                        if (date && customEndDate) {
                          handleCustomFilter();
                        }
                      }}
                      disabled={(date) => date > today}
                      className="rounded-md"
                    />
                  </div>
                )}
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => {
                    setShowEndCalendar(!showEndCalendar);
                    setShowStartCalendar(false);
                  }}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {customEndDate ? formatDate(customEndDate) : "Select end date"}
                </Button>
                
                {showEndCalendar && (
                  <div className="border rounded-lg p-3 bg-background">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={(date) => {
                        setCustomEndDate(date);
                        setShowEndCalendar(false);
                        if (date && customStartDate) {
                          handleCustomFilter();
                        }
                      }}
                      disabled={(date) => date > today || (customStartDate && date < customStartDate)}
                      className="rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>

            {customStartDate && customEndDate && (
              <Button
                variant={selectedFilter.type === 'custom' ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={handleCustomFilter}
              >
                {selectedFilter.type === 'custom' && <Check className="w-4 h-4 mr-2" />}
                Apply Custom Range: {formatDate(customStartDate)} - {formatDate(customEndDate)}
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="sm:flex-1"
            >
              Cancel
            </Button>
            {(currentFilter && currentFilter.type !== 'all') && (
              <Button 
                variant="ghost" 
                onClick={handleClearFilter}
                className="sm:flex-1"
              >
                Clear Filter
              </Button>
            )}
            <Button 
              onClick={handleApply}
              disabled={selectedFilter.type === 'custom' && (!customStartDate || !customEndDate)}
              className="sm:flex-1"
            >
              Apply Filter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}