import React, { useCallback } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Newspaper, Settings, Search } from "lucide-react";
import InvestmentPreferences from "../components/InvestmentPreferences";
import StockOpinionCard from "../components/cards/StockOpinionCard";
import TechnicalIndicatorsCard from "../components/cards/TechnicalIndicatorsCard";
import SentimentAnalysisCard from "../components/cards/SentimentAnalysisCard";
import NewsList from "../components/NewsList";
import DashboardCards from "../components/cards/DashboardCards";
import { Button } from "@/components/ui/button";
import { useLocalStorage, useSessionStorage } from "../hooks/useStorage";
import { useNewsQuery } from "../hooks/queries/useNewsQuery";

const Dashboard = () => {
  const { symbol: paramSymbol } = useParams();

  // ✅ All hooks must be called unconditionally
  const [selectedTab, setSelectedTab] = useSessionStorage("dashboard_active_tab", "opinion");

  // Preferences – these use the symbol; they’ll still run even if symbol is undefined
  const [preferencesSet, setPreferencesSet] = useLocalStorage(`prefsSet_${paramSymbol}`, false);
  const [riskType, setRiskType] = useLocalStorage(`risk_${paramSymbol}`, "medium");
  const [holdTime, setHoldTime] = useLocalStorage(`holdTime_${paramSymbol}`, "medium-term");
  const [detailed, setDetailed] = useLocalStorage(`detailed_${paramSymbol}`, false);

  // React Query – it will be enabled only if symbol exists (we'll guard inside)
  const { data: newsData = [], isLoading: newsLoading } = useNewsQuery(paramSymbol || '');

  // Preferences submit handler
  const handlePreferencesSubmit = () => {
    const prefs = { risk: riskType, holdTime, detailed };
    localStorage.setItem(`preferences_${paramSymbol}`, JSON.stringify(prefs));
    setPreferencesSet(true);
  };

  // ✅ Early return after all hooks – this is safe
  if (!paramSymbol) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4 mb-6">
          <Search className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3">
          Find a Stock
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md text-base sm:text-lg">
          Use the search bar in the header to look up any stock symbol and get AI-powered analysis.
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
          Try searching for AAPL, TSLA, MSFT, or any other symbol.
        </p>
      </div>
    );
  }

  const symbol = paramSymbol;

  // Now we have a valid symbol; check preferences
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

  // Full dashboard
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Preferences Summary */}
      <div className="section-wrap glass-hover flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1 sm:space-y-0 sm:space-x-4 text-sm">
          <span className="inline-block"><strong>Risk:</strong> <span className="capitalize">{riskType}</span></span>
          <span className="inline-block"><strong>Hold:</strong> <span className="capitalize">{holdTime}</span></span>
          <span className="inline-block"><strong>View:</strong> {detailed ? "Detailed" : "Summary"}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setPreferencesSet(false)} className="gap-2">
          <Settings className="w-4 h-4" />
          Edit Preferences
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <div className="sticky-subheader top-[110px] md:top-[120px] px-3 py-3">
          <TabsList className="w-full flex justify-center bg-transparent gap-2 p-0">
            {[
              { value: "opinion", icon: LineChart, label: "Stock Opinion" },
              { value: "news", icon: Newspaper, label: "News Analysis" }
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="px-4 py-2 rounded-xl text-sm bg-white/5 border border-white/10
                 data-[state=active]:bg-white/12 data-[state=active]:border-white/20
                 transition-all"
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="opinion" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StockOpinionCard symbol={symbol} riskType={riskType} holdTime={holdTime} />
            <TechnicalIndicatorsCard symbol={symbol} />
            <SentimentAnalysisCard symbol={symbol} />
          </div>
        </TabsContent>

        <TabsContent value="news" className="space-y-6">
          <DashboardCards symbol={symbol} />
          <NewsList newsData={newsData} loading={newsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;