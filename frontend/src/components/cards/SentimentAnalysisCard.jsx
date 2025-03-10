// src/components/SentimentAnalysisCard.jsx
import React from "react";
import PropTypes from "prop-types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Line } from "react-chartjs-2";
import { ArrowDown, ArrowUp, Newspaper, ExternalLink } from "lucide-react";

const SentimentAnalysisCard = ({ data }) => {
  // Safe default data to avoid undefined errors
  const safeData = data || {
    factors: { aggregated_sentiment: 0, news_count: 0 },
    news_data: [],
    confidence: { sentiment: "0%" },
    risk_metrics: { risk_reward_ratio: "1:3" },
  };

  // Destructure with defaults
  const {
    factors: { aggregated_sentiment, news_count },
    news_data: newsItems,
    confidence: { sentiment: sentimentConfidence },
    risk_metrics: { risk_reward_ratio },
  } = safeData;

  // Memoized sentiment distribution calculation
  const sentimentDistribution = React.useMemo(() => ({
    positive: newsItems.filter(n => n.sentiment === 'positive').length,
    neutral: newsItems.filter(n => n.sentiment === 'neutral').length,
    negative: newsItems.filter(n => n.sentiment === 'negative').length,
  }), [newsItems]);

  // Calculate percentages
  const totalNews = newsItems.length || 1;
  const positivePct = ((sentimentDistribution.positive / totalNews) * 100).toFixed(1);
  const neutralPct = ((sentimentDistribution.neutral / totalNews) * 100).toFixed(1);
  const negativePct = ((sentimentDistribution.negative / totalNews) * 100).toFixed(1);

  // Sentiment percentage and bullish/bearish flag
  const sentimentPercentage = ((aggregated_sentiment + 1) / 2) * 100;
  const isBullish = sentimentPercentage >= 50;

  // Render fallback if no data
  if (!data) {
    return (
      <Card className="bg-black text-gray-100 border-gray-800 rounded-xl shadow-lg">
        <CardContent className="text-center py-6 text-gray-400">
          No sentiment data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black text-gray-100 border-gray-800 rounded-xl shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold">
              Sentiment Analysis {isBullish ? "🚀" : "📉"}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Newspaper className="w-4 h-4" />
              <span>{news_count} articles analyzed</span>
            </div>
          </div>
          <div className="w-32 h-12">
            <Line
              data={{
                labels: ['-6d', '-5d', '-4d', '-3d', '-2d', '-1d', 'Now'],
                datasets: [{
                  data: [0.2, -0.1, 0.4, -0.3, 0.6, 0.1, aggregated_sentiment],
                  borderColor: '#3b82f6',
                  tension: 0.4,
                }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { display: false }, x: { display: false } },
              }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Sentiment Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <MetricBadge 
            label="Positive" 
            value={positivePct} 
            color="green" 
            icon={<ArrowUp className="w-4 h-4" />}
          />
          <MetricBadge 
            label="Neutral" 
            value={neutralPct} 
            color="yellow"
          />
          <MetricBadge 
            label="Negative" 
            value={negativePct} 
            color="red" 
            icon={<ArrowDown className="w-4 h-4" />}
          />
        </div>

        {/* Confidence & Risk Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-400">Sentiment Confidence</p>
            <p className="text-2xl font-bold">{sentimentConfidence}</p>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-400">Risk/Reward Ratio</p>
            <p className="text-2xl font-bold">{risk_reward_ratio}</p>
          </div>
        </div>

        {/* News List */}
        <div className="border-t border-gray-800 my-4" />
        <h3 className="text-lg font-semibold">Top News</h3>
        <div className="max-h-96 overflow-y-auto pr-2">
          {newsItems.length === 0 ? (
            <div className="text-gray-400 text-center py-4">
              No recent news analysis available
            </div>
          ) : (
            newsItems.map((news, index) => (
              <NewsItem key={index} news={news} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Sub-components with prop validation
const MetricBadge = ({ label, value, color, icon }) => (
  <div className={`p-4 rounded-lg ${
    color === 'green' ? 'bg-green-900/20 border-green-800' :
    color === 'red' ? 'bg-red-900/20 border-red-800' :
    'bg-yellow-900/20 border-yellow-800'
  } border`}>
    <div className="flex items-center gap-2">
      {icon && React.cloneElement(icon, { 
        className: `w-5 h-5 ${
          color === 'green' ? 'text-green-400' :
          color === 'red' ? 'text-red-400' :
          'text-yellow-400'
        }` 
      })}
      <span className={`text-sm ${
        color === 'green' ? 'text-green-300' :
        color === 'red' ? 'text-red-300' :
        'text-yellow-300'
      }`}>
        {label}
      </span>
    </div>
    <div className="text-2xl font-bold mt-2">{value}%</div>
  </div>
);

MetricBadge.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  color: PropTypes.oneOf(["green", "red", "yellow"]).isRequired,
  icon: PropTypes.element,
};

const NewsItem = ({ news }) => (
  <a
    href={news.url}
    target="_blank"
    rel="noopener noreferrer"
    className="group block p-4 bg-gray-900 rounded-lg hover:bg-gray-800 hover:shadow-lg transition-all duration-200 mb-2"
    aria-label={`Read news article: ${news.title}`}
    tabIndex={0}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge 
            variant={news.sentiment} 
            className="text-xs"
            aria-label={`${news.sentiment} sentiment`}
          >
            {news.sentiment}
          </Badge>
          <span className="text-sm text-gray-400">
            {news.source} (Reliability: {news.source_reliability}%)
          </span>
        </div>
        <p className="text-sm font-medium group-hover:text-blue-400 transition-colors">
          {news.title}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {news.key_phrases?.map((phrase, i) => (
            <span 
              key={i} 
              className="px-2 py-1 text-xs bg-gray-800 rounded-md"
              aria-label="Key phrase"
            >
              {phrase}
            </span>
          ))}
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
    </div>
  </a>
);

NewsItem.propTypes = {
  news: PropTypes.shape({
    url: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    sentiment: PropTypes.oneOf(["positive", "neutral", "negative"]).isRequired,
    source: PropTypes.string.isRequired,
    source_reliability: PropTypes.number.isRequired,
    key_phrases: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
};

SentimentAnalysisCard.propTypes = {
  data: PropTypes.shape({
    factors: PropTypes.shape({
      aggregated_sentiment: PropTypes.number,
      news_count: PropTypes.number,
    }),
    news_data: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
        source: PropTypes.string.isRequired,
        sentiment: PropTypes.oneOf(["positive", "neutral", "negative"]),
        source_reliability: PropTypes.number,
        key_phrases: PropTypes.arrayOf(PropTypes.string),
      })
    ),
    confidence: PropTypes.shape({
      sentiment: PropTypes.string,
    }),
    risk_metrics: PropTypes.shape({
      risk_reward_ratio: PropTypes.string,
    }),
  }),
};

export default SentimentAnalysisCard;