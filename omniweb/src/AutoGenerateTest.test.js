import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import App from './App';
import axios from 'axios';

// Mock Axios
jest.mock('axios');

// Mock React Markdown (ESM module)
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }) => <div className="markdown-content">{children}</div>,
}));

// Mock Framer Motion
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

// Mock TextEncoder/TextDecoder for JSDOM if missing
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock ScrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('Auto Generate Level 2', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default Axios mocks
    axios.get.mockResolvedValue({
      data: {
        models: [
          { name: 'llama3', fits: true, size_bytes: 4e9, size_gb: 4.0 },
          { name: 'mistral', fits: true, size_bytes: 7e9, size_gb: 7.0 }
        ]
      }
    });

    axios.post.mockResolvedValue({
      data: {
        children: [
          { name: "Subtopic 1", desc: "Description 1", status: "concept" },
          { name: "Subtopic 2", desc: "Description 2", status: "entity" }
        ]
      }
    });
  });

  test('Level 2 auto generates after entering word', async () => {
    render(<App />);

    // Wait for models to load
    await waitFor(() => {
        expect(screen.getByText('LLAMA3')).toBeInTheDocument();
    });

    // Enter topic
    const input = screen.getByPlaceholderText(/What do you want to learn today/i);
    fireEvent.change(input, { target: { value: 'Space Exploration' } });

    // Start
    const startBtn = screen.getByText('➜');
    fireEvent.click(startBtn);

    // Verify Level 1 appears
    await waitFor(() => {
      expect(screen.getByText('LEVEL 1')).toBeInTheDocument();
    });

    // We expect Space Exploration to be present. It might be in breadcrumbs too now.
    expect(screen.getAllByText('Space Exploration').length).toBeGreaterThan(0);

    // Verify Level 2 appears AUTOMATICALLY (without clicking)
    await waitFor(() => {
      expect(screen.getByText('LEVEL 2')).toBeInTheDocument();
    }, { timeout: 3000 }); // Give it some time

    expect(screen.getByText('Subtopic 1')).toBeInTheDocument();
  });
});
