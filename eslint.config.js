import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'ios', 'android', 'node_modules', 'coverage', '**/*.ts', '**/*.tsx']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['**/*.test.{js,jsx}', '**/test/**'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // Basic ESLint recommended rules (inlined to avoid @eslint/js default export issues)
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-unused-expressions': 'off',
      'no-cond-assign': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'off',
      'prefer-const': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
])
