import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export const FilterBar = ({
  symbol,
  onSymbolChange,
  dateRange,
  onDateRangeChange,
  outcome,
  onOutcomeChange,
  availableSymbols,
}) => {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        placeholder="Symbol"
        value={symbol}
        onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
        className="w-32"
      />
      <Select value={symbol} onValueChange={onSymbolChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All Symbols" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Symbols</SelectItem>
          {availableSymbols.map((sym) => (
            <SelectItem key={sym} value={sym}>{sym}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={outcome} onValueChange={onOutcomeChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Outcome" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="correct">Correct</SelectItem>
          <SelectItem value="incorrect">Incorrect</SelectItem>
        </SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-48 justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                </>
              ) : (
                format(dateRange.from, 'LLL dd, y')
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