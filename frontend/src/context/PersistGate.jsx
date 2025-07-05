// src/context/PersistGate.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { useLocalStorage } from '@/hooks/useStorage';

export const PersistGate = ({ children }) => {
  const [lastSymbol] = useLocalStorage('lastViewedSymbol', '');
  
  // Sync symbol with URL if needed
  React.useEffect(() => {
     // Only redirect if we have a valid symbol
     if (lastSymbol && !window.location.pathname.includes('/dashboard/')) {
      window.history.replaceState(null, '', `/dashboard/${lastSymbol}`);
    }
  }, [lastSymbol]);

  return <>{children}</>;
};

PersistGate.propTypes = {
  children: PropTypes.node.isRequired
};