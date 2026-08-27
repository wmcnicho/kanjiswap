import { buildStamp, debugEnabled, typedReadingEnabled } from './features';

afterEach(() => {
  delete process.env.REACT_APP_TYPED_READING;
  delete process.env.REACT_APP_BUILD;
});

test('experimental features are off unless a build turns them on', () => {
  expect(typedReadingEnabled()).toBe(false);
  process.env.REACT_APP_TYPED_READING = 'on';
  expect(typedReadingEnabled()).toBe(true);
});

test('names the build, so a stale page can be told apart from a broken one', () => {
  expect(buildStamp()).toBe('local');
  process.env.REACT_APP_BUILD = 'df674ecabc123';
  expect(buildStamp()).toBe('df674ec');
});

test('debug is off without asking for it', () => {
  expect(debugEnabled()).toBe(false);
});
