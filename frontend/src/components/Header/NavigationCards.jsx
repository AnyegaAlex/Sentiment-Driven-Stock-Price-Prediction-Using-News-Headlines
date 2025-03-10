// src/components/Header/NavigationCards.jsx
import React from "react";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";

const NavigationCards = ({ navItems }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="w-full border-t pt-2">
      <div className="flex flex-col md:flex-row items-center justify-center gap-2">
        {navItems.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => navigate(tab.route)}
            variant="ghost"
            className={`flex items-center gap-2 w-full max-w-xs rounded-lg transition-colors ${
              location.pathname.includes(tab.id)
                ? "bg-blue-100 text-blue-600 font-semibold"
                : "bg-transparent text-gray-600 hover:bg-gray-100"
            }`}
            aria-current={location.pathname.includes(tab.id) ? "page" : undefined}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
};

NavigationCards.propTypes = {
  navItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      route: PropTypes.string.isRequired,
      icon: PropTypes.node,
    })
  ).isRequired,
};

export default NavigationCards;
