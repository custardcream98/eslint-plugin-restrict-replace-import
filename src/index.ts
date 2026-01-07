import type { ESLint, Linter, Rule } from 'eslint'
import restrictImport from './rules/restrict-import'

// Read version from package.json at build time
const name = 'eslint-plugin-restrict-replace-import'
const version = '2.0.0'

const rules: Record<string, Rule.RuleModule> = {
  'restrict-import': restrictImport,
}

// Legacy config (ESLint < 9)
const configs: Record<string, Linter.LegacyConfig> = {
  recommended: {
    plugins: ['restrict-replace-import'],
    rules: {
      'restrict-replace-import/restrict-import': 'error',
    },
  },
}

// ESLint v9+ flat configs
const flatConfigs: Record<string, Linter.Config> = {
  recommended: {
    plugins: {
      'restrict-replace-import': {
        meta: { name, version },
        rules,
      },
    },
    rules: {
      'restrict-replace-import/restrict-import': 'error',
    },
  },
}

const plugin: ESLint.Plugin & {
  configs: typeof configs
  flatConfigs: typeof flatConfigs
} = {
  meta: {
    name,
    version,
  },
  rules,
  configs,
  flatConfigs,
}

export = plugin

