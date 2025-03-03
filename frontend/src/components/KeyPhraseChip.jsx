import React from "react";
import PropTypes from "prop-types";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const KeyPhraseChip = ({ phrase, onClick }) => {
  // Trim and ensure a non-empty string
  const trimmed = phrase.trim();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onClick(trimmed)}
          className="rounded-full bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
          aria-label={`Key phrase: ${trimmed}`}
        >
          {trimmed}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{trimmed}</p>
      </TooltipContent>
    </Tooltip>
  );
};

KeyPhraseChip.propTypes = {
  phrase: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default KeyPhraseChip;
