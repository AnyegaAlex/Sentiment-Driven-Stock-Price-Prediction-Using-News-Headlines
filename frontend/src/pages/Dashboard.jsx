import React from 'react';
import SentimentChart from '../components/SentimentChart';
import StockChart from '../components/StockChart';
import PredictionTable from '../components/StockPredictionTable';

const Dashboard = () => (
  <div>
    <h1>Sentiment-Driven Stock Price Prediction</h1>
    <SentimentChart />
    <StockChart />
    <PredictionTable />
  </div>
);

export default Dashboard;
