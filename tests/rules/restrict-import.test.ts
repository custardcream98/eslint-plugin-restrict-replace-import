import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import rule from '../../src/rules/restrict-import'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

const OPTIONS = [
  [
    'lodash',
    {
      target: 'react',
      replacement: 'preact',
    },
    {
      target: 'any-other-with(?:regex)',
      replacement: 'any-other-replacement',
    },
    'other-with(?:regex)',
    {
      target: 'with(?:-regex)?-support',
      replacement: 'with-support-replacement',
    },
    {
      target: 'with-partial-replacements',
      replacement: {
        'par(regExp)?tial-': 'successfully-',
        'repla(regExp)?cements': 'replaced',
        'with-': '',
      },
    },
  ],
]

describe('restrict-import', () => {
  it('should validate and report correctly', () => {
    ruleTester.run('restrict-import', rule, {
      valid: [
        {
          code: "import _ from 'underscore'",
          options: OPTIONS,
        },
        {
          code: "import _ from 'lodash-es'",
          options: OPTIONS,
        },
        {
          code: "import { useState } from 'preact'",
          options: OPTIONS,
        },
      ],

      invalid: [
        {
          code: "import _ from 'lodash'",
          errors: [
            {
              message: '`lodash` is restricted from being used.',
              type: 'ImportDeclaration',
            },
          ],
          options: OPTIONS,
          output: null,
        },
        {
          code: "import { useState } from 'react'",
          errors: [
            {
              message: '`react` is restricted from being used. Replace it with `preact`.',
              type: 'ImportDeclaration',
            },
          ],
          options: OPTIONS,
          output: "import { useState } from 'preact'",
        },
        {
          code: "import { useState } from 'any-other-withregex'",
          errors: [
            {
              message: '`any-other-with(?:regex)` is restricted from being used. Replace it with `any-other-replacement`.',
              type: 'ImportDeclaration',
            },
          ],
          options: OPTIONS,
          output: "import { useState } from 'any-other-replacement'",
        },
        {
          code: "import { useState } from 'other-withregex'",
          errors: [
            {
              message: '`other-with(?:regex)` is restricted from being used.',
              type: 'ImportDeclaration',
            },
          ],
          options: OPTIONS,
          output: null,
        },
        {
          code: "import { useState } from 'with-regex-support'",
          errors: [
            {
              message:
                '`with(?:-regex)?-support` is restricted from being used. Replace it with `with-support-replacement`.',
              type: 'ImportDeclaration',
            },
          ],
          options: OPTIONS,
          output: "import { useState } from 'with-support-replacement'",
        },
        {
          code: "import { useState } from 'with-support'",
          errors: [
            {
              message:
                '`with(?:-regex)?-support` is restricted from being used. Replace it with `with-support-replacement`.',
              type: 'ImportDeclaration',
            },
          ],
          options: OPTIONS,
          output: "import { useState } from 'with-support-replacement'",
        },
        {
          code: 'import { ReactNode } from "react";',
          errors: [
            {
              message: '`react` is restricted from being used. Replace it with `preact`.',
              type: 'ImportDeclaration',
            },
          ],
          options: OPTIONS,
          output: 'import { ReactNode } from "preact";',
        },
        {
          code: "import { useState } from 'with-partial-replacements'",
          errors: [
            {
              message: '`with-partial-replacements` is restricted from being used.',
              type: 'ImportDeclaration',
            },
          ],
          options: OPTIONS,
          output: "import { useState } from 'successfully-replaced'",
        },
      ],
    })
  })
})

