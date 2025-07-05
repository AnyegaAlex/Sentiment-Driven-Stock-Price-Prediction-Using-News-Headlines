import React from "react";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils"; // Assuming you have a classnames utility

const NavigationCards = ({ navItems, className }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Helper function to determine if tab is active
  const isActiveTab = (tab) => {
    return location.pathname === tab.route || 
           location.pathname.startsWith(`${tab.route}/`);
  };

  return (
    <nav 
      className={cn("w-full border-t dark:border-gray-700 pt-2", className)}
      aria-label="Secondary navigation"
    >
      <div className="flex flex-col md:flex-row items-center justify-center gap-2">
        {navItems.map((tab) => {
          const isActive = isActiveTab(tab);
          return (
            <Button
              key={tab.id}
              onClick={() => navigate(tab.route)}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "flex items-center gap-2 w-full md:w-auto justify-center md:justify-start",
                "rounded-lg transition-colors px-4 py-2",
                "hover:bg-gray-100 dark:hover:bg-gray-700",
                {
                  "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 font-semibold": isActive,
                  "text-gray-600 dark:text-gray-300": !isActive
                }
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span className="whitespace-nowrap">{tab.name}</span>
            </Button>
          );
        })}
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
  className: PropTypes.string,
};

NavigationCards.defaultProps = {
  className: "",
};

export default NavigationCards;