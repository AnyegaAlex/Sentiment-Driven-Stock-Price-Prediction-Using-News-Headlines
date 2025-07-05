import React from "react";
import PropTypes from "prop-types";
import { FaChartPie } from "react-icons/fa";
import { cn } from "@/lib/utils";

const BrandNameCard = ({ brandName, logoUrl, className }) => {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-center justify-center",
      "gap-2 sm:gap-3 md:gap-4", 
      className
    )}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
          aria-hidden="true" 
        />
      ) : (
        <FaChartPie 
          className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-400" 
          aria-hidden="true"
        />
      )}
      <h1 className={cn(
        "text-xl sm:text-2xl font-bold",
        "text-gray-800 dark:text-gray-100",
        "whitespace-nowrap"
      )}>
        {brandName}
      </h1>
    </div>
  );
};

BrandNameCard.propTypes = {
  brandName: PropTypes.string.isRequired,
  logoUrl: PropTypes.string,
  className: PropTypes.string,
};

BrandNameCard.defaultProps = {
  brandName: "StockSage",
  logoUrl: null,
  className: "",
};

export default BrandNameCard;