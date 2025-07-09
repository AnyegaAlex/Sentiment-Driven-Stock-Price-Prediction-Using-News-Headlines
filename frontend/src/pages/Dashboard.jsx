import React, { useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Newspaper, Settings } from "lucide-react";
import InvestmentPreferences from "../components/InvestmentPreferences";
import StockOpinionCard from "../components/cards/StockOpinionCard";
import TechnicalIndicatorsCard from "../components/cards/TechnicalIndicatorsCard";
import SentimentAnalysisCard from "../components/cards/SentimentAnalysisCard";
import NewsList from "../components/NewsList";
import DashboardCards from "../components/cards/DashboardCards";
import { Button } from "@/components/ui/button";
import { useLocalStorage, useSessionStorage } from "../hooks/useStorage"; // Extracted hooks

const Dashboard = () => {
  const { symbol } = useParams();
  const [selectedTab, setSelectedTab] = useSessionStorage("dashboard_active_tab", "opinion");
  
  // Preferences state
  const [preferencesSet, setPreferencesSet] = useLocalStorage(`prefsSet_${symbol}`, false);
  const [riskType, setRiskType] = useLocalStorage(`risk_${symbol}`, "medium");
  const [holdTime, setHoldTime] = useLocalStorage(`holdTime_${symbol}`, "medium");
  const [detailed, setDetailed] = useLocalStorage(`detailed_${symbol}`, false);
  
  // Data state
  const [stockOpinion, setStockOpinion] = React.useState(null);
  const [technical, setTechnical] = React.useState(null);
  const [newsData, setNewsData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // Fetch data functions
  const fetchStockOpinion = useCallback(async (symbol, prefs) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/stock-opinion?symbol=${symbol}&risk=${prefs.risk}&holdTime=${prefs.holdTime}`
      );
      const data = await response.json();
      setStockOpinion(data);
      setTechnical(data.factors?.technical || null);
    } catch (error) {
      console.error("Failed to fetch stock opinion:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAnalyzedNews = useCallback(async (symbol) => {
    try {
      const response = await fetch(`/api/news/analyzed?symbol=${symbol}`);
      const data = await response.json();
      setNewsData(data);
    } catch (error) {
      console.error("Failed to fetch analyzed news:", error);
    }
  }, []);

  // Load preferences and data
  useEffect(() => {
    const savedPrefs = JSON.parse(localStorage.getItem(`preferences_${symbol}`));
    if (savedPrefs) {
      setRiskType(savedPrefs.risk);
      setHoldTime(savedPrefs.holdTime);
      setDetailed(savedPrefs.detailed);
      setPreferencesSet(true);
      
      // Fetch data if preferences were already set
      if (preferencesSet) {
        fetchStockOpinion(symbol, savedPrefs);
        fetchAnalyzedNews(symbol);
      }
    }
  }, [
    symbol, 
    preferencesSet, 
    fetchStockOpinion, 
    fetchAnalyzedNews
  ]);

  const handlePreferencesSubmit = () => {
    const prefs = { risk: riskType, holdTime, detailed };
    localStorage.setItem(`preferences_${symbol}`, JSON.stringify(prefs));
    setPreferencesSet(true);
    fetchStockOpinion(symbol, prefs);
    fetchAnalyzedNews(symbol);
  };

  if (!preferencesSet) {
    return (
      <div className="p-4 md:p-6">
        <InvestmentPreferences
          riskType={riskType}
          holdTime={holdTime}
          detailed={detailed}
          onRiskTypeChange={setRiskType}
          onHoldTimeChange={setHoldTime}
          setDetailed={setDetailed}
          onSubmit={handlePreferencesSubmit}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Preferences Summary */}
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1 sm:space-y-0 sm:space-x-4 text-sm">
          <span className="inline-block">
            <strong>Risk:</strong> <span className="capitalize">{riskType}</span>
          </span>
          <span className="inline-block">
            <strong>Hold:</strong> <span className="capitalize">{holdTime}</span>
          </span>
          <span className="inline-block">
            <strong>View:</strong> {detailed ? "Detailed" : "Summary"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPreferencesSet(false)}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Edit Preferences
        </Button>
      </div>

      {/* Dashboard Tabs */}
      <Tabs 
        value={selectedTab} 
        onValueChange={setSelectedTab}
        className="space-y-6"
      >
        <TabsList className="w-full flex justify-center bg-transparent gap-2 p-0">
          {[
            { value: "opinion", icon: LineChart, label: "Stock Opinion" },
            { value: "news", icon: Newspaper, label: "News Analysis" }
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900/50"
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Opinion Tab */}
        <TabsContent value="opinion" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-8">Loading analysis...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StockOpinionCard 
                opinion={stockOpinion} 
                loading={!stockOpinion}
              />
              <TechnicalIndicatorsCard 
                technical={technical} 
                symbol={symbol}
                loading={!technical}
              />
              <SentimentAnalysisCard
                sentiment={stockOpinion?.factors?.aggregated_sentiment}
                newsCount={stockOpinion?.factors?.news_count || newsData.length}
                loading={!stockOpinion}
              />
            </div>
          )}
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news" className="space-y-6">
          <DashboardCards symbol={symbol} />
          <NewsList newsData={newsData} loading={newsData.length === 0} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;