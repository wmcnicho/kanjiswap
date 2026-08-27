// Experimental features are off unless a build turns them on, so main can carry
// unfinished work without shipping it. The Pages workflow builds the
// experimental branch a second time with these set, and publishes it under
// /next — see .github/workflows/deploy.yml.
//
// Read at call time rather than at import, so a test can turn one on around the
// code it is exercising.

export function typedReadingEnabled() {
  return process.env.REACT_APP_TYPED_READING === 'on';
}
