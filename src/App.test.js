import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the passage picker', () => {
  render(<App />);
  const select = screen.getByLabelText(/passage/i);
  expect(select).toBeInTheDocument();
});

test('renders the first passage with readings shown as hiragana', () => {
  render(<App />);
  // 私(わたし) should render as its reading until swapped
  const firstWord = screen.getAllByText('わたし')[0];
  expect(firstWord).toBeInTheDocument();
});
