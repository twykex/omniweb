import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import React from 'react';

// Mock fetch
global.fetch = jest.fn();

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock react-markdown
jest.mock('react-markdown', () => ({ children }) => <div data-testid="markdown">{children}</div>);

describe('App Integration', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders landing page initially', async () => {
    // Mock successful models response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: ['llama3', 'gpt-4'] }),
    });

    render(<App />);

    // Check for hero title
    expect(await screen.findByText(/Omni/i)).toBeInTheDocument();
    expect(screen.getByText(/The Infinite Learning Engine/i)).toBeInTheDocument();

    // Check for search input
    expect(screen.getByPlaceholderText(/What do you want to learn today/i)).toBeInTheDocument();

    // Check for feature cards
    expect(screen.getByText(/Infinite Recursion/i)).toBeInTheDocument();
  });

  test('transitions to workspace on start', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: ['llama3'] }),
    });

    render(<App />);

    // Wait for models to load
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
});
