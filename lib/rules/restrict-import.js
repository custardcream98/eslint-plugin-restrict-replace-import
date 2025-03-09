/**
 * @fileoverview Prevent the Import of a Specific Package
 * @author shiwoo.park
 */
'use strict'

const createRestrictedPackagesMap = (options) => {
  /**
   * @type {Map<RegExp, { replacement: string | { [key: string]: string } | null, namedImports: string[] | null }>}
   */
  const map = new Map()
  options.forEach((config) => {
    if (typeof config === 'string') {
      map.set(new RegExp(`^${config}$`), {
        replacement: null,
        namedImports: null,
      })
    } else {
      map.set(new RegExp(`^${config.target}$`), {
        replacement: config.replacement || null,
        namedImports: config.namedImports || null,
      })
    }
  })
  return map
}

/**
 * @param {string} importSource
 * @param {string[]} namedImports
 * @param {Map<RegExp, { replacement: string | { [key: string]: string } | null, namedImports: string[] | null }>} restrictedPackages
 */
const checkIsRestrictedImport = (importSource, namedImports, restrictedPackages) => {
  for (const [pattern, restrictedPackageOptions] of restrictedPackages) {
    if (pattern.test(importSource)) {
      if (!restrictedPackageOptions.namedImports?.length) {
        return {
          type: 'module',
          pattern,
        }
      }

      const restrictedImportedName = restrictedPackageOptions.namedImports.find((namedImport) =>
        namedImports.includes(namedImport),
      )
      if (restrictedImportedName) {
        return {
          type: 'importedName',
          pattern,
          restrictedImportedName,
        }
      }
    }
  }
  return null
}

/**
 * Strip the beginning and ending of RegExp pattern (e.g. ^pattern$ -> pattern)
 * @param {string} regExpPatternSource
 */
const getPatternDisplayName = (regExpPatternSource) => regExpPatternSource.slice(1, -1)

const getQuoteStyle = (target) => (target?.includes("'") ? "'" : '"')

/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').ImportDeclaration} node
 * @param {string[]} restrictedNames
 * @param {string} replacement
 * @returns {(fixer: import('eslint').Rule.RuleFixer) => void}
 */
const createNamedImportReplacer = (context, node, restrictedNames, replacement) => {
  return (fixer) => {
    if (!replacement) return null

    const quote = getQuoteStyle(node.source.raw)
    const semicolon = node.source.raw.endsWith(';') || node.source.value.endsWith(';') ? ';' : ''

    const restrictedSpecifiers = node.specifiers.filter(
      (specifier) => specifier.type === 'ImportSpecifier' && restrictedNames.includes(specifier.imported.name),
    )

    if (restrictedSpecifiers.length === 0) {
      return null
    }

    const sourceCode = context.getSourceCode()
    const allImports = sourceCode.ast.body.filter(
      (node) => node.type === 'ImportDeclaration' && node.source.type === 'Literal',
    )

    const existingReplacementImport = allImports.find((importNode) => importNode.source.value === replacement)

    const specifiersToMove = restrictedSpecifiers.map((specifier) => ({
      imported: specifier.imported.name,
      local: specifier.local.name,
    }))

    const remainingSpecifiers = node.specifiers.filter(
      (specifier) => specifier.type !== 'ImportSpecifier' || !restrictedNames.includes(specifier.imported.name),
    )

    const fixes = []

    if (remainingSpecifiers.length === 0) {
      fixes.push(fixer.remove(node))
    } else if (remainingSpecifiers.length < node.specifiers.length) {
      const newSpecifiersText = remainingSpecifiers
        .map((specifier) => {
          if (specifier.type === 'ImportDefaultSpecifier') {
            return specifier.local.name
          }
          if (specifier.type === 'ImportNamespaceSpecifier') {
            return `* as ${specifier.local.name}`
          }
          if (specifier.imported.name === specifier.local.name) {
            return specifier.imported.name
          }
          return `${specifier.imported.name} as ${specifier.local.name}`
        })
        .join(', ')

      let newImportText
      if (remainingSpecifiers.some((s) => s.type === 'ImportDefaultSpecifier')) {
        const defaultName = remainingSpecifiers.find((s) => s.type === 'ImportDefaultSpecifier').local.name

        const namedSpecifiers = remainingSpecifiers.filter((s) => s.type !== 'ImportDefaultSpecifier')

        if (namedSpecifiers.length > 0) {
          const namedText = namedSpecifiers
            .map((specifier) => {
              if (specifier.type === 'ImportNamespaceSpecifier') {
                return `* as ${specifier.local.name}`
              }
              if (specifier.imported.name === specifier.local.name) {
                return specifier.imported.name
              }
              return `${specifier.imported.name} as ${specifier.local.name}`
            })
            .join(', ')

          newImportText = `import ${defaultName}, { ${namedText} } from ${quote}${node.source.value}${quote}${semicolon}`
        } else {
          newImportText = `import ${defaultName} from ${quote}${node.source.value}${quote}${semicolon}`
        }
      } else if (remainingSpecifiers.some((s) => s.type === 'ImportNamespaceSpecifier')) {
        const namespaceName = remainingSpecifiers.find((s) => s.type === 'ImportNamespaceSpecifier').local.name
        newImportText = `import * as ${namespaceName} from ${quote}${node.source.value}${quote}${semicolon}`
      } else {
        newImportText = `import { ${newSpecifiersText} } from ${quote}${node.source.value}${quote}${semicolon}`
      }

      fixes.push(fixer.replaceText(node, newImportText))
    }

    if (existingReplacementImport) {
      const existingSpecifiers = existingReplacementImport.specifiers
        .filter((s) => s.type === 'ImportSpecifier')
        .map((s) => s.imported.name)

      const newSpecifiersToAdd = specifiersToMove.filter((s) => !existingSpecifiers.includes(s.imported))

      if (newSpecifiersToAdd.length > 0) {
        const namedSpecifiers = existingReplacementImport.specifiers.filter((s) => s.type === 'ImportSpecifier')

        if (namedSpecifiers.length > 0) {
          const newSpecifierText = newSpecifiersToAdd
            .map((s) => {
              if (s.imported === s.local) {
                return s.imported
              }
              return `${s.imported} as ${s.local}`
            })
            .join(', ')

          const existingText = sourceCode.getText(existingReplacementImport)
          const existingSpecifiersText = existingText.match(/import\s*(?:[^{]*,\s*)?{([^}]*)}/)[1].trim()
          const combinedSpecifiers = `${existingSpecifiersText}, ${newSpecifierText}`

          const newImportText = existingText.replace(/\{[^}]*\}/, `{ ${combinedSpecifiers} }`)
          fixes.push(fixer.replaceText(existingReplacementImport, newImportText))
        } else {
          const defaultSpecifier = existingReplacementImport.specifiers.find((s) => s.type === 'ImportDefaultSpecifier')

          if (defaultSpecifier) {
            const newImportText = newSpecifiersToAdd
              .map((s) => (s.imported === s.local ? s.imported : `${s.imported} as ${s.local}`))
              .join(', ')

            const defaultName = defaultSpecifier.local.name
            const newText = `import ${defaultName}, { ${newImportText} } from ${quote}${replacement}${quote}${semicolon}`

            fixes.push(fixer.replaceText(existingReplacementImport, newText))
          }
        }
      }
    } else {
      const newSpecifiers = specifiersToMove
        .map((s) => {
          if (s.imported === s.local) {
            return s.imported
          }
          return `${s.imported} as ${s.local}`
        })
        .join(', ')

      const newImport = `import { ${newSpecifiers} } from ${quote}${replacement}${quote}${semicolon}`
      fixes.push(fixer.insertTextAfterRange([0, 0], newImport + '\n'))
    }

    return fixes
  }
}

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
 * @param {import('estree').ImportDeclaration} node
 * @param {string | { [key: string]: string }} replacement
 * @returns {(fixer: import('eslint').Rule.RuleFixer) => void}
 */
