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

Add `restrict-import` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
  "plugins": ["restrict-import"]
}
```

Then configure the rules you want to use under the rules section.

```json
{
  "rules": {
    "restrict-import/rule-name": [
      "error",
      ["restricted-package1", "restricted-package2"]
    ]
  }
}
```

You can also specify an alternative package to import instead:

```json
{
  "rules": {
    "restrict-import/rule-name": [
      "error",
      [
        {
          "name": "restricted-package1",
          "alternative": "replacement-package1"
        },
        {
          "name": "restricted-package2",
          "alternative": "replacement-package2"
        }
      ]
    ]
  }
}
```

## Rules

<!-- begin auto-generated rules list -->

🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                             | Description                              | 🔧  |
| :----------------------------------------------- | :--------------------------------------- | :-- |
| [restrict-import](docs/rules/restrict-import.md) | Prevent the Import of a Specific Package | 🔧  |

<!-- end auto-generated rules list -->
