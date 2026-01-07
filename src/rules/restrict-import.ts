import type { Rule, SourceCode } from 'eslint'
import type { Identifier, ImportDeclaration, ImportSpecifier, Literal } from 'estree'

type Replacement = string | Record<string, string>

/**
 * Get the name of an import specifier's imported binding.
 * Handles both Identifier (e.g., `import { foo }`) and Literal (e.g., `import { "foo" as bar }`)
 */
const getImportedName = (imported: Identifier | Literal): string => {
  if (imported.type === 'Identifier') {
    return imported.name
  }
  // For string literals in imports (e.g., import { "string-name" as alias })
  return String(imported.value)
}

interface ImportRestrictionOptions {
  replacement: Replacement | null
  namedImports: string[] | null
}

interface RestrictedImportCheckResult {
  type: 'module' | 'importedName'
  pattern: RegExp
  restrictedImportedName?: string
}

interface ImportRestriction {
  importName: string
  replacement: string | null
  pattern: RegExp
}

interface SpecifierInfo {
  imported: string
  local: string
}

type QuoteStyle = '"' | "'"

const createRestrictedPackagesMap = (
  options: Array<string | { target: string; replacement?: Replacement; namedImports?: string[] }>,
): Map<RegExp, ImportRestrictionOptions> => {
  const map = new Map<RegExp, ImportRestrictionOptions>()

  options.forEach((config) => {
    if (typeof config === 'string') {
      map.set(new RegExp(`^${config}$`), {
        replacement: null,
        namedImports: null,
      })
    } else {
      map.set(new RegExp(`^${config.target}$`), {
        replacement: config.replacement ?? null,
        namedImports: config.namedImports ?? null,
      })
    }
  })

  return map
}

