import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintPluginEslintPlugin from 'eslint-plugin-eslint-plugin'
import globals from 'globals'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    rules: {
      ...eslintPluginEslintPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
    plugins: {
      'eslint-plugin': eslintPluginEslintPlugin,
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'lib/**', 'tests/lib/**'],
  }
)
