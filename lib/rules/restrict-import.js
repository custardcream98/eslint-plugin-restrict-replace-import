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

    schema: {
      type: "array",
      maxLength: 1,
      minLength: 1,
      items: {
        type: "array",
        items: {
          oneOf: [
            {
              type: "string",
            },
            {
              type: "object",
              properties: {
                target: {
                  type: "string",
                },
                replacement: {
                  oneOf: [
                    { type: "string" },
                    { 
                      type: "object", 
                      patternProperties: {
                        ".*": { type: "string" }
                      }
                    }
                  ]
                },
              },
              required: ["target"],
              additionalProperties: false,
            },
          ],
        },
      },
    },
  },

  create(context) {
    const restrictedPackages = new Map();
    const restrictedPackagesOption = context.options[0];

    restrictedPackagesOption.forEach((packageName) => {
      if (typeof packageName === "string") {
        restrictedPackages.set(
          new RegExp(`^${packageName}$`),
          null
        );
        return;
      }

      restrictedPackages.set(
        new RegExp(`^${packageName.target}$`),
        packageName.replacement
          ? packageName.replacement
          : null
      );
    });

    const checkRestricted = (importSource) => {
      const restrictedRegExp = Array.from(
        restrictedPackages.keys()
      ).find((packageName) => {
        return packageName.test(importSource);
      });

      return {
        isRestricted: !!restrictedRegExp,
        restrictedRegExp,
      };
    };

    const getReplacement = (restrictedRegExp) => {
      const replacement = restrictedPackages.get(
        restrictedRegExp
      );

      return replacement;
    };

    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;
        const importSourceType = node.source.type;

        const { isRestricted, restrictedRegExp } =
          checkRestricted(importSource);

        if (
          !isRestricted ||
          importSourceType !== "Literal"
        ) {
          return;
        }

        const replacement = getReplacement(
          restrictedRegExp
        );
        const quote = node.source.raw.includes("'")
          ? "'"
          : '"';

        context.report({
          node,
          messageId: typeof replacement === "string"
            ? "ImportRestrictionWithReplacement"
            : "ImportRestriction",
          data: {
            name: restrictedRegExp.toString().slice(2, -2),
            replacement,
          },
          fix: (fixer) => {
            if (!replacement) {
              return;
            }

            if (typeof replacement === "string") {
              return fixer.replaceText(
                node.source,
                `${quote}${replacement}${quote}`
              );
            }

            if (typeof replacement === "object") {
              let partiallyReplaced = node.source.value;
              for (const [key, value] of Object.entries(replacement)) {
                const regex = new RegExp(key, 'g');
                partiallyReplaced = partiallyReplaced.replace(regex, value);
              }
              return fixer.replaceText(
                node.source,
                `${quote}${partiallyReplaced}${quote}`
              );
            }

            return null;
          },
        });
      },
    };
  },
};
