import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Radar } from "react-chartjs-2";
import GaugeChart from "react-gauge-chart";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { TrendingUp, TrendingDown, MinusCircle } from "lucide-react";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale
);

const TrendBadge = ({ trend }) => {
  let badgeClass = "bg-gray-800 text-gray-300";
  let icon = <MinusCircle className="w-4 h-4 text-gray-400" />;
  let label = "Flat";

  if (trend === "up") {
    badgeClass = "bg-emerald-900/30 text-emerald-400 border border-emerald-800/50";
    icon = <TrendingUp className="w-4 h-4 text-emerald-400" />;
    label = "Bullish";
  } else if (trend === "down") {
    badgeClass = "bg-rose-900/30 text-rose-400 border border-rose-800/50";
    icon = <TrendingDown className="w-4 h-4 text-rose-400" />;
    label = "Bearish";
  }

  return (
    <Badge className={`uppercase text-xs tracking-wide flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${badgeClass}`}>
      {icon} {label}
    </Badge>
  );
};

TrendBadge.propTypes = {
  trend: PropTypes.oneOf(["up", "down", "neutral"]).isRequired,
};

const TechnicalIndicatorsCard = ({ technical, symbol }) => {
  const [view, setView] = useState("sma");

  const renderValueWithTrend = (label, value, prevValue) => {
    if (value == null) return <p className="text-gray-500">-</p>;

    const numericValue = Number(value);
    const trend =
      prevValue != null
        ? numericValue > Number(prevValue)
          ? "up"
          : numericValue < Number(prevValue)
          ? "down"
          : "neutral"
        : "neutral";

    return (
      <div className="flex items-center gap-3">
        <span className="font-semibold text-lg text-white">
          {numericValue.toFixed(2)}
        </span>
        <TrendBadge trend={trend} />
      </div>
    );
  };

  if (!technical) {
    return (
      <Card className="m-4 p-6 bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-400">
            Technical Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Analyzing market data...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Chart configuration
  const chartData = {
    labels: ["SMA 50", "SMA 200", "RSI", "Pivot", "Support", "Resistance"],
    datasets: [{
      label: "Indicator Strength",
      data: [
        technical.sma_50 || 0,
        technical.sma_200 || 0,
        technical.rsi || 0,
        technical.pivot || 0,
        technical.support || 0,
        technical.resistance || 0
      ],
      backgroundColor: "rgba(99, 102, 241, 0.2)",
      borderColor: "rgb(99, 102, 241)",
      borderWidth: 1.5,
      pointBackgroundColor: "rgb(99, 102, 241)",
      pointBorderColor: "#fff",
    }]
  };

  const chartOptions = {
    responsive: true,
    scales: {
      r: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.1)" },
        ticks: { color: "rgba(255,255,255,0.6)", backdropColor: "transparent" },
        angleLines: { color: "rgba(255,255,255,0.1)" }
      }
    },
    plugins: {
      legend: { labels: { color: "rgba(255,255,255,0.8)" } },
      tooltip: {
        backgroundColor: "rgba(17,24,39,0.95)",
        titleColor: "rgb(209,213,219)",
        bodyColor: "rgb(156,163,175)",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1
      }
    }
  };

  return (
    <Card className="m-4 p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl">
      <CardHeader className="border-b border-gray-800 pb-4">
        <div className="flex flex-col space-y-3">
          <CardTitle className="text-2xl font-bold text-white">
            {symbol} Technicals
          </CardTitle>
          
          <div className="flex gap-2">
            <button
              onClick={() => setView("sma")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${view === "sma" 
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-400/30"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-800/70"}`}
            >
              Trend Indicators
            </button>
            <button
              onClick={() => setView("rsi")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${view === "rsi" 
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-400/30"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-800/70"}`}
            >
              Momentum
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-6 space-y-8">
        {view === "sma" ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { label: "SMA 50", value: technical.sma_50, prev: technical.sma_50_prev },
                { label: "SMA 200", value: technical.sma_200, prev: technical.sma_200_prev },
                { label: "Pivot Point", value: technical.pivot },
                { label: "Support", value: technical.support },
                { label: "Resistance", value: technical.resistance },
                { label: "RSI (14)", value: technical.rsi },
              ].map(({ label, value, prev }, index) => (
                <div key={index} className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger className="text-sm font-medium text-gray-400 cursor-help hover:text-gray-300">
                      {label}
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border border-gray-700 text-gray-200">
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {label.includes("SMA") 
                          ? "Simple Moving Average - Trend direction indicator"
                          : label.includes("RSI")
                          ? "Relative Strength Index - Momentum oscillator (30-70 range)"
                          : "Key price levels for market structure analysis"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  {renderValueWithTrend(label, value, prev)}
                </div>
              ))}
            </div>

            <div className="w-full h-96">
              <Radar 
                data={chartData} 
                options={chartOptions}
                className="!w-full !h-full"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            <div className="w-full max-w-lg">
              <GaugeChart
                id="rsi-gauge"
                percent={(technical.rsi || 0) / 100}
                colors={["#EF4444", "#22C55E"]}
                arcWidth={0.25}
                textColor="#FFFFFF"
                needleColor="#818CF8"
                needleBaseColor="#4F46E5"
                animate={false}
              />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-white">
                {technical.rsi?.toFixed(1) || '--'} RSI
              </h3>
              <p className="text-gray-400 text-sm">
                {technical.rsi > 70 ? "Overbought Territory" :
                 technical.rsi < 30 ? "Oversold Territory" : 
                 "Neutral Momentum"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

TechnicalIndicatorsCard.propTypes = {
  technical: PropTypes.shape({
    sma_50: PropTypes.number,
    sma_200: PropTypes.number,
    rsi: PropTypes.number,
    pivot: PropTypes.number,
    support: PropTypes.number,
    resistance: PropTypes.number,
    sma_50_prev: PropTypes.number,
    sma_200_prev: PropTypes.number,
    rsi_prev: PropTypes.number,
  }),
  symbol: PropTypes.string.isRequired,

};

export default TechnicalIndicatorsCard;