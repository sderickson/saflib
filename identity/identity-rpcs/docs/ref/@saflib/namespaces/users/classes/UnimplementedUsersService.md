[**@saflib/identity-rpcs**](../../../../index.md)

---

# Abstract Class: UnimplementedUsersService

## Indexable

\[`method`: `string`\]: `UntypedHandleCall`

## Constructors

### Constructor

> **new UnimplementedUsersService**(): `UnimplementedUsersService`

#### Returns

`UnimplementedUsersService`

## Properties

### definition

> `static` **definition**: `object`

#### GetUserProfile

> **GetUserProfile**: `object`

##### GetUserProfile.path

> **path**: `string` = `"/saflib.auth.v1.Users/GetUserProfile"`

##### GetUserProfile.requestDeserialize()

> **requestDeserialize**: (`bytes`) => [`GetUserProfileRequest`](GetUserProfileRequest.md)

###### Parameters

| Parameter | Type     |
| --------- | -------- |
| `bytes`   | `Buffer` |

###### Returns

[`GetUserProfileRequest`](GetUserProfileRequest.md)

##### GetUserProfile.requestSerialize()

> **requestSerialize**: (`message`) => `Buffer`\<`ArrayBuffer`\>

###### Parameters

| Parameter | Type                                                |
| --------- | --------------------------------------------------- |
| `message` | [`GetUserProfileRequest`](GetUserProfileRequest.md) |

###### Returns

`Buffer`\<`ArrayBuffer`\>

##### GetUserProfile.requestStream

> **requestStream**: `boolean` = `false`

##### GetUserProfile.responseDeserialize()

> **responseDeserialize**: (`bytes`) => [`GetUserProfileResponse`](GetUserProfileResponse.md)

###### Parameters

| Parameter | Type     |
| --------- | -------- |
| `bytes`   | `Buffer` |

###### Returns

[`GetUserProfileResponse`](GetUserProfileResponse.md)

##### GetUserProfile.responseSerialize()

> **responseSerialize**: (`message`) => `Buffer`\<`ArrayBuffer`\>

###### Parameters

| Parameter | Type                                                  |
| --------- | ----------------------------------------------------- |
| `message` | [`GetUserProfileResponse`](GetUserProfileResponse.md) |

###### Returns

`Buffer`\<`ArrayBuffer`\>

##### GetUserProfile.responseStream

> **responseStream**: `boolean` = `false`

## Methods

### GetUserProfile()

> `abstract` **GetUserProfile**(`call`, `callback`): `void`

#### Parameters

| Parameter  | Type                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `call`     | `ServerUnaryCall`\<[`GetUserProfileRequest`](GetUserProfileRequest.md), [`GetUserProfileResponse`](GetUserProfileResponse.md)\> |
| `callback` | `sendUnaryData`\<[`GetUserProfileResponse`](GetUserProfileResponse.md)\>                                                        |

#### Returns

`void`
