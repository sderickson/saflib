[**@saflib/identity-rpcs**](../../../../index.md)

---

# Class: UsersClient

## Extends

- `ServiceClient`\<`this`\>

## Indexable

\[`methodName`: `string`\]: `Function`

## Constructors

### Constructor

> **new UsersClient**(`address`, `credentials`, `options?`): `UsersClient`

#### Parameters

| Parameter     | Type                          |
| ------------- | ----------------------------- |
| `address`     | `string`                      |
| `credentials` | `ChannelCredentials`          |
| `options?`    | `Partial`\<`ChannelOptions`\> |

#### Returns

`UsersClient`

#### Overrides

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).constructor`

## Properties

### GetUserProfile

> **GetUserProfile**: `GrpcPromiseServiceInterface`\<[`GetUserProfileRequest`](GetUserProfileRequest.md), [`GetUserProfileResponse`](GetUserProfileResponse.md)\>

---

### service

> `static` **service**: `ServiceDefinition`

#### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).service`

---

### serviceName

> `static` **serviceName**: `string`

#### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).serviceName`

## Methods

### close()

> **close**(): `void`

#### Returns

`void`

#### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).close`

---

### getChannel()

> **getChannel**(): `Channel`

#### Returns

`Channel`

#### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).getChannel`

---

### makeBidiStreamRequest()

#### Call Signature

> **makeBidiStreamRequest**\<`RequestType`, `ResponseType`\>(`method`, `serialize`, `deserialize`, `metadata`, `options?`): `ClientDuplexStream`\<`RequestType`, `ResponseType`\>

##### Type Parameters

| Type Parameter |
| -------------- |
| `RequestType`  |
| `ResponseType` |

##### Parameters

| Parameter     | Type                        |
| ------------- | --------------------------- |
| `method`      | `string`                    |
| `serialize`   | (`value`) => `Buffer`       |
| `deserialize` | (`value`) => `ResponseType` |
| `metadata`    | `Metadata`                  |
| `options?`    | `CallOptions`               |

##### Returns

`ClientDuplexStream`\<`RequestType`, `ResponseType`\>

##### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).makeBidiStreamRequest`

#### Call Signature

> **makeBidiStreamRequest**\<`RequestType`, `ResponseType`\>(`method`, `serialize`, `deserialize`, `options?`): `ClientDuplexStream`\<`RequestType`, `ResponseType`\>

##### Type Parameters

| Type Parameter |
| -------------- |
| `RequestType`  |
| `ResponseType` |

##### Parameters

| Parameter     | Type                        |
| ------------- | --------------------------- |
| `method`      | `string`                    |
| `serialize`   | (`value`) => `Buffer`       |
| `deserialize` | (`value`) => `ResponseType` |
| `options?`    | `CallOptions`               |

##### Returns

`ClientDuplexStream`\<`RequestType`, `ResponseType`\>

##### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).makeBidiStreamRequest`

---

### makeClientStreamRequest()

#### Call Signature

> **makeClientStreamRequest**\<`RequestType`, `ResponseType`\>(`method`, `serialize`, `deserialize`, `metadata`, `options`, `callback`): `ClientWritableStream`\<`RequestType`\>

##### Type Parameters

| Type Parameter |
| -------------- |
| `RequestType`  |
| `ResponseType` |

##### Parameters

| Parameter     | Type                              |
| ------------- | --------------------------------- |
| `method`      | `string`                          |
| `serialize`   | (`value`) => `Buffer`             |
| `deserialize` | (`value`) => `ResponseType`       |
| `metadata`    | `Metadata`                        |
| `options`     | `CallOptions`                     |
| `callback`    | `UnaryCallback`\<`ResponseType`\> |

##### Returns

`ClientWritableStream`\<`RequestType`\>

##### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).makeClientStreamRequest`

#### Call Signature

> **makeClientStreamRequest**\<`RequestType`, `ResponseType`\>(`method`, `serialize`, `deserialize`, `metadata`, `callback`): `ClientWritableStream`\<`RequestType`\>

##### Type Parameters

| Type Parameter |
| -------------- |
| `RequestType`  |
| `ResponseType` |

##### Parameters

| Parameter     | Type                              |
| ------------- | --------------------------------- |
| `method`      | `string`                          |
| `serialize`   | (`value`) => `Buffer`             |
| `deserialize` | (`value`) => `ResponseType`       |
| `metadata`    | `Metadata`                        |
| `callback`    | `UnaryCallback`\<`ResponseType`\> |

##### Returns

`ClientWritableStream`\<`RequestType`\>

##### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).makeClientStreamRequest`

#### Call Signature

> **makeClientStreamRequest**\<`RequestType`, `ResponseType`\>(`method`, `serialize`, `deserialize`, `options`, `callback`): `ClientWritableStream`\<`RequestType`\>

##### Type Parameters

| Type Parameter |
| -------------- |
| `RequestType`  |
| `ResponseType` |

##### Parameters

| Parameter     | Type                              |
| ------------- | --------------------------------- |
| `method`      | `string`                          |
| `serialize`   | (`value`) => `Buffer`             |
| `deserialize` | (`value`) => `ResponseType`       |
| `options`     | `CallOptions`                     |
| `callback`    | `UnaryCallback`\<`ResponseType`\> |

##### Returns

`ClientWritableStream`\<`RequestType`\>

##### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).makeClientStreamRequest`

#### Call Signature

> **makeClientStreamRequest**\<`RequestType`, `ResponseType`\>(`method`, `serialize`, `deserialize`, `callback`): `ClientWritableStream`\<`RequestType`\>

##### Type Parameters

| Type Parameter |
| -------------- |
| `RequestType`  |
| `ResponseType` |

