/**
 * Enterprise Test Setup
 * 
 * Extended setup for enterprise-grade testing with additional
 * matchers, mocks, and configuration.
 */
import "@testing-library/jest-dom/vitest";
import { vi, expect, beforeAll, afterAll, afterEach } from "vitest";

// Mock crypto for consistent test runs
Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: () => "00000000-0000-0000-0000-000000000000",
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// Extend matchers
declare module "vitest" {
  interface Assertion<T = any> {
    toBeWithinRange(floor: number, ceiling: number): T;
  }
}

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number): { message: () => string; pass: boolean } {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test utilities
declare global {
  var testUtils: {
    createMockDate: (isoString: string) => Date;
    resetMocks: () => void;
    mockConsole: () => void;
  };
}

globalThis.testUtils = {
  createMockDate: (isoString: string) => {
    const mockDate = new Date(isoString);
    vi.setSystemTime(mockDate);
    return mockDate;
  },

  resetMocks: () => {
    vi.clearAllMocks();
    vi.useRealTimers();
  },

  mockConsole: () => {
    const originalConsole = { ...console };
    beforeAll(() => {
      console.log = vi.fn();
      console.error = vi.fn();
      console.warn = vi.fn();
    });
    afterAll(() => {
      Object.assign(console, originalConsole);
    });
  },
};

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});
