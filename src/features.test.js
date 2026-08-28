import { buildStamp, debugEnabled } from './features';

afterEach(() => {
  delete process.env.REACT_APP_BUILD;
});

test('names the build, so a stale page can be told apart from a broken one', () => {
  expect(buildStamp()).toBe('local');
  process.env.REACT_APP_BUILD = 'df674ecabc123';
  expect(buildStamp()).toBe('df674ec');
});

test('debug is off without asking for it', () => {
  expect(debugEnabled()).toBe(false);
});
