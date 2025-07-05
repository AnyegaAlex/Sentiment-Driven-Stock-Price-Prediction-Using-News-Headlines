import React, { memo, useCallback } from "react";
import PropTypes from "prop-types";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const KeyPhraseChip = ({ phrase, onClick }) => {
  // Memoize the trimmed phrase and click handler
  const trimmedPhrase = phrase?.trim() || "";
  const handleClick = useCallback(() => {
    onClick(trimmedPhrase);
  }, [onClick, trimmedPhrase]);

  if (!trimmedPhrase) return null;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className={`rounded-full bg-gray-200 dark:bg-gray-700 px-3 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors 
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 truncate max-w-[180px]`}
          aria-label={`Key phrase: ${trimmedPhrase}`}
          disabled={!trimmedPhrase}
        >
          <span className="truncate">{trimmedPhrase}</span>
        </button>
      </TooltipTrigger>
      {trimmedPhrase && (
        <TooltipContent 
          className="max-w-[240px] break-words"
          side="top"
          align="center"
        >
          <p className="text-sm">{trimmedPhrase}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
};

KeyPhraseChip.propTypes = {
  phrase: PropTypes.string,
  onClick: PropTypes.func,
};

KeyPhraseChip.defaultProps = {
  phrase: "",
  onClick: () => {},
};

export default memo(KeyPhraseChip);