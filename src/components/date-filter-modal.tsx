import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import * as Sonner from 'sonner';
import { ArrowRight, Calendar as CalendarIcon, Filter } from 'lucide-react';

interface DateFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: { startDate: string | null; endDate: string | null; preset: string }) => void;
  selectedPreset?: string;
  selectedStartDate?: string | null;
  selectedEndDate?: string | null;
}

export const DateFilterModal: React.FC<DateFilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  selectedPreset = 'custom',
  selectedStartDate = null,
  selectedEndDate = null,
}) => {
  const [preset, setPreset] = useState(selectedPreset);
  const [startDate, setStartDate] = useState(selectedStartDate);
  const [endDate, setEndDate] = useState(selectedEndDate);

  // Safe toast wrapper
  const notify = {
    success: (msg: string) => (Sonner as any)?.toast?.success ? (Sonner as any).toast.success(msg) : (Sonner as any)?.toast ? (Sonner as any).toast(msg) : console.info(msg),
    error: (msg: string) => (Sonner as any)?.toast?.error ? (Sonner as any).toast.error(msg) : (Sonner as any)?.toast ? (Sonner as any).toast(msg) : console.error(msg),
    info: (msg: string) => (Sonner as any)?.toast?.info ? (Sonner as any).toast.info(msg) : (Sonner as any)?.toast ? (Sonner as any).toast(msg) : console.info(msg),
  };

  React.useEffect(() => {
    setPreset(selectedPreset);
    setStartDate(selectedStartDate);
    setEndDate(selectedEndDate);
  }, [selectedPreset, selectedStartDate, selectedEndDate]);

  // Handle preset selection and automatic date range calculation
  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset);
    const today = new Date();
    const start = new Date();
    switch (newPreset) {
      case 'today': {
        const d = today.toISOString().split('T')[0];
        setStartDate(d);
        setEndDate(d);
        break;
      }
      case 'yesterday': {
        start.setDate(today.getDate() - 1);
        const d = start.toISOString().split('T')[0];
        setStartDate(d);
        setEndDate(d);
        break;
      }
      case 'thisWeek': {
        const currentDay = today.getDay() || 7; // Convert Sunday (0) to 7
        const monday = new Date(today);
        monday.setDate(today.getDate() - (currentDay - 1));
        setStartDate(monday.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      }
      case 'lastWeek': {
        const currentDay = today.getDay() || 7;
        const lastWeekMonday = new Date(today);
        lastWeekMonday.setDate(today.getDate() - 7 - (currentDay - 1));
        const lastWeekSunday = new Date(lastWeekMonday);
        lastWeekSunday.setDate(lastWeekMonday.getDate() + 6);
        setStartDate(lastWeekMonday.toISOString().split('T')[0]);
        setEndDate(lastWeekSunday.toISOString().split('T')[0]);
        break;
      }
      case 'thisMonth': {
        start.setDate(1);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      }
      case 'lastMonth': {
        start.setMonth(today.getMonth() - 1);
        start.setDate(1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(lastDayOfLastMonth.toISOString().split('T')[0]);
        break;
      }
      case 'thisYear': {
        start.setMonth(0);
        start.setDate(1);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      }
      case 'custom':
      default: {
        // Leave dates as-is for custom
        break;
      }
    }
  };

  const handleApply = () => {
    // Validate dates if preset is custom
    if (preset === 'custom') {
      if (!startDate || !endDate) {
        notify.error('Please select both start and end dates for custom range');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        notify.error('Start date cannot be after end date');
        return;
      }
    }
    try {
      onApply({ startDate, endDate, preset });
      notify.success('Date filter applied');
      onClose();
    } catch (error) {
      notify.error('Failed to apply date filter');
    }
  };

  const handleReset = () => {
    setPreset('custom');
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter by Date
          </DialogTitle>
          <DialogDescription>
            Select a date range to filter expenses and transactions
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Preset Selector */}
          <div className="space-y-2">
            <Label htmlFor="date-preset">Quick Presets</Label>
            <Select value={preset} onValueChange={handlePresetChange}>
              <SelectTrigger id="date-preset">
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="lastWeek">Last Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Custom Date Range */}
          {preset === 'custom' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate || ''}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate || ''}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              
              {/* Date Range Preview */}
              {startDate && endDate && (
                <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                  <span className="text-sm">Selected Range:</span>
                  <Badge variant="outline">
                    {new Date(startDate).toLocaleDateString()} 
                    <ArrowRight className="inline h-3 w-3 mx-1" />
                    {new Date(endDate).toLocaleDateString()}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="default" onClick={handleApply} className="ml-auto">
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