const checkIsRestrictedImport = (
  importSource: string,
  namedImports: string[],
  restrictedPackages: Map<RegExp, ImportRestrictionOptions>,
): RestrictedImportCheckResult | null => {
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
 */
const getPatternDisplayName = (regExpPatternSource: string): string => regExpPatternSource.slice(1, -1)

const getQuoteStyle = (target: string | undefined): QuoteStyle => (target?.includes("'") ? "'" : '"')

/**
 * Format a list of import specifiers as a string
 */
const formatSpecifiers = (specifiers: SpecifierInfo[]): string => {
  return specifiers.map((s) => (s.imported === s.local ? s.imported : `${s.imported} as ${s.local}`)).join(', ')
}

interface CreateImportTextOptions {
  specifiers: ImportDeclaration['specifiers']
  source: string
  quote: QuoteStyle
  semicolon?: string
}

/**
 * Creates the text for a new import statement
 */
const createImportText = ({ specifiers, source, quote, semicolon = '' }: CreateImportTextOptions): string => {
  const defaultSpecifier = specifiers.find((s) => s.type === 'ImportDefaultSpecifier')
  const namespaceSpecifier = specifiers.find((s) => s.type === 'ImportNamespaceSpecifier')
  const namedSpecifiers = specifiers.filter((s): s is ImportSpecifier => s.type === 'ImportSpecifier')

  if (namespaceSpecifier) {
    return `import * as ${namespaceSpecifier.local.name} from ${quote}${source}${quote}${semicolon}`
  }

  if (defaultSpecifier) {
    if (namedSpecifiers.length === 0) {
      return `import ${defaultSpecifier.local.name} from ${quote}${source}${quote}${semicolon}`
    }

    const namedText = namedSpecifiers
      .map((s) => {
        const importedName = getImportedName(s.imported)
        return importedName === s.local.name ? importedName : `${importedName} as ${s.local.name}`
      })
      .join(', ')

    return `import ${defaultSpecifier.local.name}, { ${namedText} } from ${quote}${source}${quote}${semicolon}`
  }

  if (namedSpecifiers.length > 0) {
    const namedText = namedSpecifiers
      .map((s) => {
        const importedName = getImportedName(s.imported)
        return importedName === s.local.name ? importedName : `${importedName} as ${s.local.name}`
      })
      .join(', ')

    return `import { ${namedText} } from ${quote}${source}${quote}${semicolon}`
  }

  return `import ${quote}${source}${quote}${semicolon}`
}

/**
 * Updates an existing import with new specifiers
 */
const updateExistingImport = (
  fixer: Rule.RuleFixer,
  sourceCode: SourceCode,
  existingImport: ImportDeclaration,
  specifiersToAdd: SpecifierInfo[],
  quote: QuoteStyle,
  semicolon: string,
  replacement: string,
): Rule.Fix[] => {
  const fixes: Rule.Fix[] = []
  const existingNamedSpecifiers = existingImport.specifiers
    .filter((s): s is ImportSpecifier => s.type === 'ImportSpecifier')
    .map((s) => getImportedName(s.imported))

  const newSpecifiersToAdd = specifiersToAdd.filter((s) => !existingNamedSpecifiers.includes(s.imported))

  if (newSpecifiersToAdd.length === 0) {
    return fixes
  }

  const existingText = sourceCode.getText(existingImport)
  const namedSpecifiers = existingImport.specifiers.filter((s): s is ImportSpecifier => s.type === 'ImportSpecifier')

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

const createStringReplacer = (
  sourceNode: ImportDeclaration['source'],
  replacement: string,
  quote: QuoteStyle,
): ((fixer: Rule.RuleFixer) => Rule.Fix) => {
  return (fixer) => fixer.replaceText(sourceNode, `${quote}${replacement}${quote}`)
}

const createPatternReplacer = (
  sourceNode: ImportDeclaration['source'],
  replacementPatterns: Replacement,
  quote: QuoteStyle,
): ((fixer: Rule.RuleFixer) => Rule.Fix) => {
  return (fixer) => {
    let result = sourceNode.value as string

    if (typeof replacementPatterns === 'string') {
      return createStringReplacer(sourceNode, replacementPatterns, quote)(fixer)
    }

    for (const [pattern, replacement] of Object.entries(replacementPatterns)) {
      const regex = new RegExp(pattern, 'g')
      result = result.replace(regex, replacement)
    }
    return fixer.replaceText(sourceNode, `${quote}${result}${quote}`)
  }
}

const createModuleReplacer = (
  node: ImportDeclaration,
  replacement: Replacement | null,
): ((fixer: Rule.RuleFixer) => Rule.Fix) | null => {
  if (!replacement) return null

  const quote = getQuoteStyle(node.source.raw)

  if (typeof replacement === 'string') {
    return createStringReplacer(node.source, replacement, quote)
  }

  return createPatternReplacer(node.source, replacement, quote)
}

const createMultiNamedImportReplacer = (
  context: Rule.RuleContext,
  node: ImportDeclaration,
  importRestrictions: ImportRestriction[],
): ((fixer: Rule.RuleFixer) => Rule.Fix[] | null) => {
  return (fixer) => {
    if (!importRestrictions.length) return null

    const quote = getQuoteStyle(node.source.raw)
    const semicolon = node.source.raw?.endsWith(';') || (node.source.value as string).endsWith(';') ? ';' : ''
    const fixes: Rule.Fix[] = []

    const allRestrictedNames = importRestrictions.map((r) => r.importName)

    // Group imports by replacement
    const groupedByReplacement = importRestrictions.reduce<Record<string, string[]>>((acc, restriction) => {
      if (!restriction.replacement) return acc

      if (!acc[restriction.replacement]) {
        acc[restriction.replacement] = []
      }

      acc[restriction.replacement].push(restriction.importName)

      return acc
    }, {})

    // Find non-restricted specifiers from the original import
    const remainingSpecifiers = node.specifiers.filter(
      (specifier) =>
        specifier.type !== 'ImportSpecifier' ||
        !allRestrictedNames.includes(getImportedName((specifier as ImportSpecifier).imported)),
    )

    // Update or remove the original import
    if (remainingSpecifiers.length === 0) {
      fixes.push(fixer.remove(node))
    } else {
      const newImportText = createImportText({
        specifiers: remainingSpecifiers,
        source: node.source.value as string,
        quote,
        semicolon,
      })
      fixes.push(fixer.replaceText(node, newImportText))
    }

    // Create new imports for each replacement module
    const sourceCode = context.sourceCode
    const allImports = sourceCode.ast.body.filter(
      (n): n is ImportDeclaration => n.type === 'ImportDeclaration' && n.source.type === 'Literal',
    )

    // Process each replacement module
    Object.entries(groupedByReplacement).forEach(([replacement, restrictedNames]) => {
      // Find specifiers to move
      const specifiersToMove = restrictedNames
        .map((name) => {
          const specifier = node.specifiers.find(
            (s): s is ImportSpecifier => s.type === 'ImportSpecifier' && getImportedName(s.imported) === name,
          )
          return specifier
            ? {
                imported: getImportedName(specifier.imported),
                local: specifier.local.name,
              }
            : null
        })
        .filter((s): s is SpecifierInfo => s !== null)

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

type RuleOptions = [Array<string | { target: string; replacement?: Replacement; namedImports?: string[] }>]

const rule: Rule.RuleModule = {
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

    schema: [
      {
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
    ],
  },

  create(context) {
    const options = context.options as RuleOptions
    const restrictedPackages = createRestrictedPackagesMap(options[0])

    return {
      ImportDeclaration(node) {
        const importNode = node as unknown as ImportDeclaration
        if (importNode.source.type !== 'Literal') return

        const importSource = importNode.source.value as string
        const namedImports = importNode.specifiers
          .filter((specifier): specifier is ImportSpecifier => specifier.type === 'ImportSpecifier')
          .map((specifier) => getImportedName(specifier.imported))
        const checkerResult = checkIsRestrictedImport(importSource, namedImports, restrictedPackages)

        if (!checkerResult) return

        const restrictedPackageOptions = restrictedPackages.get(checkerResult.pattern)
        if (!restrictedPackageOptions) return

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
              replacement: restrictedPackageOptions.replacement as string,
            },
            fix: createModuleReplacer(importNode, restrictedPackageOptions.replacement),
          })
          return
        }

        // Find potential rules and replacement mappings for multiple restricted named imports
        const importRestrictions: ImportRestriction[] = []

        // Check each named import for restrictions
        namedImports.forEach((importName) => {
          for (const [pattern, patternOptions] of restrictedPackages.entries()) {
            if (
              pattern.test(importSource) &&
              patternOptions.namedImports &&
              patternOptions.namedImports.includes(importName) &&
              // TODO: handle options.replacement as an object
              (typeof patternOptions.replacement === 'string' || patternOptions.replacement === null)
            ) {
              importRestrictions.push({
                importName,
                replacement: patternOptions.replacement,
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
              replacement: restriction.replacement ?? '',
            },
            fix: restriction.replacement
              ? createMultiNamedImportReplacer(context, importNode, importRestrictions)
              : null,
          })
        })
      },
    }
  },
}

export default rule
