[**@saflib/imports**](../../../index.md)

---

# src/budget/check-budgets

## Interfaces

| Interface                                                | Description                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| [BudgetLimits](interfaces/BudgetLimits.md)               | Per-entry or test-file budget limits from `package.json` `importBudget`. |
| [BudgetViolation](interfaces/BudgetViolation.md)         | -                                                                        |
| [CheckBudgetsOptions](interfaces/CheckBudgetsOptions.md) | -                                                                        |
| [CheckBudgetsResult](interfaces/CheckBudgetsResult.md)   | -                                                                        |
| [ImportBudget](interfaces/ImportBudget.md)               | `importBudget` schema in package.json.                                   |

## Type Aliases

| Type Alias                               | Description |
| ---------------------------------------- | ----------- |
| [BudgetMode](type-aliases/BudgetMode.md) | -           |

## Functions

| Function                                        | Description                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [checkBudgets](functions/checkBudgets.md)       | Scan workspace packages with `importBudget` and compare measured graphs against declared limits. Packages without `importBudget` are skipped. |
| [formatViolation](functions/formatViolation.md) | Format a single violation for CLI output.                                                                                                     |
