# eslint-plugin-restrict-replace-import

ESLint Plugin for Restricting and Replacing Import.

Automatically fixable with replacement package!

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-restrict-replace-import`:

```sh
npm install eslint-plugin-restrict-replace-import --save-dev
```

## Usage

Add `restrict-replace-import` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
  "plugins": ["restrict-replace-import"]
}
```

Then configure the rules you want to use under the rules section.

```json
{
  "rules": {
    "restrict-replace-import/restrict-import": ["error", ["restricted-package1", "restricted-package2"]]
  }
}
```

You can also specify an alternative package to import instead:

```json
{
  "rules": {
    "restrict-replace-import/restrict-import": [
      "error",
      [
        {
          "target": "restricted-package1",
          "replacement": "replacement-package1"
        },
        {
          "target": "restricted-package2",
          "replacement": "replacement-package2"
        }
      ]
    ]
  }
}
```

You can use RegExp for package name:

```json
{
  "rules": {
    "restrict-replace-import/restrict-import": [
      "error",
      [
        "with(?:-regex)?-support",
        {
          "target": "restricted-.*",
          "replacement": "replacement-package"
        }
      ]
    ]
  }
}
```

Is it possible as well to perform multiple partial replacements by setting and Object in the `replacement` property:

```json
{
  "rules": {
    "restrict-replace-import/restrict-import": [
      "error",
      [
        {
          "target": "with-partial-.*",
          "replacement": {
            "par(regExp)?tial-": "successfully-",
            "repla(regExp)?cements": "replaced",
            "with-": ""
          }
        }
      ]
    ]
  }
}
```

Given that rule configuration it will perform the following replacement:

Input:

```js
import { useState } from 'with-partial-replacements'
```

Output:

```js
import { useState } from 'successfully-replaced'
```

## Rules

<!-- begin auto-generated rules list -->

🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                             | Description                              | 🔧 |
| :----------------------------------------------- | :--------------------------------------- | :- |
| [restrict-import](docs/rules/restrict-import.md) | Prevent the Import of a Specific Package | 🔧 |

<!-- end auto-generated rules list -->
