import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'ios', 'android', 'node_modules', 'coverage', '**/*.ts', '**/*.tsx']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['**/*.test.{js,jsx}', '**/test/**'],
    plugins: {
      react,
    },
    extends: [
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        // eslint-plugin-react needs this to recognize JSX
        ecmaVersion: 'latest',
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-unused-expressions': 'off',
      'no-cond-assign': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'off',
      'prefer-const': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      // Catches accidental double className (or any other JSX prop) on a
      // single element. Was a real production bug: the End Workout confirm
      // modal had two className attrs, the second won silently, the modal
      // lost its fixed/centering classes. See Shift6WorkoutSession.jsx
      // (pre-2026-07-08 fix) for the historical case.
      'react/jsx-no-duplicate-props': 'error',
      // We don't use the rest of eslint-plugin-react's recommendations
      // (they trigger false positives on this codebase's context+hook
      // pattern). Only enable specific rules above. Disable the noisy ones.
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',
      'react/prop-types': 'off',
      // Fast refresh: too strict for this codebase (context files export both components and hooks)
      'react-refresh/only-export-components': 'off',
    },
  },
])
