// src/services/mockNewsData.js

// Configuration constants
const MOCK_ITEM_COUNT = 12;
const DEFAULT_SYMBOL = 'IBM';

// News source database
const MOCK_SOURCES = [
  'Bloomberg', 
  'Reuters', 
  'CNBC', 
  'Wall Street Journal',
  'Financial Times',
  'The Economist',
  'Barron\'s',
  'MarketWatch'
];

// Key phrase categories
const MOCK_KEY_PHRASES = [
  ['earnings report', 'quarterly results', 'profit margin'],
  ['merger', 'acquisition', 'strategic partnership'],
  ['CEO transition', 'leadership change', 'management reshuffle'],
  ['product launch', 'innovation', 'R&D breakthrough'],
  ['regulatory approval', 'lawsuit settlement', 'compliance issue'],
  ['market share', 'competitive landscape', 'industry trends'],
  ['dividend announcement', 'share buyback', 'capital allocation'],
  ['supply chain', 'manufacturing', 'operational update']
];

// Sentiment action words
const COMPANY_ACTIONS = {
  positive: ['surged', 'jumped', 'climbed', 'rallied', 'gained'],
  neutral: ['remained stable', 'traded flat', 'held steady', 'was unchanged'],
  negative: ['plummeted', 'tumbled', 'dropped', 'fell sharply', 'declined']
};

// Image configuration
const IMAGE_SETTINGS = {
  // 30% chance of no image for realism
  noImageProbability: 0.3,
  // Aspect ratios: [width, height]
  aspectRatios: [
    [800, 450], // 16:9
    [600, 400], // 3:2
    [500, 500], // 1:1
    [400, 600]  // 2:3
  ],
  // General finance/business related terms
  financeTerms: [
    'finance', 'stock-market', 'trading', 'business', 'money',
    'investing', 'wall-street', 'economy', 'banking', 'currency',
    'stocks', 'bull-market', 'bear-market', 'crypto', 'bitcoin'
  ],
  // Company-specific terms
  companyTerms: {
    IBM: ['ai', 'server', 'mainframe', 'quantum-computer', 'data-center', 'cloud-computing'],
    AAPL: ['iphone', 'macbook', 'apple-store', 'ipad', 'airpods', 'apple-park'],
    MSFT: ['microsoft', 'windows', 'xbox', 'surface-pro', 'azure-cloud'],
    TSLA: ['tesla', 'elon-musk', 'cybertruck', 'model-3', 'gigafactory', 'electric-car'],
    AMZN: ['amazon', 'jeff-bezos', 'warehouse', 'delivery-drone', 'amazon-go', 'kindle'],
    GOOGL: ['google', 'googleplex', 'pixel-phone', 'android', 'chrome'],
    META: ['facebook', 'mark-zuckerberg', 'vr-headset', 'metaverse', 'instagram'],
    NFLX: ['netflix', 'stranger-things', 'tv-show', 'movie-theater', 'film'],
    NVDA: ['nvidia', 'gpu', 'graphics-card', 'ai-chip', 'deep-learning']
  }
};

/**
 * Gets random stock-related images from Unsplash
 * @param {string} symbol - Stock ticker symbol
 * @param {number} index - Item index for unique seed
 * @returns {string|null} Image URL or null
 */
const getStockImage = (symbol, index) => {
  // Skip images based on probability
  if (Math.random() < IMAGE_SETTINGS.noImageProbability) return null;

  // Get relevant terms for the symbol or default to general finance terms
  const terms = IMAGE_SETTINGS.companyTerms[symbol] || IMAGE_SETTINGS.financeTerms;
  
  // Randomly select 1-2 terms to combine
  const selectedTerms = [];
  const termCount = Math.random() > 0.7 ? 2 : 1;
  for (let i = 0; i < termCount; i++) {
    const randomTerm = terms[Math.floor(Math.random() * terms.length)];
    if (!selectedTerms.includes(randomTerm)) {
      selectedTerms.push(randomTerm);
    }
  }

  // Add the company name/symbol for relevance (50% chance)
  if (Math.random() > 0.5) {
    selectedTerms.push(symbol.toLowerCase());
  }

  // Select random aspect ratio
  const [width, height] = IMAGE_SETTINGS.aspectRatios[
    Math.floor(Math.random() * IMAGE_SETTINGS.aspectRatios.length)
  ];

  // Use index and random seed for variety
  const seed = Math.floor(Math.random() * 1000) + index;

  return `https://source.unsplash.com/random/${width}x${height}/?${selectedTerms.join(',')}&sig=${seed}`;
};

/**
 * Generates a realistic stock news headline based on sentiment
 * @param {string} symbol - Stock ticker symbol
 * @param {'positive'|'neutral'|'negative'} sentiment - Article sentiment
 * @returns {string} Generated headline
 */
