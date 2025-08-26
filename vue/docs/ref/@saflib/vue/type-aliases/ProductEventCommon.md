[**@saflib/vue**](../../../index.md)

***

# Type Alias: ProductEventCommon

> **ProductEventCommon** = `object`

Common fields for all product events.

## Properties

### client

> **client**: `string`

The frontend client that triggered the event. For web, it should be "web-{spa-name}".

***

### component

> **component**: `string`

The component that triggered the event. For vue, it should be the component name.

***

### view

> **view**: `string`

The page that triggered the event. For vue, it should be the route name provided by vue router.
