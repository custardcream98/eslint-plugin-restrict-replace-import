/**
 * @fileoverview Prevent the Import of a Specific Package
 * @author shiwoo.park
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/restrict-import"),
  RuleTester = require("eslint").RuleTester;

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
  },
});

const OPTIONS = [
  {
    restrictedPackages: [
      "lodash",
      {
        target: "react",
        replacement: "preact",
      },
    ],
  },
];

ruleTester.run("restrict-import", rule, {
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
          message:
            "`lodash` is restricted from being used.",
          type: "ImportDeclaration",
        },
      ],
      options: OPTIONS,
      output: null,
    },
    {
      code: "import { useState } from 'react'",
      errors: [
        {
          message:
            "`react` is restricted from being used. Replace it with `preact`.",
          type: "ImportDeclaration",
        },
      ],
      options: OPTIONS,
      output: "import { useState } from 'preact'",
    },
  ],
});
