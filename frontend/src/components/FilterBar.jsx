// FilterBar.jsx – Combined version

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarIcon, X } from 'lucide-react';
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

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* ✅ Combined Symbol Input + Select */}
      <div className="relative flex items-center">
        <Input
          ref={inputRef}
          placeholder="Symbol"
          value={inputValue}
          onChange={handleInputChange}
          className="w-32 pr-8"
        />
        {symbol && (
          <button
            onClick={handleClearSymbol}
            className="absolute right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label="Clear symbol"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Select value={symbol || ''} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Quick Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Clear</SelectItem>
          {symbolOptions.slice(0, 10).map((sym) => (
            <SelectItem key={sym} value={sym}>
              {sym}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* ✅ Outcome Select */}
      <Select value={outcome || 'all'} onValueChange={onOutcomeChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Outcome" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="correct">✅ Correct</SelectItem>
          <SelectItem value="incorrect">❌ Incorrect</SelectItem>
          <SelectItem value="pending">⏳ Pending</SelectItem>
        </SelectContent>
      </Select>

      {/* ✅ Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-48 justify-start text-left font-normal',
              !dateRange?.from && 'text-muted-foreground'
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
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};