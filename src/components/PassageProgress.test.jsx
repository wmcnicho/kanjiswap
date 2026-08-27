import { render, screen } from '@testing-library/react';
import PassageProgress from './PassageProgress';

const totals = { points: 120, streak: 0 };

function statsFor(overrides) {
  return {
    solved: 2, total: 8, misses: 1, points: 25, complete: false,
    timesCompleted: 0, bestPoints: 0, history: [], fraction: 0.25,
    ...overrides,
  };
}

test('offers another go only once the passage is finished', () => {
  const { rerender } = render(<PassageProgress stats={statsFor()} totals={totals} onTryAgain={() => {}} />);
  expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();

  rerender(<PassageProgress stats={statsFor({ solved: 8, complete: true })} totals={totals} onTryAgain={() => {}} />);
  expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
});

test('reports what is left mid-passage and the result once done', () => {
  const { rerender } = render(<PassageProgress stats={statsFor()} totals={totals} onTryAgain={() => {}} />);
  expect(screen.getByText(/2\/8 swapped/)).toBeInTheDocument();

  rerender(<PassageProgress stats={statsFor({ solved: 8, complete: true, points: 96 })} totals={totals} onTryAgain={() => {}} />);
  // The score is its own element now, so the line reads across two nodes.
  expect(screen.getByText(/Passage complete/)).toBeInTheDocument();
  expect(screen.getByTestId('score-value')).toHaveTextContent('96');
});

test('mentions earlier runs once there is more than one', () => {
  render(
    <PassageProgress
      stats={statsFor({ solved: 8, complete: true, timesCompleted: 3, bestPoints: 104 })}
      totals={totals}
      onTryAgain={() => {}}
    />
  );
  expect(screen.getByText(/Finished 3 times · best 104 points/)).toBeInTheDocument();
});
