# Prevent the Import of a Specific Package (`restrict-replace-import/restrict-import`)

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

This rule aims to prevent the import of a specific package.

With additional configuration, this rule can also suggest an alternative package to import instead.

If the alternative package is specified, auto-fixing will replace the import statement with the alternative package.

You can use RegExp to match multiple packages.

## Rule Details

Example configuration:

```json
{
  "rules": {
    "restrict-replace-import/restrict-import": [
      "error",
      [
        {
          "target": "test-package",
          "replacement": "replacement-package"
        },
        "another-package"
        "with(?:-regex)?-support"
      ]
    ]
  }
}
```

Examples of **incorrect** code for this rule with options above:

```js
import testPackage from "test-package";

import anotherPackage from "another-package";

import withRegexSupport from "with-regex-support";
import withSupport from "with-support";
```

Examples of **correct** code for this rule with options above:

```js
import testPackage from "replacement-package";

import theOtherPackage from "the-other-package";
```

### Options

This rule takes a single argument, an array of strings or objects.

Each string or object represents a package that should be restricted.

If the array element is a string, it represents the name of the package that should be restricted.

If the array element is an object, it represents the name of the package that should be restricted and the alternative package that should be suggested instead.

The alternative package is optional.

Scheme:

```ts
type Restriction =
  | string
  | {
      target: string;
      replacement?: string;
    };
```
