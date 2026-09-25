/**
 * jest-expo runs tests through the same Babel preset Metro uses and maps the
 * tsconfig `paths` aliases automatically, so no `moduleNameMapper` is needed.
 *
 * The focused tests exercise the chat engine, billing flow and mock backend as
 * plain TypeScript against in-memory storage — no native modules involved.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  clearMocks: true,
}
