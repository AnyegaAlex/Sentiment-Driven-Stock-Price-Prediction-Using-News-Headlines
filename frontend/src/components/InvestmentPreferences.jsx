import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Newspaper, Settings2 } from "lucide-react";

function InvestmentPreferences({
  riskType = "medium",
  holdTime = "medium-term", // ✅ changed from "medium"
  detailed = false,
  onRiskTypeChange,
  onHoldTimeChange,
  setDetailed,
  onSubmit = () => {},
}) {
  // No internal state – everything is controlled via props

  const handleSubmit = () => {
    onSubmit({ risk: riskType, holdTime, detailed });
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh] p-3 sm:p-4">
      <Card className="w-full max-w-3xl shadow-lg border border-gray-200 dark:border-gray-700">
        <CardHeader className="flex items-center justify-between border-b p-4 sm:p-6 dark:border-gray-700">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold dark:text-gray-100">
            <Settings2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            Investment Preferences
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="space-y-2">
            <label htmlFor="risk-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Risk Level
            </label>
            <Select value={riskType} onValueChange={onRiskTypeChange}>
              <SelectTrigger id="risk-select" className="w-full dark:bg-gray-800 dark:border-gray-700 min-h-[44px]">
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="low" className="dark:hover:bg-gray-700">Low</SelectItem>
                <SelectItem value="medium" className="dark:hover:bg-gray-700">Medium</SelectItem>
                <SelectItem value="high" className="dark:hover:bg-gray-700">High</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Choose a risk level based on your comfort with market volatility.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="time-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Expected Holding Time
            </label>
            <Select value={holdTime} onValueChange={onHoldTimeChange}>
              <SelectTrigger id="time-select" className="w-full dark:bg-gray-800 dark:border-gray-700 min-h-[44px]">
                <SelectValue placeholder="Select holding time" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                {/* ✅ Correct values: short-term, medium-term, long-term */}
                <SelectItem value="short-term" className="dark:hover:bg-gray-700">Short Term (0-1 year)</SelectItem>
                <SelectItem value="medium-term" className="dark:hover:bg-gray-700">Medium Term (1-5 years)</SelectItem>
                <SelectItem value="long-term" className="dark:hover:bg-gray-700">Long Term (5+ years)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Choose how long you plan to hold the investment.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Checkbox
              id="detailed-checkbox"
              checked={detailed}
              onCheckedChange={setDetailed}
              className="dark:border-gray-600 dark:data-[state=checked]:bg-blue-600 h-5 w-5"
            />
            <label htmlFor="detailed-checkbox" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Show Detailed Analysis
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
            Enable for more in-depth metrics and analysis.
          </p>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Newspaper className="w-4 h-4" />
              Update Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

InvestmentPreferences.propTypes = {
  riskType: PropTypes.string,
  holdTime: PropTypes.string,
  detailed: PropTypes.bool,
  onRiskTypeChange: PropTypes.func.isRequired,
  onHoldTimeChange: PropTypes.func.isRequired,
  setDetailed: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
};

export default InvestmentPreferences;