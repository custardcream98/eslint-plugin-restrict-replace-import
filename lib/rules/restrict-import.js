/**
 * @fileoverview Prevent the Import of a Specific Package
 * @author shiwoo.park
 */
"use strict";

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent the Import of a Specific Package",
      recommended: false,
      url: "https://github.com/custardcream98/eslint-plugin-restrict-replace-import/blob/main/docs/rules/restrict-import.md",
    },
    fixable: "code",

    messages: {
      ImportRestriction:
        "`{{ name }}` is restricted from being used.",
      ImportRestrictionWithReplacement:
        "`{{ name }}` is restricted from being used. Replace it with `{{ replacement }}`.",
    },

    schema: [
      {
        type: "object",
        properties: {
          restrictedPackages: {
            type: "array",
            items: {
              anyOf: [
                {
                  type: "string",
                },
                {
                  type: "object",
                  properties: {
                    target: {
                      type: "string",
                      required: true,
                    },
                    replacement: {
                      type: "string",
                      required: false,
                    },
                  },
                },
              ],
            },
          },
        },
      },
    ],
  },

  create(context) {
    const option = context.options[0];

    const restrictedPackages = new Map();

    option.restrictedPackages.forEach((packageName) => {
      if (typeof packageName === "string") {
        restrictedPackages.set(packageName, null);
        return;
      }

      restrictedPackages.set(
        packageName.target,
        packageName.replacement
          ? packageName.replacement
          : null
      );
    });

    const checkRestricted = (importSource) => {
      const isRestricted =
        restrictedPackages.has(importSource);

      return isRestricted;
    };

    const getReplacement = (importSource) => {
      const replacement =
        restrictedPackages.get(importSource);

      return replacement;
    };

    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;
        const importSourceType = node.source.type;

        const isRestricted = checkRestricted(importSource);

        if (
          !isRestricted ||
          importSourceType !== "Literal"
        ) {
          return;
        }

        const replacement = getReplacement(importSource);
        const quote = node.source.raw.includes("'")
          ? "'"
          : '"';

        context.report({
          node,
          messageId: replacement
            ? "ImportRestrictionWithReplacement"
            : "ImportRestriction",
          data: {
            name: importSource,
            replacement,
          },
          fix: (fixer) => {
            if (!replacement) {
              return;
            }

            return fixer.replaceText(
              node.source,
              `${quote}${replacement}${quote}`
            );
          },
        });
      },
    };
  },
};
