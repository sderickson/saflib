[**@saflib/workflows**](../index.md)

---

# Interface: ParsePackageNameInput

Argument for the parsePackageName function.

## Properties

### requiredSuffix?

> `optional` **requiredSuffix**: `string` \| `string`[]

The required suffix to enforce on the package name. Everything prior to the suffix is considered the service name (not including the organization name).

---

### silentError?

> `optional` **silentError**: `boolean`

If true, will not throw an error if the package name does not end with the required suffix. This is mainly used to suppress errors when generating checklists, since some workflows will parse the cwd's package name and in a checklist-generating context, the cwd package could be anything.
