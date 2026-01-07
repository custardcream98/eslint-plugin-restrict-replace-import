# Prevent the Import of a Specific Package (`restrict-replace-import/restrict-import`)

💼 This rule is enabled in the ✅ `recommended` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

This rule aims to prevent the import of a specific package and optionally replace it with an alternative package.

## Features

- Restrict imports from specific packages
- Replace restricted imports with alternative packages
- Support for RegExp patterns in package names
- Restrict specific named imports while allowing others
- Partial string replacements using RegExp
- Automatic merging with existing imports from replacement modules

## Options

<!-- begin auto-generated rule options list -->

| Name           | Description                                                                                                                                                                                                                 | Type     | Required |
| :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- | :------- |
| `namedImports` | The named imports to be restricted. If not provided, all named imports will be restricted.                                                                                                                                  | String[] |          |
| `replacement`  | The replacement for the import. If a string is provided, it will be used as the replacement for all imports. If an object is provided, the keys will be used as the pattern and the values will be used as the replacement. |          |          |
| `target`       | The target of the import to be restricted                                                                                                                                                                                   | String   | Yes      |

<!-- end auto-generated rule options list -->

## Usage Examples

### Basic Usage - Restricting Packages

```json
{
  "rules": {
    "restrict-replace-import/restrict-import": ["error", ["lodash"]]
  }
}
```

This will prevent imports from `lodash`:
```js
// ❌ Error: `lodash` is restricted from being used
import _ from 'lodash'
```

### Replacing with Alternative Package

```json
{
  "rules": {
    "restrict-replace-import/restrict-import": [
      "error", 
      [{
        "target": "react",
        "replacement": "preact"
      }]
    ]
  }
}
```

```js
// Before
import { useState } from 'react'

// After
import { useState } from 'preact'
```

### Using RegExp for Package Names

```json
{
  "rules": {
    "restrict-replace-import/restrict-import": [
      "error",
      [{
        "target": "with(?:-regex)?-support",
        "replacement": "with-support-replacement"
      }]
    ]
  }
}
```

This will match and replace both:
```js
import { something } from 'with-regex-support'  // will be replaced
import { something } from 'with-support'        // will be replaced
```

### Partial String Replacements

```json
{
  "rules": {
    "restrict-replace-import/restrict-import": [
      "error",
      [{
        "target": "with-partial-replacements",
        "replacement": {
          "par(regExp)?tial-": "successfully-",
          "repla(regExp)?cements": "replaced",
          "with-": ""
        }
      }]
    ]
  }
}
```

```js
// Before
import { useState } from 'with-partial-replacements'

// After
import { useState } from 'successfully-replaced'
```

### Restricting Specific Named Imports

```json
{
  "rules": {
    "restrict-replace-import/restrict-import": [
      "error",
      [{
        "target": "restricted-module",
        "namedImports": ["restrictedImport", "alsoRestricted"],
        "replacement": "replacement-module" // Object is not supported yet
      }]
    ]
  }
}
```

This configuration handles various scenarios:

```js
// ✅ Allowed - import not in restricted list
import { allowedImport } from 'restricted-module'

// ❌ Will be replaced
import { restrictedImport } from 'restricted-module'
// ↓ Becomes
import { restrictedImport } from 'replacement-module'

// Mixed imports are split
import { restrictedImport, allowed } from 'restricted-module'
// ↓ Becomes
import { restrictedImport } from 'replacement-module'
import { allowed } from 'restricted-module'

// Handles aliases
import { restrictedImport as aliasName } from 'restricted-module'
// ↓ Becomes
import { restrictedImport as aliasName } from 'replacement-module'

// Merges with existing imports
import { existingImport } from 'replacement-module';
import { restrictedImport } from 'restricted-module';
// ↓ Becomes
import { existingImport, restrictedImport } from 'replacement-module';
```
