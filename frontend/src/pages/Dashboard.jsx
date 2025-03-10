// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import InvestmentPreferences from "../components/InvestmentPreferences";
import StockOpinionCard from "../components/cards/StockOpinionCard";
import TechnicalIndicatorsCard from "../components/cards/TechnicalIndicatorsCard";
import SentimentAnalysisCard from "../components/cards/SentimentAnalysisCard";
import NewsList from "../components/NewsList";
import DashboardCards from "../components/cards/DashboardCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Newspaper } from "lucide-react";

const Dashboard = () => {
  const { symbol } = useParams();

  // Preferences state (with localStorage persistence)
  const [preferencesSet, setPreferencesSet] = useState(false);
  const [riskType, setRiskType] = useState("medium");
  const [holdTime, setHoldTime] = useState("medium");
  const [detailed, setDetailed] = useState(false);

  // Data state
  const [stockOpinion, setStockOpinion] = useState(null);
  const [technical, setTechnical] = useState(null);
  const [newsData, setNewsData] = useState([]);

  // Load preferences from localStorage on first render
  useEffect(() => {
    const savedPrefs = JSON.parse(localStorage.getItem(`preferences_${symbol}`));
    if (savedPrefs) {
      setRiskType(savedPrefs.risk || "medium");
      setHoldTime(savedPrefs.holdTime || "medium");
      setDetailed(savedPrefs.detailed || false);
      setPreferencesSet(true); // Auto-open dashboard if prefs exist
    }
  }, [symbol]);

  // Save preferences to localStorage when user confirms and fetch data
  const handlePreferencesSubmit = () => {
    setPreferencesSet(true);
    const prefs = { risk: riskType, holdTime, detailed };
    localStorage.setItem(`preferences_${symbol}`, JSON.stringify(prefs));

    fetchStockOpinion(symbol, prefs);
    fetchAnalyzedNews(symbol);
  };

  // Fetch stock opinion based on preferences
  const fetchStockOpinion = async (symbol, prefs) => {
    try {
      const response = await fetch(
        `/api/stock-opinion?symbol=${symbol}&risk=${prefs.risk}&holdTime=${prefs.holdTime}`
      );
      const data = await response.json();
      setStockOpinion(data);
      // Assume technical indicators come as part of the factors
      setTechnical(data.factors?.technical || null);
    } catch (error) {
      console.error("Failed to fetch stock opinion:", error);
    }
  };

  // Fetch analyzed news for the selected symbol
  const fetchAnalyzedNews = async (symbol) => {
    try {
      const response = await fetch(`/api/news/analyzed?symbol=${symbol}`);
      const data = await response.json();
      setNewsData(data);
    } catch (error) {
      console.error("Failed to fetch analyzed news:", error);
    }
  };

  return (
    <div className="p-6">
      {!preferencesSet ? (
        <InvestmentPreferences
          riskType={riskType}
          holdTime={holdTime}
          detailed={detailed}
          onRiskTypeChange={setRiskType}
          onHoldTimeChange={setHoldTime}
          setDetailed={setDetailed}
          onSubmit={handlePreferencesSubmit}
        />
      ) : (
        <>
          {/* Preferences Summary */}
          <div className="p-4 bg-gray-100 rounded-lg mb-4 border border-gray-300">
            <p className="text-sm">
              <strong>Risk Level:</strong> {riskType}
            </p>
            <p className="text-sm">
              <strong>Hold Time:</strong> {holdTime}
            </p>
            <p className="text-sm">
              <strong>Detail Level:</strong> {detailed ? "Detailed" : "Summary"}
            </p>
            <button
              onClick={() => setPreferencesSet(false)}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Edit Preferences
            </button>
          </div>

          {/* Dashboard Tabs */}
          <Tabs defaultValue="opinion">
            <TabsList className="flex justify-center space-x-6 my-4">
              <TabsTrigger
                value="opinion"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg"
              >
                <LineChart className="w-4 h-4" /> Stock Opinion
              </TabsTrigger>
              <TabsTrigger
                value="news"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg"
              >
                <Newspaper className="w-4 h-4" /> News List
              </TabsTrigger>
            </TabsList>

            {/* Opinion Tab */}
            <TabsContent value="opinion">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stockOpinion ? (
                  <StockOpinionCard opinion={stockOpinion} />
                ) : (
                  <p className="text-center col-span-full">Loading stock opinion...</p>
                )}
                {technical && symbol ? (
                  <TechnicalIndicatorsCard technical={technical} symbol={symbol} />
                ) : (
                  <p className="text-center col-span-full">Loading technical indicators...</p>
                )}
                {/* You may also conditionally render SentimentAnalysisCard if data is available */}
                {stockOpinion && stockOpinion.factors && typeof stockOpinion.factors.aggregated_sentiment === 'number' ? (
                  <SentimentAnalysisCard
                    sentiment={stockOpinion.factors.aggregated_sentiment}
                    newsCount={stockOpinion.factors.news_count || newsData.length}
                  />
                ) : (
                  <p className="text-center col-span-full">Loading sentiment analysis...</p>
                )}
              </div>
            </TabsContent>

            {/* News Tab */}
            <TabsContent value="news">
              <div className="space-y-4">
                <DashboardCards symbol={symbol} />
                <NewsList newsData={newsData} />
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Dashboard;
