// FilterBar.jsx – Combined version

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarIcon, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export const FilterBar = ({
  symbol,
  onSymbolChange,
  dateRange,
  onDateRangeChange,
  outcome,
  onOutcomeChange,
  availableSymbols = [],
}) => {
  const [inputValue, setInputValue] = useState(symbol || '');
  const inputRef = useRef(null);

  // Sync input with external symbol change
  useEffect(() => {
    setInputValue(symbol || '');
  }, [symbol]);

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    setInputValue(value);
    onSymbolChange(value);
  };

  const handleSelectChange = (value) => {
    setInputValue(value || '');
    onSymbolChange(value || '');
  };

  const handleClearSymbol = () => {
    setInputValue('');
    onSymbolChange('');
    inputRef.current?.focus();
  };

  const symbolOptions = Array.isArray(availableSymbols)
    ? availableSymbols.map(item => typeof item === 'string' ? item : item.symbol)
    : [];

  // Helper to get outcome badge styles
  const getOutcomeStyles = (value) => {
    switch (value) {
      case 'correct':
        return { icon: CheckCircle, className: 'text-green-400', label: 'Correct' };
      case 'incorrect':
        return { icon: XCircle, className: 'text-red-400', label: 'Incorrect' };
      case 'pending':
        return { icon: Clock, className: 'text-gray-400', label: 'Pending' };
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Symbol Input + Clear */}
      <div className="relative flex items-center">
        <Input
          ref={inputRef}
          placeholder="Symbol"
          value={inputValue}
          onChange={handleInputChange}
          className="w-32 pr-8 min-h-[44px] bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500"
        />
        {symbol && (
          <button
            onClick={handleClearSymbol}
            className="absolute right-2 text-gray-500 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Clear symbol"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick Select */}
      <Select value={symbol || ''} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-40 min-h-[44px] bg-gray-900 border-gray-800 text-white focus:ring-gray-500">
          <SelectValue placeholder="Quick Select" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-800 text-white">
          <SelectItem 
            value="" 
            className="focus:bg-gray-800 focus:text-white text-gray-400 hover:text-white min-h-[44px]"
          >
            Clear
          </SelectItem>
          {symbolOptions.slice(0, 10).map((sym) => (
            <SelectItem 
              key={sym} 
              value={sym}
              className="focus:bg-gray-800 focus:text-white text-gray-400 hover:text-white min-h-[44px]"
            >
              {sym}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Outcome Select */}
      <Select value={outcome || 'all'} onValueChange={onOutcomeChange}>
        <SelectTrigger className="w-40 min-h-[44px] bg-gray-900 border-gray-800 text-white focus:ring-gray-500">
          <SelectValue placeholder="Outcome" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-800 text-white">
          <SelectItem 
            value="all" 
            className="focus:bg-gray-800 focus:text-white text-gray-400 hover:text-white min-h-[44px]"
          >
            All
          </SelectItem>
          <SelectItem 
            value="correct" 
            className="focus:bg-gray-800 focus:text-white text-gray-400 hover:text-white min-h-[44px] flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4 text-green-400" />
            Correct
          </SelectItem>
          <SelectItem 
            value="incorrect" 
            className="focus:bg-gray-800 focus:text-white text-gray-400 hover:text-white min-h-[44px] flex items-center gap-2"
          >
            <XCircle className="h-4 w-4 text-red-400" />
            Incorrect
          </SelectItem>
          <SelectItem 
            value="pending" 
            className="focus:bg-gray-800 focus:text-white text-gray-400 hover:text-white min-h-[44px] flex items-center gap-2"
          >
            <Clock className="h-4 w-4 text-gray-400" />
            Pending
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-48 justify-start text-left font-normal min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:ring-gray-500',
              !dateRange?.from && 'text-gray-500'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                </>
              ) : (
                format(dateRange.from, 'MMM d, yyyy')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-gray-900 border-gray-800 text-white" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
            className="bg-gray-900 border-none"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};