**@saflib/utils**

---

# @saflib/utils

## Interfaces

| Interface                                                | Description                                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [ElementStringObject](interfaces/ElementStringObject.md) | Strings that are exported by client packages will be in objects like these. Their values match valid HTML attributes. |

## Type Aliases

| Type Alias                                     | Description                                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [ElementString](type-aliases/ElementString.md) | A string for an HTML element can either be a plain string, or an object with valid HTML attributes. |

## Functions

| Function                                                                        | Description                                                                                                                                                                                          |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [addNewLinesToString](functions/addNewLinesToString.md)                         | Given a string which may have newlines already included, add /n to each line such that no line is longer than maxLineWidth.                                                                          |
| [convertI18NInterpolationToRegex](functions/convertI18NInterpolationToRegex.md) | Utility function to convert the vue-i18n message format syntax to a regex for finding an instance of that string, in particular for tests. https://vue-i18n.intlify.dev/guide/essentials/syntax.html |
| [kebabCaseToCamelCase](functions/kebabCaseToCamelCase.md)                       | Convert a kebab-case string to camelCase.                                                                                                                                                            |
| [kebabCaseToPascalCase](functions/kebabCaseToPascalCase.md)                     | Convert a kebab-case string to PascalCase.                                                                                                                                                           |
| [kebabCaseToSnakeCase](functions/kebabCaseToSnakeCase.md)                       | Convert a kebab-case string to snake_case.                                                                                                                                                           |
