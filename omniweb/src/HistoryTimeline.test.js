import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { HistoryTimeline } from './HistoryTimeline';

test('renders history timeline with valid json', async () => {
  const jsonString = JSON.stringify([
    { year: "1900", title: "Event 1", description: "Desc 1" },
    { year: "2000", title: "Event 2", description: "Desc 2" }
  ]);

  render(<HistoryTimeline jsonString={jsonString} />);

  await waitFor(() => {
    expect(screen.getByText("1900")).toBeInTheDocument();
    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.getByText("Desc 1")).toBeInTheDocument();
    expect(screen.getByText("2000")).toBeInTheDocument();
    expect(screen.getByText("Event 2")).toBeInTheDocument();
  });
});

test('handles invalid json gracefully', async () => {
  render(<HistoryTimeline jsonString="invalid json" />);

  await waitFor(() => {
    expect(screen.getByText(/Failed to load timeline data/i)).toBeInTheDocument();
  });
});

test('parses markdown wrapped json', async () => {
  const jsonString = `
  Here is the timeline:
  \`\`\`json
  [
    { "year": "1995", "title": "Markdown Event", "description": "Wrapped in code blocks" }
  ]
  \`\`\`
  Hope this helps!
  `;

  render(<HistoryTimeline jsonString={jsonString} />);

  await waitFor(() => {
    expect(screen.getByText("1995")).toBeInTheDocument();
    expect(screen.getByText("Markdown Event")).toBeInTheDocument();
  });
});

test('parses array embedded in text without code blocks', async () => {
  const jsonString = `
  Sure, here is the data:
  [
    { "year": "2020", "title": "Embedded Event", "description": "Found inside text" }
  ]
  Thanks.
  `;

  render(<HistoryTimeline jsonString={jsonString} />);

  await waitFor(() => {
    expect(screen.getByText("2020")).toBeInTheDocument();
    expect(screen.getByText("Embedded Event")).toBeInTheDocument();
  });
});
