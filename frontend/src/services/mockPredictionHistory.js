// src/services/mockPredictionHistory.js

// Configuration constants
const STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'WMT'];
const MOVEMENTS = ['up', 'down', 'neutral'];
const DAYS_BETWEEN_PREDICTIONS = 2; // Predictions every 2 days

// Helper function to generate headlines
const generateHeadline = (stock, movement) => {
  const headlineTemplates = {
    up: [
      `${stock} Surges on Strong Earnings Report`,
      `Analysts Bullish on ${stock} After Product Launch`,
      `${stock} Shares Jump After Positive Guidance`,
      `${stock} Hits New High on Market Optimism`,
      `Institutional Investors Increase Positions in ${stock}`,
      `${stock} Upgraded by Major Wall Street Firm`
    ],
    down: [
      `${stock} Drops After Weak Quarterly Results`,
      `Regulatory Concerns Weigh on ${stock} Shares`,
      `${stock} Falls as Competition Intensifies`,
      `${stock} Downgraded Amid Growth Concerns`,
      `Short Sellers Target ${stock} Shares`,
      `${stock} Plunges on CEO Departure News`
    ],
    neutral: [
      `${stock} Holds Steady Amid Market Volatility`,
      `${stock} Reports Mixed Quarterly Results`,
      `No Major Movement Expected for ${stock} Shares`,
      `${stock} Trading in Narrow Range`,
      `Analysts Neutral on ${stock} Despite Market Moves`,
      `${stock} Shows Limited Reaction to Industry News`
    ]
  };

  const templates = headlineTemplates[movement];
  return templates[Math.floor(Math.random() * templates.length)];
};

// Sentiment score ranges by movement direction
const SENTIMENT_RANGES = {
  up: { min: 0.5, max: 1.0 },    // Clearly positive
  down: { min: -1.0, max: -0.5 }, // Clearly negative
  neutral: { min: -0.3, max: 0.3 } // Near neutral
};

/**
 * Generates mock prediction history data
 * @returns {Array<Object>} Array of prediction objects
 */
export const generateMockPredictions = () => {
  return Array.from({ length: 30 }, (_, i) => { // Generate 30 predictions
    const date = new Date(Date.now() - (i * DAYS_BETWEEN_PREDICTIONS * 24 * 60 * 60 * 1000));
    const stock = STOCKS[Math.floor(Math.random() * STOCKS.length)];
    const movement = MOVEMENTS[i % MOVEMENTS.length];
    const { min, max } = SENTIMENT_RANGES[movement];
    
    const sentimentScore = parseFloat((min + Math.random() * (max - min)).toFixed(2));
    const confidence = parseFloat((0.65 + Math.random() * 0.35).toFixed(2)); // 0.65-1.0
    const actualMovement = determineActualMovement(movement, confidence);
    const accuracy = calculateAccuracy(movement, actualMovement, confidence);
    
    return {
      id: `pred-${date.getTime()}-${stock}`,
      date: date.toISOString(),
      stock_symbol: stock,
      predicted_movement: movement,
      sentiment_score: sentimentScore,
      confidence: confidence,
      headline: generateHeadline(stock, movement),
      actual_movement: actualMovement,
      accuracy: accuracy,
      price_at_prediction: generatePrice(stock),
      current_price: generatePrice(stock, movement === 'up' ? 1.05 : movement === 'down' ? 0.95 : 1.0)
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
};

/**
 * Determines actual movement with some randomness based on prediction confidence
 * @param {string} predictedMovement - The predicted movement
 * @param {number} confidence - Prediction confidence (0-1)
 * @returns {string} Actual movement
 */
const determineActualMovement = (predictedMovement, confidence) => {
  // Higher confidence means higher chance of being correct
  const correctProbability = 0.5 + (confidence * 0.5); // 0.5-1.0
  
  if (Math.random() < correctProbability) {
    return predictedMovement;
  }
  
  // If incorrect, choose randomly between remaining options
  const otherOptions = MOVEMENTS.filter(m => m !== predictedMovement);
  return otherOptions[Math.floor(Math.random() * otherOptions.length)];
};

/**
 * Calculates mock accuracy score
 * @param {string} predicted - Predicted movement
 * @param {string} actual - Actual movement
 * @param {number} confidence - Prediction confidence
 * @returns {number} Accuracy score (0-1)
 */
const calculateAccuracy = (predicted, actual, confidence) => {
  const isCorrect = predicted === actual;
  const baseAccuracy = isCorrect ? 0.7 + Math.random() * 0.3 : 0.2 + Math.random() * 0.3;
  return parseFloat((baseAccuracy * confidence).toFixed(2));
};

/**
 * Generates realistic stock prices
 * @param {string} stock - Stock symbol
 * @param {number} [multiplier=1] - Price adjustment multiplier
 * @returns {number} Generated price
 */
const generatePrice = (stock, multiplier = 1) => {
  // Base prices for different stocks
  const basePrices = {
    AAPL: 180,
    MSFT: 300,
    GOOGL: 140,
    AMZN: 120,
    TSLA: 200,
    META: 250,
    NVDA: 500,
    JPM: 150,
    V: 220,
    WMT: 60
  };
  
  const basePrice = basePrices[stock] || 100;
  const variation = 0.9 + Math.random() * 0.2; // 0.9-1.1
  return parseFloat((basePrice * variation * multiplier).toFixed(2));
};

/**
 * Simulates API call to fetch prediction history
 * @returns {Promise<Array<Object>>} Promise resolving to prediction data
 */
export const fetchMockPredictions = async () => {
  return new Promise(resolve => {
    // Simulate network delay with realistic variability
    const delay = 300 + Math.floor(Math.random() * 700); // 300-1000ms
    
    setTimeout(() => {
      const data = generateMockPredictions();
      
      if (import.meta.env.DEV) {
        console.groupCollapsed('[Mock API] Generated prediction history');
        console.log('Sample predictions:', data.slice(0, 5));
        console.groupEnd();
      }
      
      resolve(data);
    }, delay);
  });
};

// Type definition for better IDE support
/**
 * @typedef {Object} Prediction
 * @property {string} id - Unique prediction identifier
 * @property {string} date - ISO timestamp of prediction
 * @property {string} stock_symbol - Stock ticker symbol
 * @property {'up'|'down'|'neutral'} predicted_movement - Predicted direction
 * @property {number} sentiment_score - Sentiment score (-1 to 1)
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} headline - News headline
 * @property {'up'|'down'|'neutral'} actual_movement - Actual movement
 * @property {number} accuracy - Accuracy score (0-1)
 * @property {number} price_at_prediction - Stock price at time of prediction
 * @property {number} current_price - Current stock price
 */