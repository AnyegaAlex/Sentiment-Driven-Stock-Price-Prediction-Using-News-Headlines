import React from 'react';
import PropTypes from 'prop-types';

// Shared link classes copied verbatim from the original legal pages.
const LINK_CLASS = 'text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black';
const BUTTON_CLASS = 'my-2 inline-flex min-h-[40px] items-center rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-900';

/**
 * Renders a canonical legal document (see legal/documents/*.json).
 * The text comes only from the canonical file, which is what the server hashes.
 */
export const LegalDocumentBody = ({ document }) => (
  <>
    {document.blocks.map((block, index) => {
      const key = `${document.document}-${index}`;
      switch (block.type) {
        case 'heading':
          return <h2 key={key}>{block.text}</h2>;
        case 'paragraph':
          return <p key={key}>{block.text}</p>;
        case 'paragraph_with_link':
          return (
            <p key={key}>
              {block.before}{' '}
              <a href={block.link.href} className={LINK_CLASS}>
                {block.link.text}
              </a>
              {block.after}
            </p>
          );
        case 'consent_button':
          return (
            <button
              key={key}
              type="button"
              onClick={() => window.dispatchEvent(new Event(block.event))}
              className={BUTTON_CLASS}
            >
              {block.label}
            </button>
          );
        default:
          throw new Error(`Unknown legal block type: ${block.type}`);
      }
    })}
  </>
);

LegalDocumentBody.propTypes = {
  document: PropTypes.shape({
    document: PropTypes.string.isRequired,
    version: PropTypes.string.isRequired,
    blocks: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};

export default LegalDocumentBody;
