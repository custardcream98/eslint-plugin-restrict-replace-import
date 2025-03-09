'use strict'

import eslint from '@eslint/js'
import eslintPluginEslintPlugin from 'eslint-plugin-eslint-plugin'
import eslintPluginNode from 'eslint-plugin-node'
import { fixupPluginRules } from '@eslint/compat'
import globals from 'globals'

/**
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  eslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    files: ['**/*.js'],
    rules: {
      ...eslintPluginEslintPlugin.configs.recommended.rules,
      ...eslintPluginNode.configs.recommended.rules,
    },
    plugins: {
      'eslint-plugin': eslintPluginEslintPlugin,
      node: fixupPluginRules(eslintPluginNode),
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        mocha: 'readonly',
      },
    },
  },
]
