/**
 * @fileoverview Prevent the Import of a Specific Package
 * @author shiwoo.park
 */
'use strict'

/**
 * @typedef {string | {[key: string]: string;}} Replacement
 * @typedef {{replacement: Replacement | null; namedImports: string[] | null;}} ImportRestrictionOptions
 */

const createRestrictedPackagesMap = (options) => {
  /**
   * @type {Map<RegExp, ImportRestrictionOptions>}
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
 * @param {Map<RegExp, ImportRestrictionOptions>} restrictedPackages
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
 * Format a list of import specifiers as a string
 * @param {Array<{imported: string, local: string}>} specifiers
 * @returns {string}
 */
const formatSpecifiers = (specifiers) => {
  return specifiers.map((s) => (s.imported === s.local ? s.imported : `${s.imported} as ${s.local}`)).join(', ')
}

/**
 * Creates the text for a new import statement
 * @param {Object} options
 * @param {Array} options.specifiers - The import specifiers
 * @param {string} options.source - The import source
 * @param {string} options.quote - The quote style
 * @param {string} options.semicolon - The semicolon (if any)
 * @returns {string}
 */
const createImportText = ({ specifiers, source, quote, semicolon = '' }) => {
  const defaultSpecifier = specifiers.find((s) => s.type === 'ImportDefaultSpecifier')
  const namespaceSpecifier = specifiers.find((s) => s.type === 'ImportNamespaceSpecifier')
  const namedSpecifiers = specifiers.filter((s) => s.type === 'ImportSpecifier')

  if (namespaceSpecifier) {
    return `import * as ${namespaceSpecifier.local.name} from ${quote}${source}${quote}${semicolon}`
  }

  if (defaultSpecifier) {
    if (namedSpecifiers.length === 0) {
      return `import ${defaultSpecifier.local.name} from ${quote}${source}${quote}${semicolon}`
    }

    const namedText = namedSpecifiers
      .map((s) => (s.imported.name === s.local.name ? s.imported.name : `${s.imported.name} as ${s.local.name}`))
      .join(', ')

    return `import ${defaultSpecifier.local.name}, { ${namedText} } from ${quote}${source}${quote}${semicolon}`
  }

  if (namedSpecifiers.length > 0) {
    const namedText = namedSpecifiers
      .map((s) => (s.imported.name === s.local.name ? s.imported.name : `${s.imported.name} as ${s.local.name}`))
      .join(', ')

    return `import { ${namedText} } from ${quote}${source}${quote}${semicolon}`
  }

  return `import ${quote}${source}${quote}${semicolon}`
}

/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').ImportDeclaration} node
 * @param {string[]} restrictedNames
 * @param {string} replacement
 * @returns {(fixer: import('eslint').Rule.RuleFixer) => void}
 * @deprecated Function no longer used as each restriction is now handled individually
 */
// eslint-disable-next-line no-unused-vars
const createNamedImportReplacer = (context, node, restrictedNames, replacement) => {
  return (fixer) => {
    if (!replacement) return null

    const quote = getQuoteStyle(node.source.raw)
    const semicolon = node.source.raw.endsWith(';') || node.source.value.endsWith(';') ? ';' : ''
    const fixes = []

    // Find restricted specifiers to move
    const restrictedSpecifiers = node.specifiers.filter(
      (specifier) => specifier.type === 'ImportSpecifier' && restrictedNames.includes(specifier.imported.name),
    )

    if (restrictedSpecifiers.length === 0) {
      return null
    }

    // Format the restricted specifiers for moving
    const specifiersToMove = restrictedSpecifiers.map((specifier) => ({
      imported: specifier.imported.name,
      local: specifier.local.name,
    }))

    // Handle the original import
    const remainingSpecifiers = node.specifiers.filter(
      (specifier) => specifier.type !== 'ImportSpecifier' || !restrictedNames.includes(specifier.imported.name),
    )

    // Remove or update the original import
    if (remainingSpecifiers.length === 0) {
      fixes.push(fixer.remove(node))
    } else if (remainingSpecifiers.length < node.specifiers.length) {
      const newImportText = createImportText({
        specifiers: remainingSpecifiers,
        source: node.source.value,
        quote,
        semicolon,
      })
      fixes.push(fixer.replaceText(node, newImportText))
    }

    // Add imports to the replacement module
    const { sourceCode } = context
    const allImports = sourceCode.ast.body.filter(
      (node) => node.type === 'ImportDeclaration' && node.source.type === 'Literal',
    )

    const existingReplacementImport = allImports.find((importNode) => importNode.source.value === replacement)

    if (existingReplacementImport) {
      fixes.push(
        ...updateExistingImport(
          fixer,
          sourceCode,
          existingReplacementImport,
          specifiersToMove,
          quote,
          semicolon,
          replacement,
        ),
      )
    } else {
      // Create a new import for the replacement
      const newSpecifiersText = formatSpecifiers(specifiersToMove)
      const newImport = `import { ${newSpecifiersText} } from ${quote}${replacement}${quote}${semicolon}`
      fixes.push(fixer.insertTextBefore(node, newImport + '\n'))
    }

    return fixes
  }
}

/**
 * Updates an existing import with new specifiers
 * @param {import('eslint').Rule.RuleFixer} fixer
 * @param {import('eslint').SourceCode} sourceCode
 * @param {import('estree').ImportDeclaration} existingImport
 * @param {Array<{imported: string, local: string}>} specifiersToAdd
 * @param {string} quote
 * @param {string} semicolon
 * @param {string} replacement
 * @returns {Array<import('eslint').Rule.Fix>}
 */
const updateExistingImport = (fixer, sourceCode, existingImport, specifiersToAdd, quote, semicolon, replacement) => {
  const fixes = []
  const existingNamedSpecifiers = existingImport.specifiers
    .filter((s) => s.type === 'ImportSpecifier')
    .map((s) => s.imported.name)

  const newSpecifiersToAdd = specifiersToAdd.filter((s) => !existingNamedSpecifiers.includes(s.imported))

  if (newSpecifiersToAdd.length === 0) {
    return fixes
  }

  const existingText = sourceCode.getText(existingImport)
  const namedSpecifiers = existingImport.specifiers.filter((s) => s.type === 'ImportSpecifier')

  if (namedSpecifiers.length > 0) {
    // Add new specifiers to existing named imports
    const existingSpecifiersMatch = existingText.match(/import\s*(?:[^{]*,\s*)?{([^}]*)}/)
    if (existingSpecifiersMatch) {
      const existingSpecifiersText = existingSpecifiersMatch[1].trim()
      const newSpecifierText = formatSpecifiers(newSpecifiersToAdd)
      const combinedSpecifiers = `${existingSpecifiersText}, ${newSpecifierText}`
      const newImportText = existingText.replace(/\{[^}]*\}/, `{ ${combinedSpecifiers} }`)
      fixes.push(fixer.replaceText(existingImport, newImportText))
    }
  } else {
    // Handle imports with default but no named imports
    const defaultSpecifier = existingImport.specifiers.find((s) => s.type === 'ImportDefaultSpecifier')
    if (defaultSpecifier) {
      const defaultName = defaultSpecifier.local.name
      const newSpecifiersText = formatSpecifiers(newSpecifiersToAdd)
      const newText = `import ${defaultName}, { ${newSpecifiersText} } from ${quote}${replacement}${quote}${semicolon}`
      fixes.push(fixer.replaceText(existingImport, newText))
    }
  }

  return fixes
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
 * @param {Replacement} replacementPatterns
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
 * @param {Replacement} replacement
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

/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').ImportDeclaration} node
 * @param {Array<{importName: string, replacement: string}>} importRestrictions
 * @returns {(fixer: import('eslint').Rule.RuleFixer) => any}
 */
const createMultiNamedImportReplacer = (context, node, importRestrictions) => {
  return (fixer) => {
    if (!importRestrictions.length) return null

    const quote = getQuoteStyle(node.source.raw)
    const semicolon = node.source.raw.endsWith(';') || node.source.value.endsWith(';') ? ';' : ''
    const fixes = []

    const allRestrictedNames = importRestrictions.map((r) => r.importName)

    // Group imports by replacement
    const groupedByReplacement = importRestrictions.reduce((acc, restriction) => {
      if (!restriction.replacement) return acc

      if (!acc[restriction.replacement]) {
        acc[restriction.replacement] = []
      }

      acc[restriction.replacement].push(restriction.importName)

      return acc
    }, {})

    // Find non-restricted specifiers from the original import
    const remainingSpecifiers = node.specifiers.filter(
      (specifier) => specifier.type !== 'ImportSpecifier' || !allRestrictedNames.includes(specifier.imported.name),
    )

    // Update or remove the original import
    if (remainingSpecifiers.length === 0) {
      fixes.push(fixer.remove(node))
    } else {
      const newImportText = createImportText({
        specifiers: remainingSpecifiers,
        source: node.source.value,
        quote,
        semicolon,
      })
      fixes.push(fixer.replaceText(node, newImportText))
    }

    // Create new imports for each replacement module
    const { sourceCode } = context
    const allImports = sourceCode.ast.body.filter(
      (node) => node.type === 'ImportDeclaration' && node.source.type === 'Literal',
    )

    // Process each replacement module
    Object.entries(groupedByReplacement).forEach(([replacement, restrictedNames]) => {
      // Find specifiers to move
      const specifiersToMove = restrictedNames
        .map((name) => {
          const specifier = node.specifiers.find((s) => s.type === 'ImportSpecifier' && s.imported.name === name)
          return specifier
            ? {
                imported: specifier.imported.name,
                local: specifier.local.name,
              }
            : null
        })
        .filter(Boolean)

      if (specifiersToMove.length === 0) return

      // Find existing import for the same replacement module
      const existingReplacementImport = allImports.find((importNode) => importNode.source.value === replacement)

      if (existingReplacementImport) {
        // Add to existing import
        fixes.push(
          ...updateExistingImport(
            fixer,
            sourceCode,
            existingReplacementImport,
            specifiersToMove,
            quote,
            semicolon,
            replacement,
          ),
        )
      } else {
        // Create new import
        const newSpecifiersText = formatSpecifiers(specifiersToMove)
        const newImport = `import { ${newSpecifiersText} } from ${quote}${replacement}${quote}${semicolon}`
        fixes.push(fixer.insertTextBefore(node, newImport + '\n'))
      }
    })

    return fixes
  }
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
                  description:
                    'The named imports to be restricted. If not provided, all named imports will be restricted.',
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

        // Find potential rules and replacement mappings for multiple restricted named imports

        /**
         * @type {{importName: string, replacement: string | null, pattern: RegExp}[]}
         */
        const importRestrictions = []

        // Check each named import for restrictions
        namedImports.forEach((importName) => {
          for (const [pattern, options] of restrictedPackages.entries()) {
            if (
              pattern.test(importSource) &&
              options.namedImports &&
              options.namedImports.includes(importName) &&
              // TODO: handle options.replacement as an object
              (typeof options.replacement === 'string' || options.replacement === null)
            ) {
              importRestrictions.push({
                importName,
                replacement: options.replacement,
                pattern,
              })

              break // Only use the first matching restriction for an import
            }
          }
        })

        if (importRestrictions.length === 0) {
          return
        }

        // Report separate errors for each restricted import
        importRestrictions.forEach((restriction) => {
          context.report({
            node,
            messageId: restriction.replacement ? 'ImportedNameRestrictionWithReplacement' : 'ImportedNameRestriction',
            data: {
              importedName: restriction.importName,
              name: importSource,
              replacement: restriction.replacement,
            },
            fix: restriction.replacement ? createMultiNamedImportReplacer(context, node, importRestrictions) : null,
          })
        })
      },
    }
  },
}
