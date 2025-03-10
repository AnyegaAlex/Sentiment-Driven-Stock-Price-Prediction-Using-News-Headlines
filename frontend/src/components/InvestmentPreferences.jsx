// src/components/InvestmentPreferences.jsx
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

function InvestmentPreferences({
  riskType,
  holdTime,
  detailed,
  onRiskTypeChange,
  onHoldTimeChange,
  setDetailed,
  onSubmit,
}) {
  return (
    <div className="flex justify-center items-center min-h-[60vh] p-4">
      <Card className="w-full max-w-3xl shadow-lg border border-gray-200">
        <CardHeader className="flex items-center justify-between border-b p-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Settings2 className="w-6 h-6 text-blue-600" />
            Investment Preferences
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Risk Level Selection */}
          <div className="space-y-2">
            <label
              htmlFor="risk-select"
              className="block text-sm font-medium text-gray-700"
            >
              Risk Level
            </label>
            <Select value={riskType} onValueChange={onRiskTypeChange}>
              <SelectTrigger id="risk-select" className="w-full">
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Choose a risk level based on your comfort with market volatility.
            </p>
          </div>

          {/* Holding Time Selection */}
          <div className="space-y-2">
            <label
              htmlFor="time-select"
              className="block text-sm font-medium text-gray-700"
            >
              Expected Holding Time
            </label>
            <Select value={holdTime} onValueChange={onHoldTimeChange}>
              <SelectTrigger id="time-select" className="w-full">
                <SelectValue placeholder="Select holding time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short Term</SelectItem>
                <SelectItem value="medium">Medium Term</SelectItem>
                <SelectItem value="long">Long Term</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Choose how long you plan to hold the investment.
            </p>
          </div>

          {/* Detailed Analysis Checkbox */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="detailed-checkbox"
              checked={detailed}
              onCheckedChange={setDetailed}
            />
            <label
              htmlFor="detailed-checkbox"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Detailed Analysis
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button onClick={onSubmit} className="flex items-center gap-2 px-4 py-2">
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

export default InvestmentPreferences;
