import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const StockChart = ({ stockData }) => {
  return (
    <LineChart width={800} height={700} data={stockData}>
      <CartesianGrid stroke="#ccc" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="close_price" stroke="#8884d8" />
    </LineChart>
  );
};

export default StockChart;
