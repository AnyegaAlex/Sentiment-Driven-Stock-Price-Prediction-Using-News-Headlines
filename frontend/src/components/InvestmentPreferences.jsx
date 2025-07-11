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

function InvestmentPreferences({ onSubmit = () => {} }) {
  const [preferences, setPreferences] = useState({
    riskType: 'medium',
    holdTime: 'medium',
    detailed: false
  });

  useEffect(() => {
    const saved = localStorage.getItem('investmentPreferences');
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('investmentPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const handleChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

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
          <div className="space-y-2">
            <label htmlFor="risk-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Risk Level
            </label>
            <Select 
              value={preferences.riskType} 
              onValueChange={(value) => handleChange('riskType', value)}
            >
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

          <div className="space-y-2">
            <label htmlFor="time-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Expected Holding Time
            </label>
            <Select 
              value={preferences.holdTime} 
              onValueChange={(value) => handleChange('holdTime', value)}
            >
              <SelectTrigger id="time-select" className="w-full dark:bg-gray-800 dark:border-gray-700">
                <SelectValue placeholder="Select holding time" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="short" className="dark:hover:bg-gray-700">Short Term (0-1 year)</SelectItem>
                <SelectItem value="medium" className="dark:hover:bg-gray-700">Medium Term (1-5 years)</SelectItem>
                <SelectItem value="long" className="dark:hover:bg-gray-700">Long Term (5+ years)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Choose how long you plan to hold the investment.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Checkbox
              id="detailed-checkbox"
              checked={preferences.detailed}
              onCheckedChange={(checked) => handleChange('detailed', checked)}
              className="dark:border-gray-600 dark:data-[state=checked]:bg-blue-600"
            />
            <label htmlFor="detailed-checkbox" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Show Detailed Analysis
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-4">
            Enable for more in-depth metrics and analysis.
          </p>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => onSubmit(preferences)} 
              className="flex items-center gap-2 px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700"
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
  onSubmit: PropTypes.func.isRequired,
};

export default InvestmentPreferences;