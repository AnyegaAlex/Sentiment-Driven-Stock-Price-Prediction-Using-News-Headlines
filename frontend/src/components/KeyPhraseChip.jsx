import React, { memo, useCallback } from "react";
import PropTypes from "prop-types";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const KeyPhraseChip = ({ phrase = "", onClick = () => {} }) => {
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
          className={cn(
            "rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300",
            "hover:bg-gray-700 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
            "truncate max-w-[180px] min-h-[32px]"
          )}
          aria-label={`Key phrase: ${trimmedPhrase}`}
          disabled={!trimmedPhrase}
        >
          <span className="truncate">{trimmedPhrase}</span>
        </button>
      </TooltipTrigger>
      {trimmedPhrase && (
        <TooltipContent
          className="max-w-[240px] break-words border border-gray-800 bg-gray-900 text-white"
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

export default memo(KeyPhraseChip);