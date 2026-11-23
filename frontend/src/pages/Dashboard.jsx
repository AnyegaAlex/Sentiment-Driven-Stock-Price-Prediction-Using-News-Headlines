/**
 * Dashboard – main stock analysis view for the selected symbol.
 *
 * Shows Stock Opinion, Technical Indicators and Sentiment for one symbol.
 * Investment preferences are collected during onboarding and read from the
 * saved profile here. News lives on its own page (/news-analysis).
 */

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import apiClient from "@/services/client";

import StockOpinionCard from "../components/cards/StockOpinionCard";
import TechnicalIndicatorsCard from "../components/cards/TechnicalIndicatorsCard";
import SentimentAnalysisCard from "../components/cards/SentimentAnalysisCard";
import { useDashboard } from "../context/DashboardContext";

const RISK_TO_CARD = { conservative: "low", moderate: "medium", aggressive: "high" };
const HOLD_TIME = "medium-term";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
    <div className="rounded-full bg-gray-800 p-4 mb-6">
      <Search className="w-12 h-12 text-gray-400" />
    </div>
    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
      Search for a Stock
    </h2>
    <p className="text-gray-400 max-w-md text-base sm:text-lg">
      Enter a stock symbol in the search bar to see its analysis.
    </p>
    <p className="text-gray-500 text-sm mt-2">
      Try searching for AAPL, TSLA, MSFT, NVDA, or any other symbol.
    </p>
  </div>
);

const Dashboard = () => {
  const { symbol: paramSymbol } = useParams();
  const navigate = useNavigate();
  const { stockSymbol: contextSymbol } = useDashboard();

  const {
    data: savedPrefs,
    isLoading: preferencesLoading,
    isError: preferencesError,
    refetch: refetchPreferences,
  } = useQuery({
    queryKey: ["preferences"],
    queryFn: async () => {
      const response = await apiClient.get("/auth/preferences/");
      return response?.data ?? response ?? {};
    },
    staleTime: 5 * 60 * 1000,
  });
  const savedRiskType = savedPrefs?.risk_tolerance;
  const hasSavedRiskProfile = Boolean(savedRiskType && RISK_TO_CARD[savedRiskType]);
  // Keep the existing neutral/moderate fallback for the analysis cards, but
  // tell the user when it is a fallback rather than a saved preference.
  const riskType = hasSavedRiskProfile ? RISK_TO_CARD[savedRiskType] : "medium";

  useEffect(() => {
    if (!paramSymbol && contextSymbol) {
      navigate(`/dashboard/${contextSymbol}`, { replace: true });
    }
  }, [paramSymbol, contextSymbol, navigate]);

  const symbol = paramSymbol || contextSymbol;

  if (!symbol) return <EmptyState />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400" aria-live="polite">
        {preferencesLoading ? (
          <span>Loading your saved risk profile…</span>
        ) : preferencesError ? (
          <>
            <span>Your saved risk profile couldn’t be loaded. Analysis is using the moderate default.</span>
            <button
              type="button"
              onClick={() => refetchPreferences()}
              className="min-h-[36px] rounded-md border border-gray-700 px-3 text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Try again
            </button>
          </>
        ) : hasSavedRiskProfile ? (
          <span>
            Saved risk profile: <span className="capitalize text-white">{savedRiskType}</span>
          </span>
        ) : (
          <span>No saved risk profile. Analysis is using the moderate default.</span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StockOpinionCard symbol={symbol} riskType={riskType} holdTime={HOLD_TIME} />
        <TechnicalIndicatorsCard symbol={symbol} />
        <SentimentAnalysisCard symbol={symbol} />
      </div>
    </div>
  );
};

export default Dashboard;
