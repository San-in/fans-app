// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const prettierRecommended = require('eslint-plugin-prettier/recommended')
const reactNative = require('eslint-plugin-react-native')
const simpleImportSort = require('eslint-plugin-simple-import-sort')

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: ['dist/*', 'ios/*', 'android/*', '.expo/*', 'coverage/*'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-native': reactNative,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { overrides: { constructors: 'no-public' } },
      ],
      // TypeScript's noImplicitReturns understands exhaustive switches; this rule doesn't.
      'consistent-return': 'off',
      curly: 'error',
      eqeqeq: 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'object-shorthand': 'error',
      'prefer-const': 'error',
      'react-native/no-inline-styles': 'error',
      'react-native/no-unused-styles': 'error',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
      'import/order': 'off',
    },
  },
])
