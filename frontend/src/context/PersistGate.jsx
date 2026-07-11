// src/context/PersistGate.jsx
import React from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import { useLocalStorage } from "@/hooks/useStorage";

export const PersistGate = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Single source of truth key (JSON-backed via hook)
  const [lastViewedSymbol] = useLocalStorage("lastViewedSymbol", "");

  React.useEffect(() => {
    // Only auto-redirect when user is on "/" or "/dashboard"
    // Never override other pages like /news-analysis, /prediction-history.
    const path = location.pathname;

    const isLanding =
      path === "/" ||
      path === "/dashboard" ||
      path === "/dashboard/";

    if (!isLanding) return;
    if (!lastViewedSymbol) return;

    navigate(`/dashboard/${encodeURIComponent(lastViewedSymbol)}`, { replace: true });
  }, [lastViewedSymbol, location.pathname, navigate]);

  return <>{children}</>;
};

PersistGate.propTypes = {
  children: PropTypes.node.isRequired,
};