##### Parameters

| Parameter     | Type                              |
| ------------- | --------------------------------- |
| `method`      | `string`                          |
| `serialize`   | (`value`) => `Buffer`             |
| `deserialize` | (`value`) => `ResponseType`       |
| `callback`    | `UnaryCallback`\<`ResponseType`\> |

##### Returns

`ClientWritableStream`\<`RequestType`\>

##### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).makeClientStreamRequest`

---

### makeServerStreamRequest()

#### Call Signature

> **makeServerStreamRequest**\<`RequestType`, `ResponseType`\>(`method`, `serialize`, `deserialize`, `argument`, `metadata`, `options?`): `ClientReadableStream`\<`ResponseType`\>

##### Type Parameters

| Type Parameter |
| -------------- |
| `RequestType`  |
| `ResponseType` |

##### Parameters

| Parameter     | Type                        |
| ------------- | --------------------------- |
| `method`      | `string`                    |
| `serialize`   | (`value`) => `Buffer`       |
| `deserialize` | (`value`) => `ResponseType` |
| `argument`    | `RequestType`               |
| `metadata`    | `Metadata`                  |
| `options?`    | `CallOptions`               |

##### Returns

`ClientReadableStream`\<`ResponseType`\>

##### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).makeServerStreamRequest`

#### Call Signature

> **makeServerStreamRequest**\<`RequestType`, `ResponseType`\>(`method`, `serialize`, `deserialize`, `argument`, `options?`): `ClientReadableStream`\<`ResponseType`\>

##### Type Parameters

| Type Parameter |
| -------------- |
| `RequestType`  |
| `ResponseType` |

##### Parameters

| Parameter     | Type                        |
| ------------- | --------------------------- |
| `method`      | `string`                    |
| `serialize`   | (`value`) => `Buffer`       |
| `deserialize` | (`value`) => `ResponseType` |
| `argument`    | `RequestType`               |
| `options?`    | `CallOptions`               |

##### Returns

`ClientReadableStream`\<`ResponseType`\>

##### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).makeServerStreamRequest`

---

### makeUnaryRequest()

#### Call Signature

> **makeUnaryRequest**\<`RequestType`, `ResponseType`\>(`method`, `serialize`, `deserialize`, `argument`, `metadata`, `options`, `callback`): `SurfaceCall`

##### Type Parameters

| Type Parameter |
| -------------- |
| `RequestType`  |
| `ResponseType` |

##### Parameters

| Parameter     | Type                              |
| ------------- | --------------------------------- |
| `method`      | `string`                          |
| `serialize`   | (`value`) => `Buffer`             |
| `deserialize` | (`value`) => `ResponseType`       |
| `argument`    | `RequestType`                     |
| `metadata`    | `Metadata`                        |
| `options`     | `CallOptions`                     |
| `callback`    | `UnaryCallback`\<`ResponseType`\> |

##### Returns

`SurfaceCall`

##### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).makeUnaryRequest`

#### Call Signature

> **makeUnaryRequest**\<`RequestType`, `ResponseType`\>(`method`, `serialize`, `deserialize`, `argument`, `metadata`, `callback`): `SurfaceCall`

##### Type Parameters

| Type Parameter |
| -------------- |
| `RequestType`  |
| `ResponseType` |

##### Parameters

| Parameter     | Type                              |
| ------------- | --------------------------------- |
| `method`      | `string`                          |
| `serialize`   | (`value`) => `Buffer`             |
| `deserialize` | (`value`) => `ResponseType`       |
| `argument`    | `RequestType`                     |
| `metadata`    | `Metadata`                        |
| `callback`    | `UnaryCallback`\<`ResponseType`\> |

##### Returns

`SurfaceCall`

##### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).makeUnaryRequest`

#### Call Signature

> **makeUnaryRequest**\<`RequestType`, `ResponseType`\>(`method`, `serialize`, `deserialize`, `argument`, `options`, `callback`): `SurfaceCall`

##### Type Parameters

| Type Parameter |
| -------------- |
| `RequestType`  |
| `ResponseType` |

##### Parameters

| Parameter     | Type                              |
| ------------- | --------------------------------- |
| `method`      | `string`                          |
| `serialize`   | (`value`) => `Buffer`             |
| `deserialize` | (`value`) => `ResponseType`       |
| `argument`    | `RequestType`                     |
| `options`     | `CallOptions`                     |
| `callback`    | `UnaryCallback`\<`ResponseType`\> |

##### Returns

`SurfaceCall`

##### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).makeUnaryRequest`

#### Call Signature

> **makeUnaryRequest**\<`RequestType`, `ResponseType`\>(`method`, `serialize`, `deserialize`, `argument`, `callback`): `SurfaceCall`

##### Type Parameters

| Type Parameter |
| -------------- |
| `RequestType`  |
| `ResponseType` |

##### Parameters

| Parameter     | Type                              |
| ------------- | --------------------------------- |
| `method`      | `string`                          |
| `serialize`   | (`value`) => `Buffer`             |
| `deserialize` | (`value`) => `ResponseType`       |
| `argument`    | `RequestType`                     |
| `callback`    | `UnaryCallback`\<`ResponseType`\> |

##### Returns

`SurfaceCall`

##### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).makeUnaryRequest`

---

### waitForReady()

> **waitForReady**(`deadline`, `callback`): `void`

#### Parameters

| Parameter  | Type                 |
| ---------- | -------------------- |
| `deadline` | `Deadline`           |
| `callback` | (`error?`) => `void` |

#### Returns

`void`

#### Inherited from

`grpc_1.makeGenericClientConstructor( UnimplementedUsersService.definition, "Users", {}, ).waitForReady`
