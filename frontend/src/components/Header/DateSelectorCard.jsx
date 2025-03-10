// src/components/Header/DateSelectorCard.jsx
import React from "react";
import PropTypes from "prop-types";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

const formatDateRange = (range) => {
  if (!range || !range.from) return "Pick a date";
  return range.to
    ? `${format(range.from, "LLL dd, yyyy")} - ${format(range.to, "LLL dd, yyyy")}`
    : format(range.from, "LLL dd, yyyy");
};

const DateSelectorCard = ({ dateRange, setDateRange, mode }) => {
  return (
    <div className="w-full md:w-auto">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 w-full md:w-auto">
            <CalendarIcon className="w-4 h-4" />
            {formatDateRange(dateRange)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode={mode}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={1}
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
};

DateSelectorCard.defaultProps = {
  dateRange: { from: new Date(), to: null },
  mode: "single",
};

export default DateSelectorCard;
