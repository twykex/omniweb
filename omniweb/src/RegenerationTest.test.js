import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import App from './App';
import axios from 'axios';

// Mock Axios
jest.mock('axios');

// Mock framer-motion
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
  default: ({ children }) => <div>{children}</div>,
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('Regeneration Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: { models: [{ name: 'llama3', fits: true }] } });
  });

  test('passes seen nodes to recent_nodes when regenerating', async () => {
    render(<App />);

    // 1. Start App
    const input = await screen.findByPlaceholderText(/What do you want to learn/i);
    fireEvent.change(input, { target: { value: 'Start' } });
    fireEvent.click(screen.getByText('➜'));

    // Wait for Level 1
    await screen.findByText('LEVEL 1');
    const startNode = screen.getByText('Start');

    // 2. Expand "Start"
    // Mock expansion response
    axios.post.mockResolvedValueOnce({
      data: {
        children: [
          { name: 'Topic A', desc: 'Desc A', status: 'concept' },
          { name: 'Topic B', desc: 'Desc B', status: 'concept' }
        ]
      }
    });

    fireEvent.click(startNode);

    // Wait for Level 2
    await screen.findByText('LEVEL 2');
    expect(screen.getByText('Topic A')).toBeInTheDocument();
    expect(screen.getByText('Topic B')).toBeInTheDocument();

    // 3. Regenerate Level 2
    // Mock regeneration response
    axios.post.mockResolvedValueOnce({
      data: {
        children: [
          { name: 'Topic C', desc: 'Desc C', status: 'concept' }
        ]
      }
    });

    const regenButton = screen.getByTestId('regenerate-btn');
    fireEvent.click(regenButton);

    // Wait for regeneration
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));

    // 4. Verify the second call payload
    const secondCall = axios.post.mock.calls[1];
    const payload = secondCall[1];

    // recent_nodes should include:
    // - "Start" (parent node)
    // - "Topic A", "Topic B" (current level seen nodes)

    const recentNodes = payload.recent_nodes;
    // console.log('Recent Nodes:', recentNodes);

    expect(recentNodes).toContain('Topic A');
    expect(recentNodes).toContain('Topic B');
    expect(recentNodes).toContain('Start');
  });
});
