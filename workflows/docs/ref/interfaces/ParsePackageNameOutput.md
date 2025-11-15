[**@saflib/workflows**](../index.md)

---

# Interface: ParsePackageNameOutput

Return value for the parsePackageName function.

These values are often used for string interpolation in templates.

## Properties

### organizationName

> **organizationName**: `string`

The organization name. Example: "foobar" or ""

---

### packageName

> **packageName**: `string`

The full package name, including the organization name and the suffix.
Example: "@foobar/identity-db"

---

### serviceName

> **serviceName**: `string`

The service name, not including the organization name. Example: "identity"

---

### sharedPackagePrefix

> **sharedPackagePrefix**: `string`

The shared package prefix for packages which are considered part of the same "service". Example: "@foobar/identity"
