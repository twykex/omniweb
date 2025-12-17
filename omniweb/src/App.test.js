import { render, screen } from '@testing-library/react';

// Mock modules BEFORE importing App
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.reject(new Error("Backend Offline"))),
  post: jest.fn(),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

// Now import App
import App from './App';

test('renders OmniWeb title', async () => {
  render(<App />);
  const titleElement = await screen.findByText(/Omni/i);
  expect(titleElement).toBeInTheDocument();
});

test('shows backend offline message when API fails', async () => {
  render(<App />);
  const errorMsg = await screen.findByText(/Backend Offline/i);
  expect(errorMsg).toBeInTheDocument();
});
