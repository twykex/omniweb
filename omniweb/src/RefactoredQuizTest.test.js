import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import App from './App';
import axios from 'axios';

jest.mock('axios');

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, layout, layoutId, whileHover, whileTap, initial, animate, exit, transition, ...props }) => <div {...props}>{children}</div>,
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

// Polyfill TextEncoder
if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = require('util').TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
    global.TextDecoder = require('util').TextDecoder;
}

describe('Refactored Quiz Features', () => {
    beforeEach(() => {
        window.HTMLElement.prototype.scrollIntoView = jest.fn(); // Mock scrollIntoView
        jest.clearAllMocks();
        jest.useFakeTimers(); // Enable fake timers
        axios.get.mockResolvedValue({ data: { models: [{ name: 'llama3', fits: true }] } });
        axios.post.mockImplementation((url) => {
             if (url.endsWith('/expand')) {
                 return Promise.resolve({ data: { children: [{ name: 'Subtopic', desc: 'Desc', status: 'concept' }] } });
             }
             return Promise.reject(new Error('Unknown URL'));
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const mockQuizJSON = JSON.stringify({
        questions: [
            {
                question: "Q1",
                options: ["OptionA", "OptionB", "OptionC", "OptionD"],
                correct_index: 0, // OptionA
                explanation: "Exp1"
            },
            {
                question: "Q2",
                options: ["OptionE", "OptionF", "OptionG", "OptionH"],
                correct_index: 1, // OptionF
                explanation: "Exp2"
            }
        ]
    });

    const setupQuiz = async () => {
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
             return Promise.resolve({
                ok: true,
                body: {
                    getReader: () => {
                         return { read: () => Promise.resolve({ done: true, value: undefined }) };
                    }
                }
             });
        });

        await act(async () => {
             render(<App />);
        });

        const input = await screen.findByPlaceholderText(/What do you want to learn today/i);
        fireEvent.change(input, { target: { value: 'Test' } });

        await act(async () => {
             fireEvent.click(screen.getByText('➜'));
        });

        const node = await screen.findByText('Test');

        await act(async () => {
             fireEvent.click(node);
        });

        const quizBtn = await screen.findByText('Quiz');

        await act(async () => {
             fireEvent.click(quizBtn);
        });

        // Config screen should appear.
        const startBtn = await screen.findByText('START QUIZ');

        await act(async () => {
             fireEvent.click(startBtn);
        });

        await screen.findByText('Q1');
    };

    test('timer decrements and triggers timeout', async () => {
        await setupQuiz();

        expect(screen.getByText('30s')).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(screen.getByText('29s')).toBeInTheDocument();

        // Fast forward near timeout
        act(() => {
            jest.advanceTimersByTime(29000);
        });

        // Timer should be at 0 but maybe not triggered yet if it triggers on next tick
        expect(screen.getByText('0s')).toBeInTheDocument();

        // Trigger timeout
        act(() => {
            jest.advanceTimersByTime(2000);
        });

        // Should show result due to timeout
        await screen.findByText('Explanation:');

        // Check for 0 streak
        expect(screen.getByText('🔥 0')).toBeInTheDocument();

        // Continue to verify timeout recording
        fireEvent.click(screen.getByText('Next Question'));

        // Answer Q2 correctly to finish
        fireEvent.click(screen.getByText('OptionF'));
        fireEvent.click(screen.getByText('See Results'));

        expect(screen.getByText('Quiz Completed!')).toBeInTheDocument();
        expect(screen.getByText('⏱️ Timed Out')).toBeInTheDocument();
    });

    test('streak increments on correct answer', async () => {
        await setupQuiz();
        expect(screen.getByText('🔥 0')).toBeInTheDocument();

        // Q1 Correct is OptionA (index 0)
        fireEvent.click(screen.getByText('OptionA'));

        expect(screen.getByText('🔥 1')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Next Question'));

        // Q2 Correct is OptionF (index 1)
        fireEvent.click(screen.getByText('OptionF'));

        expect(screen.getByText('🔥 2')).toBeInTheDocument();
    });

    test('streak resets on wrong answer', async () => {
        await setupQuiz();

        // Q1 Correct is OptionA
        fireEvent.click(screen.getByText('OptionA'));
        expect(screen.getByText('🔥 1')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Next Question'));

        // Q2 Wrong is OptionE
        fireEvent.click(screen.getByText('OptionE'));

        expect(screen.getByText('🔥 0')).toBeInTheDocument();
    });

    test('new quiz button appears at end', async () => {
        await setupQuiz();
        // Answer Q1
        fireEvent.click(screen.getByText('OptionA'));
        fireEvent.click(screen.getByText('Next Question'));
        // Answer Q2
        fireEvent.click(screen.getByText('OptionF'));
        fireEvent.click(screen.getByText('See Results'));

        expect(screen.getByText('GENERATE NEW QUIZ')).toBeInTheDocument();
    });
});
