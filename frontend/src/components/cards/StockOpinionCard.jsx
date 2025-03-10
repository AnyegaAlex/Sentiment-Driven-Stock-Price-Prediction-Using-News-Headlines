// src/components/StockOpinionCard.jsx
import React from "react";
import PropTypes from "prop-types";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { ShieldAlert } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const StockOpinionCard = ({ opinion }) => {
  if (!opinion) return null;

  if (opinion.error) {
    return (
      <Alert variant="destructive" className="m-4 bg-red-900 text-red-100">
        <AlertTitle>Error Generating Opinion</AlertTitle>
        <AlertDescription>{opinion.error}</AlertDescription>
      </Alert>
    );
  }

  // Data extraction with fallbacks
  const {
    symbol = "N/A",
    action = "Analyzing",
    confidence = {},
    risk_metrics = {},
    contrarian_warnings = [],
    timestamp = new Date().toISOString(),
    explanation = "",
    horizon = "N/A",
  } = opinion;

  // Confidence value parser
  const parseConfidence = (val) => {
    if (typeof val === "number") return Math.min(Math.max(val, 0), 100);
    if (typeof val === "string") {
      const parsed = parseFloat(val.replace("%", ""));
      return isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 100);
    }
    return 0;
  };

  // Color determination for confidence levels
  const getConfidenceColor = (value) => {
    if (value >= 70) return "#22c55e"; // Green
    if (value >= 30) return "#f59e0b"; // Yellow
    return "#ef4444"; // Red
  };

  return (
    <Card className="bg-black text-gray-100 border-gray-800 rounded-xl shadow-lg">
      {/* Header Section */}
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">
            AI Opinion: {symbol} 🤖
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              className={`uppercase text-sm ${
                action.toLowerCase().includes("buy")
                  ? "bg-green-600 hover:bg-green-700"
                  : action.toLowerCase().includes("sell")
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-gray-600 hover:bg-gray-700"
              } text-gray-100`}
            >
              {action}
            </Badge>
            <span className="text-sm text-gray-400">| Horizon: {horizon}</span>
          </div>
        </div>
        <CardDescription className="text-sm text-gray-400">
          Generated on {new Date(timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Confidence Radial Charts */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Confidence Scores</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["technical", "sentiment", "composite"].map((key) => {
              const value = parseConfidence(confidence[key]);
              return (
                <div
                  key={key}
                  className="p-4 bg-gray-900 rounded-lg flex flex-col items-center"
                >
                  <div className="w-32 h-32 mb-2">
                    <CircularProgressbar
                      value={value}
                      text={`${value.toFixed(1)}%`}
                      styles={{
                        path: {
                          stroke: getConfidenceColor(value),
                          strokeLinecap: "butt",
                        },
                        trail: { stroke: "#374151" },
                        text: {
                          fill: getConfidenceColor(value),
                          fontSize: "24px",
                          fontWeight: "bold",
                        },
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-400 capitalize">
                    {key.replace("_", " ")} Confidence
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Risk Metrics Grid */}
        <section className="bg-gray-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Risk Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stop Loss */}
            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded">
              <span className="text-2xl">🔴</span>
              <div>
                <p className="text-sm text-gray-400">Stop Loss</p>
                <p className="font-bold">
                  ${risk_metrics.stop_loss?.toFixed(2) || "N/A"}
                </p>
              </div>
            </div>

            {/* Take Profit */}
            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded">
              <span className="text-2xl">🟢</span>
              <div>
                <p className="text-sm text-gray-400">Take Profit</p>
                <p className="font-bold">
                  ${risk_metrics.take_profit?.toFixed(2) || "N/A"}
                </p>
              </div>
            </div>

            {/* Risk/Reward Ratio */}
            <Tooltip>
              <TooltipContent side="top" className="bg-gray-800 text-gray-100">
                Potential reward is {risk_metrics.risk_reward_ratio?.split(":")[1] || 3}x the risk
              </TooltipContent>
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded cursor-help">
                <span className="text-2xl">⚖️</span>
                <div>
                  <p className="text-sm text-gray-400">Risk/Reward</p>
                  <p className="font-bold">
                    {risk_metrics.risk_reward_ratio || "1:3"}
                  </p>
                </div>
              </div>
            </Tooltip>
          </div>
        </section>

        {/* Expandable Explanation */}
        {explanation && (
          <Accordion type="single" collapsible>
            <AccordionItem value="explanation">
              <AccordionTrigger className="text-gray-100 hover:text-gray-300 px-0">
                <span className="font-semibold">AI Explanation</span>
              </AccordionTrigger>
              <AccordionContent className="pt-4 text-gray-300">
                {explanation}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Collapsible Warnings */}
        {contrarian_warnings.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="warnings">
              <AccordionTrigger className="text-red-400 hover:text-red-300 px-0">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  <span className="font-semibold">
                    Contrarian Warnings ({contrarian_warnings.length})
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-2">
                {contrarian_warnings.map((warning, index) => (
                  <Alert
                    key={index}
                    className="bg-red-900/50 text-red-100 border-red-800"
                  >
                    <AlertTitle className="text-sm font-medium">
                      Warning #{index + 1}
                    </AlertTitle>
                    <AlertDescription className="text-sm">
                      {warning}
                    </AlertDescription>
                  </Alert>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

StockOpinionCard.propTypes = {
  opinion: PropTypes.shape({
    symbol: PropTypes.string.isRequired,
    action: PropTypes.string,
    confidence: PropTypes.shape({
      technical: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      sentiment: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      composite: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    risk_metrics: PropTypes.shape({
      stop_loss: PropTypes.number,
      take_profit: PropTypes.number,
      risk_reward_ratio: PropTypes.string,
    }),
    contrarian_warnings: PropTypes.arrayOf(PropTypes.string),
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    explanation: PropTypes.string,
    horizon: PropTypes.string,
    error: PropTypes.string,
  }),
};

StockOpinionCard.defaultProps = {
  opinion: null,
};

export default StockOpinionCard;