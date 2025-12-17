import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';
import axios from 'axios';

// --- MOCKS ---

// Mock Axios (uses __mocks__/axios.js)
jest.mock('axios');

// Mock Global Fetch (used in Redesign branch logic fallback or specific components)
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ models: [{ name: 'llama3', fits: true }] }),
  })
);

// Mock Framer Motion to avoid animation timeouts/errors in tests
jest.mock('framer-motion', () => {
  const filterProps = (props) => {
    const {
      initial, animate, exit, variants, transition, layout, layoutId,
      onHoverStart, onHoverEnd, onTap, whileHover, whileTap,
      ...validProps
    } = props;
    return validProps;
  };

  return {
    motion: {
      div: ({ children, ...props }) => <div {...filterProps(props)}>{children}</div>,
      h1: ({ children, ...props }) => <h1 {...filterProps(props)}>{children}</h1>,
      p: ({ children, ...props }) => <p {...filterProps(props)}>{children}</p>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

// Mock React Markdown
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="markdown">{children}</div>,
}));

// --- TESTS ---

describe('App Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default success mock
    axios.get.mockResolvedValue({ data: { models: [{ name: 'llama3', fits: true }] } });
  });

  test('renders landing page initially', async () => {
    render(<App />);

    // Check for hero title
    expect(await screen.findByText(/Omni/i)).toBeInTheDocument();
    expect(screen.getByText(/The Infinite Learning Engine/i)).toBeInTheDocument();

    // Check for search input (Updated placeholder from Redesign branch)
    expect(screen.getByPlaceholderText(/What do you want to learn today/i)).toBeInTheDocument();

    // Check for feature cards (from Redesign branch)
    expect(screen.getByText(/Infinite Recursion/i)).toBeInTheDocument();
  });

  test('transitions to workspace on start', async () => {
    render(<App />);

    // Wait for models to load and input to appear
    const input = await screen.findByPlaceholderText(/What do you want to learn today/i);

    // Type in a topic
    fireEvent.change(input, { target: { value: 'Quantum Physics' } });

    // Click start button (using the arrow button)
    const startBtn = screen.getByText('➜');
    fireEvent.click(startBtn);

    // Verify workspace elements appear
    expect(await screen.findByText(/LEVEL 1/i)).toBeInTheDocument();

    // Verify the initial node is present
    expect(screen.getByText('Quantum Physics')).toBeInTheDocument();
  });

  test('shows backend offline message when API fails', async () => {
    // Override the default mock for this specific test
    axios.get.mockRejectedValueOnce(new Error("Backend Offline"));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(<App />);
    
      // We expect the error state from the main branch logic
      const errorMsg = await screen.findByText(/Backend Offline/i);
      expect(errorMsg).toBeInTheDocument();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
