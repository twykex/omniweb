import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import App from './App';
import axios from 'axios';

jest.mock('axios');

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock React Markdown
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="markdown">{children}</div>,
}));

// Polyfill TextEncoder if missing (common in some jest environments)
if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = require('util').TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
    global.TextDecoder = require('util').TextDecoder;
}

describe('Quiz Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        axios.get.mockResolvedValue({ data: { models: [{ name: 'llama3', fits: true }] } });
        axios.post.mockImplementation((url) => {
             if (url.endsWith('/expand')) {
                 return Promise.resolve({ data: { children: [{ name: 'Subtopic', desc: 'Desc', status: 'concept' }] } });
             }
             return Promise.reject(new Error('Unknown URL'));
        });
    });

    test('renders quiz and handles interaction', async () => {
        // Mock quiz JSON
        const mockQuizJSON = JSON.stringify({
            questions: [
                {
                    question: "What is 2+2?",
                    options: ["3", "4", "5", "6"],
                    correct_index: 1,
                    explanation: "2 plus 2 equals 4."
                }
            ]
        });

        // Mock fetch for the streaming response
        global.fetch = jest.fn((url, options) => {
            if (url.includes('/analyze') && options.body.includes('"mode":"quiz"')) {
                return Promise.resolve({
                    ok: true,
                    body: {
                        getReader: () => {
                            const encoder = new TextEncoder();
                            const stream = encoder.encode(mockQuizJSON);
                            let read = false;
                            return {
                                read: () => {
                                    if (read) return Promise.resolve({ done: true, value: undefined });
                                    read = true;
                                    return Promise.resolve({ done: false, value: stream });
                                }
                            };
                        }
                    }
                });
            }
             // For other modes or initial fetch if any
             return Promise.resolve({
                ok: true,
                body: {
                    getReader: () => {
                         return { read: () => Promise.resolve({ done: true, value: undefined }) };
                    }
                }
             });
        });

        render(<App />);

        // Start
        const input = await screen.findByPlaceholderText(/What do you want to learn today/i);
        fireEvent.change(input, { target: { value: 'Math' } });
        fireEvent.click(screen.getByLabelText('Start Learning'));

        // Wait for workspace
        await waitFor(() => expect(screen.getAllByText('Math').length).toBeGreaterThan(0));

        // Click Quiz action
        const quizBtn = await screen.findByText('Quiz');
        fireEvent.click(quizBtn);

        // Wait for config and start
        const startBtn = await screen.findByText('START QUIZ');
        fireEvent.click(startBtn);

        // Expect loading state first
        // Note: The loading state might flicker very fast because our mock stream is instant.
        // But we should see "GENERATING QUIZ..." or the quiz content eventually.

        // Wait for quiz content
        await waitFor(() => {
             expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
        });

        expect(screen.getByText('Question 1 of 1')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();

        // Click correct answer
        fireEvent.click(screen.getByText('4'));

        // Check for visual feedback
        expect(screen.getByText('Explanation:')).toBeInTheDocument();
        expect(screen.getByText('2 plus 2 equals 4.')).toBeInTheDocument();

        // Click See Results
        const nextBtn = screen.getByText('See Results');
        fireEvent.click(nextBtn);

        // Check results
        expect(screen.getByText('Quiz Completed!')).toBeInTheDocument();
        expect(screen.getByText('You got 1 out of 1 correct.')).toBeInTheDocument();

        // Retry
        fireEvent.click(screen.getByText('RETRY SAME QUESTIONS'));
        expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });
});