describe('restrict-import: schema test', () => {
  it('should handle various schema configurations', () => {
    ruleTester.run('restrict-import: schema test', rule, {
      valid: [],
      invalid: [
        {
          code: "import _ from 'underscore'",
          options: [['underscore']],
          errors: [
            {
              message: '`underscore` is restricted from being used.',
              type: 'ImportDeclaration',
            },
          ],
          output: null,
        },
        {
          code: "import _ from 'underscore'",
          options: [
            [
              {
                target: 'underscore',
              },
            ],
          ],
          output: null,
          errors: [
            {
              message: '`underscore` is restricted from being used.',
              type: 'ImportDeclaration',
            },
          ],
        },
        {
          code: "import _ from 'underscore'",
          options: [
            [
              {
                target: 'underscore',
                replacement: 'lodash',
              },
            ],
          ],
          output: "import _ from 'lodash'",
          errors: [
            {
              message: '`underscore` is restricted from being used. Replace it with `lodash`.',
              type: 'ImportDeclaration',
            },
          ],
        },
        {
          code: "import _ from 'underscore'",
          options: [
            [
              {
                target: 'underscore',
                replacement: 'lodash',
              },
              {
                target: 'lodash',
                replacement: 'lodash-es',
              },
            ],
          ],
          output: "import _ from 'lodash'",
          errors: [
            {
              message: '`underscore` is restricted from being used. Replace it with `lodash`.',
              type: 'ImportDeclaration',
            },
          ],
        },
        {
          code: "import _ from 'underscore'",
          options: [
            [
              {
                target: 'underscore',
                replacement: 'lodash',
              },
              {
                target: 'lodash',
                replacement: 'lodash-es',
              },
              'lodash-es',
            ],
          ],
          output: "import _ from 'lodash'",
          errors: [
            {
              message: '`underscore` is restricted from being used. Replace it with `lodash`.',
              type: 'ImportDeclaration',
            },
          ],
        },
      ],
    })
  })
})

