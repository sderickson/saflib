[**@saflib/vendors-sentry-node**](../../index.md)

---

# Class: SentryErrorService

## Implements

- `ErrorService`

## Constructors

### Constructor

> **new SentryErrorService**(`options`): `SentryErrorService`

#### Parameters

| Parameter | Type                                                                        |
| --------- | --------------------------------------------------------------------------- |
| `options` | [`SentryErrorServiceOptions`](../type-aliases/SentryErrorServiceOptions.md) |

#### Returns

`SentryErrorService`

## Properties

### isMocked

> `readonly` **isMocked**: `false` = `false`

#### Implementation of

`ErrorService.isMocked`

## Methods

### installServerCollector()

> **installServerCollector**(): `void`

Wire server-side error collection. Called once at process boot.

#### Returns

`void`

#### Implementation of

`ErrorService.installServerCollector`

---

### listReportedErrors()

> **listReportedErrors**(`_options?`): `ReportedErrorRecord`[]

#### Parameters

| Parameter   | Type                        |
| ----------- | --------------------------- |
| `_options?` | `ListReportedErrorsOptions` |

#### Returns

`ReportedErrorRecord`[]

#### Implementation of

`ErrorService.listReportedErrors`

---

### recordReportedError()

> **recordReportedError**(`input`): `ReportedErrorRecord`

#### Parameters

| Parameter | Type                 |
| --------- | -------------------- |
| `input`   | `ReportedErrorInput` |

#### Returns

`ReportedErrorRecord`

#### Implementation of

`ErrorService.recordReportedError`
