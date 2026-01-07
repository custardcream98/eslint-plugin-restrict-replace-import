import type { ESLint, Rule } from 'eslint'
import restrictImport from './rules/restrict-import'

const name = 'eslint-plugin-restrict-replace-import'
const version = '2.0.0'

const rules: Record<string, Rule.RuleModule> = {
  'restrict-import': restrictImport,
}

const plugin: ESLint.Plugin = {
  meta: {
    name,
    version,
  },
  rules,
}

export = plugin
