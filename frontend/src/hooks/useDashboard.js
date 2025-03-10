// src/hooks/useDashboard.js
import { useContext } from "react";
import DashboardContext from "../context/DashboardContext";

const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};

export default useDashboard;
