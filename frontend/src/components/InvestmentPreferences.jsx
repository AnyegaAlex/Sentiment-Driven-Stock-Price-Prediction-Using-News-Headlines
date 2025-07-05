import React, { useEffect, useCallback } from "react";
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

// Load saved preferences from localStorage
const loadSavedPreferences = () => {
  try {
    const saved = localStorage.getItem('investmentPreferences');
    return saved ? JSON.parse(saved) : {
      riskType: 'medium',
      holdTime: 'medium',
      detailed: false
    };
  } catch (error) {
    console.error("Error loading preferences:", error);
    return {
      riskType: 'medium',
      holdTime: 'medium',
      detailed: false
    };
  }
};

function InvestmentPreferences({
  riskType,
  holdTime,
  detailed,
  onRiskTypeChange,
  onHoldTimeChange,
  setDetailed,
  onSubmit,
}) {
  // Memoize the initialization function
  const initializePreferences = useCallback(() => {
    const savedPrefs = loadSavedPreferences();
    onRiskTypeChange(savedPrefs.riskType);
    onHoldTimeChange(savedPrefs.holdTime);
    setDetailed(savedPrefs.detailed);
  }, [onRiskTypeChange, onHoldTimeChange, setDetailed]);

  // Initialize with saved preferences on component mount
  useEffect(() => {
    initializePreferences();
  }, [initializePreferences]);

  // Save preferences to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('investmentPreferences', JSON.stringify({
        riskType,
        holdTime,
        detailed
      }));
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  }, [riskType, holdTime, detailed]);

  return (
    <div className="flex justify-center items-center min-h-[60vh] p-4">
      <Card className="w-full max-w-3xl shadow-lg border border-gray-200 dark:border-gray-700">
        <CardHeader className="flex items-center justify-between border-b p-4 dark:border-gray-700">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold dark:text-gray-100">
            <Settings2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Investment Preferences
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Risk Level Selection */}
          <div className="space-y-2">
            <label
              htmlFor="risk-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Risk Level
            </label>
            <Select value={riskType} onValueChange={onRiskTypeChange}>
              <SelectTrigger id="risk-select" className="w-full dark:bg-gray-800 dark:border-gray-700">
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

          {/* Holding Time Selection */}
          <div className="space-y-2">
            <label
              htmlFor="time-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Expected Holding Time
            </label>
            <Select value={holdTime} onValueChange={onHoldTimeChange}>
              <SelectTrigger id="time-select" className="w-full dark:bg-gray-800 dark:border-gray-700">
                <SelectValue placeholder="Select holding time" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="short" className="dark:hover:bg-gray-700">Short Term</SelectItem>
                <SelectItem value="medium" className="dark:hover:bg-gray-700">Medium Term</SelectItem>
                <SelectItem value="long" className="dark:hover:bg-gray-700">Long Term</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Choose how long you plan to hold the investment.
            </p>
          </div>

          {/* Detailed Analysis Checkbox */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="detailed-checkbox"
              checked={detailed}
              onCheckedChange={setDetailed}
              className="dark:border-gray-600 dark:data-[state=checked]:bg-blue-600"
            />
            <label
              htmlFor="detailed-checkbox"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              Detailed Analysis
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button 
              onClick={onSubmit} 
              className="flex items-center gap-2 px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Newspaper className="w-4 h-4" />
              Show Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

InvestmentPreferences.propTypes = {
  riskType: PropTypes.oneOf(["low", "medium", "high"]).isRequired,
  holdTime: PropTypes.oneOf(["short", "medium", "long"]).isRequired,
  detailed: PropTypes.bool.isRequired,
  onRiskTypeChange: PropTypes.func.isRequired,
  onHoldTimeChange: PropTypes.func.isRequired,
  setDetailed: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default React.memo(InvestmentPreferences);