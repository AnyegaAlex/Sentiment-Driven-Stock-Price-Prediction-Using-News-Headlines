import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import PropTypes from 'prop-types';

const propTypes = {
  value: PropTypes.instanceOf(Date),
  onChange: PropTypes.func,
  dateFormat: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  minDate: PropTypes.instanceOf(Date),
  maxDate: PropTypes.instanceOf(Date),
};

const DateSelectorCard = ({
  value: controlledValue,
  onChange,
  dateFormat = 'PPP',
  placeholder = 'Pick a date',
  disabled = false,
  className = '',
  minDate = new Date('2020-01-01'),
  maxDate = new Date(),
}) => {
  const [internalDate, setInternalDate] = useState(controlledValue || new Date());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (controlledValue) {
      setInternalDate(controlledValue);
    }
  }, [controlledValue]);

  const date = controlledValue !== undefined ? controlledValue : internalDate;
  const hasDate = !!date;

  const handleSelect = (selectedDate) => {
    setInternalDate(selectedDate);
    setOpen(false);
    if (onChange) onChange(selectedDate);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setInternalDate(null);
    if (onChange) onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative inline-block">
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full sm:w-auto justify-start text-left font-normal',
              'min-h-[44px] px-3 py-2 pr-10',
              'border-gray-700 bg-gray-900 text-white hover:bg-gray-800 hover:text-white',
              !hasDate && 'text-gray-500',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
              className
            )}
            aria-label={hasDate ? `Selected date: ${format(date, dateFormat)}` : placeholder}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0 text-gray-400" />
            <span className="flex-1 truncate">
              {hasDate ? format(date, dateFormat) : placeholder}
            </span>
          </Button>
          {hasDate && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-gray-300 rounded-full hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Clear date"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-gray-900 border-gray-800 text-white" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          className="rounded-md border-0 bg-gray-900 text-white"
        />
      </PopoverContent>
    </Popover>
  );
};

DateSelectorCard.propTypes = propTypes;

export default React.memo(DateSelectorCard);