const generateHeadline = (symbol, sentiment) => {
  const percentChange = (Math.random() * 8 + 2).toFixed(2);
  const action = COMPANY_ACTIONS[sentiment][Math.floor(Math.random() * COMPANY_ACTIONS[sentiment].length)];
  
  const templates = {
    positive: [
      `${symbol} ${action} ${percentChange}% on ${['strong earnings', 'upgraded guidance', 'analyst upgrade'][Math.floor(Math.random() * 3)]}`,
      `${symbol} ${action} after announcing new ${['AI', 'blockchain', 'cloud computing'][Math.floor(Math.random() * 3)]} initiative`,
      `Analysts bullish on ${symbol} after ${['product launch', 'strategic acquisition', 'partnership'][Math.floor(Math.random() * 3)]}`,
      `${symbol} reaches ${['all-time high', '52-week high', 'record high'][Math.floor(Math.random() * 3)]}`
    ],
    neutral: [
      `${symbol} holds investor day, outlines ${['3-year', '5-year', 'long-term'][Math.floor(Math.random() * 3)]} strategy`,
      `${symbol} appoints new ${['CFO', 'CTO', 'COO'][Math.floor(Math.random() * 3)]} from ${['Google', 'Amazon', 'Microsoft'][Math.floor(Math.random() * 3)]}`,
      `${symbol} shares ${action} in ${['mixed', 'volatile', 'sideways'][Math.floor(Math.random() * 3)]} market trading`,
      `${symbol} completes ${['acquisition', 'divestiture', 'spin-off'][Math.floor(Math.random() * 3)]} of ${['non-core assets', 'subsidiary', 'business unit'][Math.floor(Math.random() * 3)]}`
    ],
    negative: [
      `${symbol} ${action} ${percentChange}% on ${['weak guidance', 'regulatory concerns', 'short seller report'][Math.floor(Math.random() * 3)]}`,
      `${symbol} faces ${['class action lawsuit', 'SEC investigation', 'product recall'][Math.floor(Math.random() * 3)]}`,
      `Institutional investors reducing positions in ${symbol}`,
      `${symbol} downgraded by ${['Goldman Sachs', 'Morgan Stanley', 'JPMorgan'][Math.floor(Math.random() * 3)]}`
    ]
  };

  return templates[sentiment][Math.floor(Math.random() * templates[sentiment].length)];
};

/**
 * Generates a realistic news article summary
 * @param {string} symbol - Stock ticker symbol
 * @param {'positive'|'neutral'|'negative'} sentiment - Article sentiment
 * @returns {string} Generated summary
 */
const generateSummary = (symbol, sentiment) => {
  const summaries = {
    positive: [
      `${symbol} shares rose significantly after reporting better-than-expected results, with revenue growing ${Math.floor(Math.random() * 15) + 10}% year-over-year. Analysts believe this momentum could continue through the next quarter.`,
      `Market participants reacted positively to ${symbol}'s latest announcement, with several analysts raising their price targets. The company's innovative approach appears to be gaining traction in the market.`,
      `${symbol}'s strategic initiatives are paying off, according to industry experts. The company's ${['market share', 'profit margins', 'revenue growth'][Math.floor(Math.random() * 3)]} shows marked improvement over previous quarters.`
    ],
    neutral: [
      `${symbol} made headlines today with its latest corporate announcement. While the news didn't significantly move the stock price, analysts will be watching closely for follow-up developments.`,
      `In a ${['press release', 'regulatory filing', 'investor presentation'][Math.floor(Math.random() * 3)]}, ${symbol} outlined its ${['plans', 'strategy', 'vision'][Math.floor(Math.random() * 3)]} for the coming ${['quarter', 'year', 'three years'][Math.floor(Math.random() * 3)]}.`,
      `The market showed limited reaction to ${symbol}'s latest news, with shares trading in line with the broader sector. Analysts remain divided on the company's near-term prospects.`
    ],
    negative: [
      `${symbol} shares came under pressure following disappointing ${['earnings', 'guidance', 'clinical trial results'][Math.floor(Math.random() * 3)]}. Several analysts have lowered their ratings in response.`,
      `Investors expressed concern about ${symbol}'s ${['outlook', 'financial position', 'management decisions'][Math.floor(Math.random() * 3)]}, sending shares lower amid heavy trading volume.`,
      `Following ${symbol}'s recent announcement, ${['short sellers', 'regulators', 'activist investors'][Math.floor(Math.random() * 3)]} have taken increased interest in the company, creating uncertainty.`
    ]
  };

  return summaries[sentiment][Math.floor(Math.random() * summaries[sentiment].length)];
};

/**
 * Generates a more natural sentiment distribution
 * @param {number} index - Item index in the array
 * @param {number} totalItems - Total number of items being generated
 * @returns {'positive'|'neutral'|'negative'} Generated sentiment
 */
