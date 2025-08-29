import React, { useState } from 'react';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onDateRangeChange: (startDate: Date | null, endDate: Date | null) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onDateRangeChange,
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const quickRanges = [
    {
      label: 'Today',
      getValue: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return [today, tomorrow];
      },
    },
    {
      label: 'Last 7 days',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        return [start, end];
      },
    },
    {
      label: 'Last 30 days',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        return [start, end];
      },
    },
    {
      label: 'This month',
      getValue: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return [start, end];
      },
    },
  ];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateInRange = (date: Date) => {
    if (!startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  };

  const isDateSelected = (date: Date) => {
    if (startDate && date.toDateString() === startDate.toDateString()) return 'start';
    if (endDate && date.toDateString() === endDate.toDateString()) return 'end';
    return false;
  };

  const handleDateClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      onDateRangeChange(date, null);
    } else {
      // Complete selection
      if (date < startDate) {
        onDateRangeChange(date, startDate);
      } else {
        onDateRangeChange(startDate, date);
      }
      setIsOpen(false);
    }
  };

  const handleQuickRange = (getValue: () => Date[]) => {
    const [start, end] = getValue();
    onDateRangeChange(start, end);
    setIsOpen(false);
  };

  const clearSelection = () => {
    onDateRangeChange(null, null);
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      const isInRange = isDateInRange(date);
      const selected = isDateSelected(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(date)}
          className={cn(
            'h-8 w-8 text-sm rounded hover:bg-primary-100 transition-colors',
            isInRange && 'bg-primary-100 text-primary-800',
            selected === 'start' && 'bg-primary-600 text-white hover:bg-primary-700',
            selected === 'end' && 'bg-primary-600 text-white hover:bg-primary-700',
            isToday && !selected && 'font-bold text-primary-600',
            !isInRange && !selected && 'text-secondary-700 hover:text-secondary-900'
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 border border-secondary-300 rounded-md text-sm bg-white hover:bg-secondary-50 transition-colors"
      >
        <CalendarIcon className="h-4 w-4 text-secondary-400" />
        <span className="text-secondary-700">
          {startDate && endDate
            ? `${formatDate(startDate)} - ${formatDate(endDate)}`
            : startDate
            ? `${formatDate(startDate)} - Select end date`
            : 'Select date range'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg z-50 min-w-max">
          <div className="flex">
            {/* Quick ranges */}
            <div className="p-3 border-r border-secondary-200">
              <div className="text-sm font-medium text-secondary-900 mb-2">Quick ranges</div>
              <div className="space-y-1">
                {quickRanges.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => handleQuickRange(range.getValue)}
                    className="block w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-100 rounded transition-colors"
                  >
                    {range.label}
                  </button>
                ))}
                <button
                  onClick={clearSelection}
                  className="block w-full text-left px-3 py-2 text-sm text-secondary-500 hover:bg-secondary-100 rounded transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Calendar */}
            <div className="p-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}
                  className="p-1 hover:bg-secondary-100 rounded transition-colors"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <h3 className="text-sm font-medium">
                  {viewDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </h3>
                <button
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}
                  className="p-1 hover:bg-secondary-100 rounded transition-colors"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Days of week */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-secondary-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}