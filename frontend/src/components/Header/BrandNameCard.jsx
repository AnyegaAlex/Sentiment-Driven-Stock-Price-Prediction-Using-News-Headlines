// src/components/Header/BrandNameCard.jsx
import React from "react";
import PropTypes from "prop-types";
import { FaChartLine } from "react-icons/fa";

const BrandNameCard = ({ brandName, logoUrl }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-2 space-y-2 sm:space-y-0">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${brandName} logo`}
          className="w-10 h-10 object-contain"
        />
      ) : (
        <FaChartLine className="w-10 h-10 text-blue-500" />
      )}
      <h1 className="text-2xl font-bold text-gray-800">{brandName}</h1>
    </div>
  );
};

BrandNameCard.propTypes = {
  brandName: PropTypes.string.isRequired,
  logoUrl: PropTypes.string,
};

BrandNameCard.defaultProps = {
  brandName: "StockSage",
  logoUrl: null,
};

export default BrandNameCard;
