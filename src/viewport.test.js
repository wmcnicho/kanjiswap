import { readFileSync } from 'fs';
import { join } from 'path';

// Reads the shipped HTML rather than a component: these two settings fail
// silently — nothing throws, the layout just quietly goes wrong on a phone.
const html = readFileSync(join(__dirname, '..', 'public', 'index.html'), 'utf8');

test('asks for the whole screen, insets included', () => {
  // Without viewport-fit=cover, iOS reports every env(safe-area-inset-*) as 0,
  // so the padding that clears the home indicator does nothing at all.
  expect(html).toMatch(/viewport-fit=cover/);
  expect(html).toMatch(/width=device-width/);
});

test('does not lock the reader out of zooming', () => {
  // Japanese at 1.5rem is not everyone's comfortable reading size.
  expect(html).not.toMatch(/user-scalable\s*=\s*no/);
  expect(html).not.toMatch(/maximum-scale/);
});
