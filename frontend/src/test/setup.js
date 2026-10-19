// src/test/setup.js
import '@testing-library/jest-dom';
import { expect, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// ============================================================================
// Global Browser API Mocks (required by Radix UI, Recharts, etc.)
// ============================================================================

beforeAll(() => {
  // matchMedia — used by Radix for dark mode detection
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // IntersectionObserver — used by Radix Tooltip, Toast
  window.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // ResizeObserver — used by Recharts, Radix ScrollArea
  window.ResizeObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // scrollTo — used by various components
  window.scrollTo = vi.fn();
});

// ============================================================================
// Third-party Library Mocks
// ============================================================================

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  BrowserTracing: vi.fn(),
  Replay: vi.fn(),
}));

vi.mock('react-ga4', () => ({
  default: {
    initialize: vi.fn(),
    send: vi.fn(),
    event: vi.fn(),
  },
}));

// ============================================================================
// Cleanup
// ============================================================================

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});