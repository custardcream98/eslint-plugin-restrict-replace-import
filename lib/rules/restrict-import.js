/**
 * @fileoverview Prevent the Import of a Specific Package
 * @author shiwoo.park
 */
'use strict'

const createRestrictedPackagesMap = (options) => {
  /**
   * @type {Map<RegExp, string | null>}
   */
  const map = new Map()
  options.forEach((config) => {
    if (typeof config === 'string') {
      map.set(new RegExp(`^${config}$`), null)
    } else {
      map.set(new RegExp(`^${config.target}$`), config.replacement || null)
    }
  })
  return map
}

/**
 * @param {string} importSource
 * @param {RegExp[]} restrictedPatterns
 */
const findRestrictedPattern = (importSource, restrictedPatterns) => {
  for (const pattern of restrictedPatterns) {
    if (pattern.test(importSource)) {
      return pattern
    }
  }
  return null
}

/**
 * Strip the beginning and ending of RegExp pattern (e.g. ^pattern$ -> pattern)
 * @param {string} regExpPatternSource
 */
const getPatternDisplayName = (regExpPatternSource) => regExpPatternSource.slice(1, -1)

const getQuoteStyle = (target) => (target.includes("'") ? "'" : '"')

/**
 * @param {import('estree').ImportDeclaration['source']} sourceNode
 * @param {string} replacement
 * @param {'"' | "'"} quote
 * @returns {(fixer: import('eslint').Rule.RuleFixer) => void}
 */
const createStringReplacer = (sourceNode, replacement, quote) => {
  return (fixer) => fixer.replaceText(sourceNode, `${quote}${replacement}${quote}`)
}

/**
 * @param {import('estree').ImportDeclaration['source']} sourceNode
 * @param {string | { [key: string]: string }} replacementPatterns
 * @param {'"' | "'"} quote
 * @returns {(fixer: import('eslint').Rule.RuleFixer) => void}
 */
const createPatternReplacer = (sourceNode, replacementPatterns, quote) => {
  return (fixer) => {
    let result = sourceNode.value

    if (typeof replacementPatterns === 'string') {
      return createStringReplacer(sourceNode, replacementPatterns, quote)
    }

    for (const [pattern, replacement] of Object.entries(replacementPatterns)) {
      const regex = new RegExp(pattern, 'g')
      result = result.replace(regex, replacement)
    }
    return fixer.replaceText(sourceNode, `${quote}${result}${quote}`)
  }
}

/**
 * @param {import('estree').ImportDeclaration['source']} sourceNode
 * @param {string | { [key: string]: string }} replacement
 * @returns {(fixer: import('eslint').Rule.RuleFixer) => void}
 */
const createFixer = (sourceNode, replacement) => {
  if (!replacement) return null

  const quote = getQuoteStyle(sourceNode.raw)

  if (typeof replacement === 'string') {
    return createStringReplacer(sourceNode, replacement, quote)
  }

  return createPatternReplacer(sourceNode, replacement, quote)
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent the Import of a Specific Package',
      recommended: false,
      url: 'https://github.com/custardcream98/eslint-plugin-restrict-replace-import/blob/main/docs/rules/restrict-import.md',
    },
    fixable: 'code',

    messages: {
      ImportRestriction: '`{{ name }}` is restricted from being used.',
      ImportRestrictionWithReplacement:
        '`{{ name }}` is restricted from being used. Replace it with `{{ replacement }}`.',
    },

    schema: {
      type: 'array',
      maxLength: 1,
      minLength: 1,
      items: {
        type: 'array',
        items: {
          oneOf: [
            {
              type: 'string',
            },
            {
              type: 'object',
              properties: {
                target: {
                  type: 'string',
                },
                replacement: {
                  oneOf: [
                    { type: 'string' },
                    {
                      type: 'object',
                      patternProperties: {
                        '.*': { type: 'string' },
                      },
                    },
                  ],
                },
              },
              required: ['target'],
              additionalProperties: false,
            },
          ],
        },
      },
    },
  },

  create(context) {
    const restrictedPackages = createRestrictedPackagesMap(context.options[0])

    return {
      ImportDeclaration(node) {
        if (node.source.type !== 'Literal') return

        const importSource = node.source.value
        const restrictedPattern = findRestrictedPattern(importSource, restrictedPackages.keys())

        if (!restrictedPattern) return

        const replacement = restrictedPackages.get(restrictedPattern)
        const patternName = getPatternDisplayName(restrictedPattern.source)

        context.report({
          node,
          messageId: typeof replacement === 'string' ? 'ImportRestrictionWithReplacement' : 'ImportRestriction',
          data: {
            name: patternName,
            replacement,
          },
          fix: createFixer(node.source, replacement),
        })
      },
    }
  },
}