const getDynamicSentiment = (index, totalItems) => {
  const position = index / totalItems;
  if (position < 0.4) return 'positive';  // 40% positive
  if (position < 0.7) return 'neutral';   // 30% neutral
  return 'negative';                      // 30% negative
};

/**
 * Generates realistic publication dates
 * @param {number} index - Item index in the array
 * @param {number} totalItems - Total number of items being generated
 * @returns {string} ISO date string
 */
const generateDate = (index, totalItems) => {
  // Stagger dates over the past 7 days (newest first)
  const daysAgo = Math.floor((index / totalItems) * 7);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  
  // Set random time during market hours (9:30 AM - 4:00 PM)
  const marketHour = 9 + Math.floor(Math.random() * 6); // 9 AM - 3 PM
  const minute = Math.floor(Math.random() * 60);
  date.setHours(marketHour, minute, 0);
  
  return date.toISOString();
};

/**
 * Validates generated mock items
 * @param {Object} item - Generated news item
 * @returns {boolean} True if valid
 */
const validateNewsItem = (item) => {
  const requiredFields = ['id', 'title', 'summary', 'sentiment', 'symbol', 'date'];
  return requiredFields.every(field => item[field] && typeof item[field] === 'string');
};

/**
 * Generates mock news data for a given stock symbol
 * @param {string} [symbol='IBM'] - Stock ticker symbol
 * @returns {Array<Object>} Array of mock news items
 */
export const generateMockNews = (symbol = DEFAULT_SYMBOL) => {
  const stockSymbol = (symbol || DEFAULT_SYMBOL).toUpperCase();
  
  return Array.from({ length: MOCK_ITEM_COUNT }, (_, i) => {
    const sentiment = getDynamicSentiment(i, MOCK_ITEM_COUNT);
    const confidence = Math.floor(Math.random() * 20) + 75; // 75-95% confidence
    
    const item = {
      id: `mock-${stockSymbol}-${i}-${Date.now()}`,
      title: generateHeadline(stockSymbol, sentiment),
      summary: generateSummary(stockSymbol, sentiment),
      source: MOCK_SOURCES[i % MOCK_SOURCES.length],
      date: generateDate(i, MOCK_ITEM_COUNT),
      url: `https://${MOCK_SOURCES[i % MOCK_SOURCES.length].toLowerCase().replace(/\s+/g, '')}.com/${stockSymbol}-news-${i}`,
      sentiment,
      confidence,
      keyPhrases: MOCK_KEY_PHRASES[i % MOCK_KEY_PHRASES.length],
      image: getStockImage(stockSymbol, i),
      symbol: stockSymbol
    };

    if (!validateNewsItem(item)) {
      console.warn('Generated invalid mock item:', item);
      return generateFallbackItem(stockSymbol);
    }
    
    return item;
  });
};

/**
 * Fallback item generator for validation failures
 * @param {string} symbol - Stock ticker symbol
 * @returns {Object} Simple valid news item
 */
const generateFallbackItem = (symbol) => ({
  id: `fallback-${symbol}-${Date.now()}`,
  title: `${symbol} Company News Update`,
  summary: `This is a standard news update about ${symbol}.`,
  source: 'Financial News Network',
  date: new Date().toISOString(),
  url: `https://example.com/${symbol}-news`,
  sentiment: 'neutral',
  confidence: 85,
  keyPhrases: ['update', 'news', 'information'],
  image: null,
  symbol
});

/**
 * Simulates API call to fetch mock news
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Array<Object>>} Promise resolving to mock news data
 */
export const fetchMockNews = async (symbol) => {
  const startTime = performance.now();
  
  return new Promise(resolve => {
    // Simulate network delay (200-800ms)
    const delay = 200 + Math.floor(Math.random() * 600);
    
    setTimeout(() => {
      const data = generateMockNews(symbol);
      
      if (import.meta.env.DEV) {
        console.groupCollapsed(`[Mock API] Generated ${data.length} news items for ${symbol}`);
        console.log('Sample items:', data.slice(0, 3));
        console.log(`Generation time: ${performance.now() - startTime}ms`);
        console.groupEnd();
      }
      
      resolve(data);
    }, delay);
  });
};

// JSDoc type definition for better IDE support
/**
 * @typedef {Object} NewsItem
 * @property {string} id - Unique item identifier
 * @property {string} title - News headline
 * @property {string} summary - News summary content
 * @property {string} source - News publication source
 * @property {string} date - ISO date string
 * @property {string} url - URL to full article
 * @property {'positive'|'neutral'|'negative'} sentiment - Sentiment classification
 * @property {number} confidence - Confidence score (0-100)
 * @property {Array<string>} keyPhrases - Key phrases extracted from article
 * @property {string|null} image - URL to article image or null
 * @property {string} symbol - Stock ticker symbol
 */