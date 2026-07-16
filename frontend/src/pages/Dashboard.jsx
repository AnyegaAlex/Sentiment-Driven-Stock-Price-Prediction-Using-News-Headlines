/**
 * Dashboard Page - Main entry point for the stock analysis application
 * 
 * This page serves as the central hub for all stock analysis features:
 * - Stock search and symbol selection
 * - Investment preferences (risk level, hold time, view mode)
 * - Three core analysis cards: Stock Opinion, Technical Indicators, Sentiment Analysis
 * - News analysis tab with filtered news feed
 * 
 * State Management:
 * - URL params: symbol (e.g., /dashboard/AAPL)
 * - LocalStorage: preferences per symbol (risk, hold time, detailed view)
 * - SessionStorage: active tab selection
 * - React Query: news data caching and fetching
 */

import React, { useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Newspaper, Settings, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

// Component Imports
import InvestmentPreferences from "../components/InvestmentPreferences";
import StockOpinionCard from "../components/cards/StockOpinionCard";
import TechnicalIndicatorsCard from "../components/cards/TechnicalIndicatorsCard";
import SentimentAnalysisCard from "../components/cards/SentimentAnalysisCard";
import NewsList from "../components/NewsList";

// Hooks
import { useLocalStorage, useSessionStorage } from "../hooks/useStorage";
import { useNewsQuery } from "../hooks/queries/useNewsQuery";
import { useDashboard } from "../context/DashboardContext";

// ============================================================================
// Constants
// ============================================================================

const TAB_CONFIG = [
  {
    value: "opinion",
    icon: LineChart,
    label: "Stock Opinion",
  },
  {
    value: "news",
    icon: Newspaper,
    label: "News Analysis",
  },
];

// ============================================================================
// Sub-Components
// ============================================================================

const EmptyState = () => (
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

const PreferencesSummary = ({ riskType, holdTime, detailed, onEdit }) => (
  <div className="section-wrap glass-hover flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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
    <Button variant="ghost" size="sm" onClick={onEdit} className="gap-2">
      <Settings className="w-4 h-4" />
      Edit Preferences
    </Button>
  </div>
);

PreferencesSummary.propTypes = {
  riskType: PropTypes.string.isRequired,
  holdTime: PropTypes.string.isRequired,
  detailed: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
};

EmptyState.propTypes = {};

// ============================================================================
// Main Component
// ============================================================================

const Dashboard = () => {
  // --- All hooks must be called unconditionally at the top ---
  const { symbol: paramSymbol } = useParams();
  const navigate = useNavigate();
  const { stockSymbol: contextSymbol, setStockSymbol } = useDashboard();

  // Tab persistence across sessions (sessionStorage)
  const [selectedTab, setSelectedTab] = useSessionStorage(
    "dashboard_active_tab",
    "opinion"
  );

  // Preferences persistence per symbol – use paramSymbol or contextSymbol as key
  const activeSymbol = paramSymbol || contextSymbol || '';
  const [preferencesSet, setPreferencesSet] = useLocalStorage(
    `prefsSet_${activeSymbol}`,
    false
  );
  const [riskType, setRiskType] = useLocalStorage(
    `risk_${activeSymbol}`,
    "medium"
  );
  const [holdTime, setHoldTime] = useLocalStorage(
    `holdTime_${activeSymbol}`,
    "medium-term"
  );
  const [detailed, setDetailed] = useLocalStorage(
    `detailed_${activeSymbol}`,
    false
  );

  // React Query hook – enabled only when activeSymbol is truthy
  const { data: newsData = [], isLoading: newsLoading } = useNewsQuery(activeSymbol);

  // --- Side effects and redirects ---
  useEffect(() => {
    if (!paramSymbol && contextSymbol) {
      navigate(`/dashboard/${contextSymbol}`, { replace: true });
    }
  }, [paramSymbol, contextSymbol, navigate]);

  // Determine the effective symbol (URL param > context)
  const symbol = paramSymbol || contextSymbol;

  // --- Handlers ---
  const handlePreferencesSubmit = useCallback(() => {
    if (!symbol) return;
    const preferences = { risk: riskType, holdTime, detailed };
    localStorage.setItem(`preferences_${symbol}`, JSON.stringify(preferences));
    setPreferencesSet(true);
  }, [symbol, riskType, holdTime, detailed, setPreferencesSet]);

  const handleEditPreferences = useCallback(() => {
    setPreferencesSet(false);
  }, [setPreferencesSet]);

  // --- Render Logic (after all hooks) ---

  // State 1: No symbol
  if (!symbol) {
    return <EmptyState />;
  }

  // State 2: Symbol exists but preferences not yet configured
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

  // State 3: Full dashboard
  return (
    <div className="p-4 md:p-6 space-y-6">
      <PreferencesSummary
        riskType={riskType}
        holdTime={holdTime}
        detailed={detailed}
        onEdit={handleEditPreferences}
      />

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <div className="sticky-subheader top-[110px] md:top-[120px] px-3 py-3">
          <TabsList className="w-full flex justify-center bg-transparent gap-2 p-0">
            {TAB_CONFIG.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="px-4 py-2 rounded-xl text-sm bg-white/5 border border-white/10
                  data-[state=active]:bg-white/12 data-[state=active]:border-white/20
                  transition-all"
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="opinion" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StockOpinionCard
              symbol={symbol}
              riskType={riskType}
              holdTime={holdTime}
            />
            <TechnicalIndicatorsCard symbol={symbol} />
            <SentimentAnalysisCard symbol={symbol} />
          </div>
        </TabsContent>

        <TabsContent value="news" className="space-y-6">
          <NewsList 
            symbol={symbol}        
            newsData={newsData} 
            loading={newsLoading} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;