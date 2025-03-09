/**
 * @fileoverview Prevent the Import of a Specific Package
 * @author shiwoo.park
 */
'use strict'

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require('../../../lib/rules/restrict-import'),
  RuleTester = require('eslint').RuleTester

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

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

// test schema

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