describe('restrict-import: namedImports test', () => {
  it('should handle namedImports restrictions', () => {
    ruleTester.run('restrict-import: namedImports test', rule, {
      valid: [
        {
          code: "import { allowedImport } from 'restricted-module'",
          options: [
            [
              {
                target: 'restricted-module',
                namedImports: ['restrictedImport'],
                replacement: 'replacement-module',
              },
            ],
          ],
        },
        {
          code: "import { something, anotherThing } from 'module'",
          options: [
            [
              {
                target: 'module',
                namedImports: ['restrictedImport', 'alsoRestricted'],
                replacement: 'replacement-module',
              },
            ],
          ],
        },
      ],

      invalid: [
        {
          code: "import { restrictedImport } from 'restricted-module'",
          errors: [
            {
              messageId: 'ImportedNameRestrictionWithReplacement',
              data: {
                importedName: 'restrictedImport',
                name: 'restricted-module',
                replacement: 'replacement-module',
              },
              type: 'ImportDeclaration',
            },
          ],
          options: [
            [
              {
                target: 'restricted-module',
                namedImports: ['restrictedImport'],
                replacement: 'replacement-module',
              },
            ],
          ],
          output: "import { restrictedImport } from 'replacement-module'\n",
        },

        {
          code: "import { allowed, restrictedImport } from 'restricted-module'",
          errors: [
            {
              messageId: 'ImportedNameRestrictionWithReplacement',
              data: {
                importedName: 'restrictedImport',
                name: 'restricted-module',
                replacement: 'replacement-module',
              },
              type: 'ImportDeclaration',
            },
          ],
          options: [
            [
              {
                target: 'restricted-module',
                namedImports: ['restrictedImport'],
                replacement: 'replacement-module',
              },
            ],
          ],
          output: "import { restrictedImport } from 'replacement-module'\nimport { allowed } from 'restricted-module'",
        },

        {
          code: "import { restrictedImport, alsoRestricted } from 'restricted-module'",
          errors: [
            {
              messageId: 'ImportedNameRestrictionWithReplacement',
              data: {
                importedName: 'restrictedImport',
                name: 'restricted-module',
                replacement: 'replacement-module',
              },
              type: 'ImportDeclaration',
            },
            {
              messageId: 'ImportedNameRestrictionWithReplacement',
              data: {
                importedName: 'alsoRestricted',
                name: 'restricted-module',
                replacement: 'replacement-module',
              },
              type: 'ImportDeclaration',
            },
          ],
          options: [
            [
              {
                target: 'restricted-module',
                namedImports: ['restrictedImport', 'alsoRestricted'],
                replacement: 'replacement-module',
              },
            ],
          ],
          output: "import { restrictedImport, alsoRestricted } from 'replacement-module'\n",
        },

        {
          code: "import { restrictedImport, alsoRestricted } from 'restricted-module'",
          errors: [
            {
              messageId: 'ImportedNameRestrictionWithReplacement',
              data: {
                importedName: 'restrictedImport',
                name: 'restricted-module',
                replacement: 'replacement-module-A',
              },
              type: 'ImportDeclaration',
            },
            {
              messageId: 'ImportedNameRestrictionWithReplacement',
              data: {
                importedName: 'alsoRestricted',
                name: 'restricted-module',
                replacement: 'replacement-module-B',
              },
              type: 'ImportDeclaration',
            },
          ],
          options: [
            [
              {
                target: 'restricted-module',
                namedImports: ['restrictedImport'],
                replacement: 'replacement-module-A',
              },
              {
                target: 'restricted-module',
                namedImports: ['alsoRestricted'],
                replacement: 'replacement-module-B',
              },
            ],
          ],
          output:
            "import { restrictedImport } from 'replacement-module-A'\nimport { alsoRestricted } from 'replacement-module-B'\n",
        },

        {
          code: "import { existingImport } from 'replacement-module';\nimport { restrictedImport } from 'restricted-module';",
          errors: [
            {
              messageId: 'ImportedNameRestrictionWithReplacement',
              data: {
                importedName: 'restrictedImport',
                name: 'restricted-module',
                replacement: 'replacement-module',
              },
              type: 'ImportDeclaration',
            },
          ],
          options: [
            [
              {
                target: 'restricted-module',
                namedImports: ['restrictedImport'],
                replacement: 'replacement-module',
              },
            ],
          ],
          output: "import { existingImport, restrictedImport } from 'replacement-module';\n",
        },

        {
          code: "import defaultExport, { restrictedImport, allowed } from 'restricted-module'",
          errors: [
            {
              messageId: 'ImportedNameRestrictionWithReplacement',
              data: {
                importedName: 'restrictedImport',
                name: 'restricted-module',
                replacement: 'replacement-module',
              },
              type: 'ImportDeclaration',
            },
          ],
          options: [
            [
              {
                target: 'restricted-module',
                namedImports: ['restrictedImport'],
                replacement: 'replacement-module',
              },
            ],
          ],
          output:
            "import { restrictedImport } from 'replacement-module'\nimport defaultExport, { allowed } from 'restricted-module'",
        },

        {
          code: "import { restrictedImport as aliasName } from 'restricted-module'",
          errors: [
            {
              messageId: 'ImportedNameRestrictionWithReplacement',
              data: {
                importedName: 'restrictedImport',
                name: 'restricted-module',
                replacement: 'replacement-module',
              },
              type: 'ImportDeclaration',
            },
          ],
          options: [
            [
              {
                target: 'restricted-module',
                namedImports: ['restrictedImport'],
                replacement: 'replacement-module',
              },
            ],
          ],
          output: "import { restrictedImport as aliasName } from 'replacement-module'\n",
        },

        {
          code: "import { restrictedImport } from 'restricted-module'",
          errors: [
            {
              messageId: 'ImportedNameRestriction',
              data: {
                importedName: 'restrictedImport',
                name: 'restricted-module',
              },
              type: 'ImportDeclaration',
            },
          ],
          options: [
            [
              {
                target: 'restricted-module',
                namedImports: ['restrictedImport'],
              },
            ],
          ],
          output: null,
        },

        {
          code: "import { restrictedImport } from 'pattern-module'",
          errors: [
            {
              messageId: 'ImportedNameRestrictionWithReplacement',
              data: {
                importedName: 'restrictedImport',
                name: 'pattern-module',
                replacement: 'replacement-pattern-module',
              },
              type: 'ImportDeclaration',
            },
          ],
          options: [
            [
              {
                target: 'pattern-m(?:odule)',
                namedImports: ['restrictedImport'],
                replacement: 'replacement-pattern-module',
              },
            ],
          ],
          output: "import { restrictedImport } from 'replacement-pattern-module'\n",
        },
      ],
    })
  })
})

