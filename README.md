# eslint-plugin-restrict-import

ESLint Plugin for Restricting Import

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-restrict-import`:

```sh
npm install eslint-plugin-restrict-import --save-dev
```

## Usage

Add `restrict-import` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "restrict-import"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "restrict-import/rule-name": 2
    }
}
```

## Rules

<!-- begin auto-generated rules list -->
TODO: Run eslint-doc-generator to generate the rules list.
<!-- end auto-generated rules list -->