const createModuleReplacer = (node, replacement) => {
  if (!replacement) return null

  const quote = getQuoteStyle(node.source.raw)

  if (typeof replacement === 'string') {
    return createStringReplacer(node.source, replacement, quote)
  }

  return createPatternReplacer(node.source, replacement, quote)
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
      ImportedNameRestriction: "Import of '{{importedName}}' from '{{name}}' is restricted",
      ImportedNameRestrictionWithReplacement:
        "Import of '{{importedName}}' from '{{name}}' is restricted. Replace it with '{{replacement}}'.",
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
                  description: 'The target of the import to be restricted',
                },
                namedImports: {
                  type: 'array',
                  items: { type: 'string' },
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
                  description:
                    'The replacement for the import. If a string is provided, it will be used as the replacement for all imports. If an object is provided, the keys will be used as the pattern and the values will be used as the replacement.',
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
        const namedImports = node.specifiers
          .filter((specifier) => specifier.type === 'ImportSpecifier')
          .map((specifier) => specifier.imported.name)
        const checkerResult = checkIsRestrictedImport(importSource, namedImports, restrictedPackages)

        if (!checkerResult) return

        const restrictedPackageOptions = restrictedPackages.get(checkerResult.pattern)
        const patternName = getPatternDisplayName(checkerResult.pattern.source)

        if (checkerResult.type === 'module') {
          context.report({
            node,
            messageId:
              typeof restrictedPackageOptions.replacement === 'string'
                ? 'ImportRestrictionWithReplacement'
                : 'ImportRestriction',
            data: {
              name: patternName,
              replacement: restrictedPackageOptions.replacement,
            },
            fix: createModuleReplacer(node, restrictedPackageOptions.replacement),
          })
          return
        }

        const restrictedImports = restrictedPackageOptions.namedImports.filter((name) => namedImports.includes(name))

        restrictedImports.forEach((restrictedImportedName) => {
          context.report({
            node,
            messageId:
              typeof restrictedPackageOptions.replacement === 'string'
                ? 'ImportedNameRestrictionWithReplacement'
                : 'ImportedNameRestriction',
            data: {
              importedName: restrictedImportedName,
              name: importSource,
              replacement: restrictedPackageOptions.replacement,
            },
            fix: createNamedImportReplacer(
              context,
              node,
              restrictedPackageOptions.namedImports,
              restrictedPackageOptions.replacement,
            ),
          })
        })
      },
    }
  },
}
