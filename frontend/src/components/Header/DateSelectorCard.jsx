import React from "react";
import PropTypes from "prop-types";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formatDateRange = (range) => {
  if (!range?.from) return "Select date";
  return range.to
    ? `${format(range.from, "MMM dd, yyy")} - ${format(range.to, "MMM dd, yyy")}`
    : format(range.from, "MMM dd, yyy");
};

const DateSelectorCard = ({ dateRange, setDateRange, mode, className }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("w-full md:w-auto", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "flex items-center gap-2 w-full md:w-auto justify-between",
              "hover:bg-gray-50 dark:hover:bg-gray-800",
              "transition-colors duration-200"
            )}
            aria-label="Select date range"
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" aria-hidden="true" />
              <span>{formatDateRange(dateRange)}</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 bg-white dark:bg-gray-800 backdrop-blur-sm"
          align="end"
          onInteractOutside={(e) => {
            // Prevent closing when selecting dates
            if (e.target.closest('.rdp')) {
              e.preventDefault();
            }
          }}
        >
          <Calendar
            mode={mode}
            selected={dateRange}
            onSelect={(selected) => {
              setDateRange(selected);
              if (mode === "single") setIsOpen(false);
            }}
            numberOfMonths={1}
            className="border-0"
            classNames={{
              day_selected: "bg-blue-600 dark:bg-blue-700 text-white",
              day_today: "border border-blue-500 dark:border-blue-400",
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

DateSelectorCard.propTypes = {
  dateRange: PropTypes.shape({
    from: PropTypes.instanceOf(Date),
    to: PropTypes.instanceOf(Date),
  }),
  setDateRange: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(["single", "range"]),
  className: PropTypes.string,
};

DateSelectorCard.defaultProps = {
  dateRange: { from: new Date(), to: null },
  mode: "single",
  className: "",
};

export default DateSelectorCard;