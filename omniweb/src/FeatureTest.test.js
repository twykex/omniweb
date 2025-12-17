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

// Mock ReadableStream for fetch
const mockReadableStream = (text) => {
  const encoder = new TextEncoder();
  const uint8array = encoder.encode(text);
  return {
    getReader: () => {
      let done = false;
      return {
        read: () => {
          if (done) return Promise.resolve({ value: undefined, done: true });
          done = true;
          return Promise.resolve({ value: uint8array, done: false });
        }
      };
    }
  };
};

describe('OmniWeb Feature Tests', () => {
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

    // Mock fetch for analyze (streaming)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: mockReadableStream(JSON.stringify({ response: "This is a **mocked** lesson content." }))
    });
  });

  test('Complete user journey: Start -> Expand -> Explain -> Copy', async () => {
    render(<App />);

    // 1. Check Initial Load
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'h1' && content.includes('Omni');
      })).toBeInTheDocument();
    });

    // Verify models loaded and Llama3 selected (smart selection)
    await waitFor(() => {
        expect(screen.getByText('LLAMA3')).toBeInTheDocument();
    });

    // 2. Start Learning
    const input = screen.getByPlaceholderText(/What do you want to learn today/i);
    fireEvent.change(input, { target: { value: 'Artificial Intelligence' } });

    const startBtn = screen.getByLabelText('Start Learning');
    fireEvent.click(startBtn);

    // Verify workspace
    await waitFor(() => {
      expect(screen.getByText('LEVEL 1')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Artificial Intelligence').length).toBeGreaterThan(0);

    // 3. Expand Node
    // Auto-expansion happens, so Level 2 should appear automatically.

    // Verify new column appears
    await waitFor(() => {
      expect(screen.getByText('LEVEL 2')).toBeInTheDocument();
    });
    expect(screen.getByText('Subtopic 1')).toBeInTheDocument();
    expect(screen.getByText('Subtopic 2')).toBeInTheDocument();

    // 4. Open Lesson (Deep Dive)
    // Find the "Explain" button. It should be visible since the node is active.
    const explainBtn = screen.getAllByText('Explain')[0];
    fireEvent.click(explainBtn);

    // Verify Lesson Panel
    await waitFor(() => {
      expect(screen.getByText('LEARNING MODULE')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Artificial Intelligence').length).toBeGreaterThan(0);

    // Wait for content to stream in
    await waitFor(() => {
        // Since we mocked react-markdown to just render children in a div with class markdown-content
        // We look for text inside that.
        // The mock stream returns JSON: { response: "This is a **mocked** lesson content." }
        // Wait, App.js logic for streaming:
        // const json_obj = json.loads(line.decode('utf-8'))
        // chunk = json_obj.get("response", "")
        // So the stream should yield bytes that decode to JSON string.
        // My mockReadableStream returns bytes of the whole JSON string.
        // So it should work if it mimics one chunk.
        expect(screen.getByText(/This is a/)).toBeInTheDocument();
    });

    // 5. Copy Text
    // Mock navigator.clipboard.writeText
    const writeTextMock = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const copyBtn = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();

    // Check Toast
    expect(screen.getByText('Lesson text copied to clipboard')).toBeInTheDocument();

    // 6. Close Lesson
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('LEARNING MODULE')).not.toBeInTheDocument();
    });
  });

  test('Shows warning toast when expansion returns no children', async () => {
    // Mock next expand to return empty (for the auto-expansion)
    axios.post.mockResolvedValueOnce({
      data: { children: [] }
    });

    render(<App />);

    // Wait for models to load
    await waitFor(() => expect(screen.getByText('LLAMA3')).toBeInTheDocument());

    // Start
    const input = screen.getByPlaceholderText(/What do you want to learn today/i);
    fireEvent.change(input, { target: { value: 'Empty Topic' } });
    fireEvent.click(screen.getByLabelText('Start Learning'));

    // Wait for workspace and toast
    await waitFor(() => {
        expect(screen.getByText('Could not expand this topic. Try again.')).toBeInTheDocument();
    });
  });
});
