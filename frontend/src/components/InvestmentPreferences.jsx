import React from "react";
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
import { cn } from "@/lib/utils";

function InvestmentPreferences({
  riskType = "medium",
  holdTime = "medium-term",
  detailed = false,
  onRiskTypeChange,
  onHoldTimeChange,
  setDetailed,
  onSubmit = () => {},
}) {
  const handleSubmit = () => {
    onSubmit({ risk: riskType, holdTime, detailed });
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh] p-3 sm:p-4 bg-black">
      <Card className="w-full max-w-3xl shadow-lg border border-gray-800 bg-gray-900">
        <CardHeader className="flex items-center justify-between border-b border-gray-800 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-white">
            <Settings2 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            Investment Preferences
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* Risk Level */}
          <div className="space-y-2">
            <label htmlFor="risk-select" className="block text-sm font-medium text-gray-300">
              Risk Level
            </label>
            <Select value={riskType} onValueChange={onRiskTypeChange}>
              <SelectTrigger 
                id="risk-select" 
                className="w-full min-h-[44px] bg-gray-800 border-gray-700 text-white focus:ring-gray-500"
              >
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem 
                  value="low" 
                  className="focus:bg-gray-700 focus:text-white text-gray-400 hover:text-white min-h-[44px]"
                >
                  Low
                </SelectItem>
                <SelectItem 
                  value="medium" 
                  className="focus:bg-gray-700 focus:text-white text-gray-400 hover:text-white min-h-[44px]"
                >
                  Medium
                </SelectItem>
                <SelectItem 
                  value="high" 
                  className="focus:bg-gray-700 focus:text-white text-gray-400 hover:text-white min-h-[44px]"
                >
                  High
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Choose a risk level based on your comfort with market volatility.
            </p>
          </div>

          {/* Holding Time */}
          <div className="space-y-2">
            <label htmlFor="time-select" className="block text-sm font-medium text-gray-300">
              Expected Holding Time
            </label>
            <Select value={holdTime} onValueChange={onHoldTimeChange}>
              <SelectTrigger 
                id="time-select" 
                className="w-full min-h-[44px] bg-gray-800 border-gray-700 text-white focus:ring-gray-500"
              >
                <SelectValue placeholder="Select holding time" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem 
                  value="short-term" 
                  className="focus:bg-gray-700 focus:text-white text-gray-400 hover:text-white min-h-[44px]"
                >
                  Short Term (0-1 year)
                </SelectItem>
                <SelectItem 
                  value="medium-term" 
                  className="focus:bg-gray-700 focus:text-white text-gray-400 hover:text-white min-h-[44px]"
                >
                  Medium Term (1-5 years)
                </SelectItem>
                <SelectItem 
                  value="long-term" 
                  className="focus:bg-gray-700 focus:text-white text-gray-400 hover:text-white min-h-[44px]"
                >
                  Long Term (5+ years)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Choose how long you plan to hold the investment.
            </p>
          </div>

          {/* Detailed Analysis Checkbox */}
          <div className="flex items-center gap-3 pt-2">
            <Checkbox
              id="detailed-checkbox"
              checked={detailed}
              onCheckedChange={setDetailed}
              className="border-gray-700 data-[state=checked]:bg-white data-[state=checked]:text-black min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-gray-500"
            />
            <label 
              htmlFor="detailed-checkbox" 
              className="text-sm font-medium text-gray-300 cursor-pointer"
            >
              Show Detailed Analysis
            </label>
          </div>
          <p className="text-xs text-gray-500 -mt-1">
            Enable for more in-depth metrics, LSTM confidence scores, and FinBERT sentiment breakdown.
          </p>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
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