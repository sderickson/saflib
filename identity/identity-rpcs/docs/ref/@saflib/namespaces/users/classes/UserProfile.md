[**@saflib/identity-rpcs**](../../../../index.md)

---

# Class: UserProfile

## Extends

- `Message`

## Constructors

### Constructor

> **new UserProfile**(`data?`): `UserProfile`

#### Parameters

| Parameter | Type                                                                                                                                                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data?`   | `any`[] \| \{ `created_at?`: [`Timestamp`](../../timestamp/classes/Timestamp.md); `email?`: `string`; `email_verified?`: `boolean`; `family_name?`: `string`; `given_name?`: `string`; `name?`: `string`; `user_id?`: `string`; \} |

#### Returns

`UserProfile`

#### Overrides

`pb_1.Message.constructor`

## Properties

### extensions

> `static` **extensions**: `object`

#### Index Signature

\[`key`: `number`\]: `ExtensionFieldInfo`\<`Message`\>

#### Inherited from

`pb_1.Message.extensions`

---

### extensionsBinary

> `static` **extensionsBinary**: `object`

#### Index Signature

\[`key`: `number`\]: `ExtensionFieldBinaryInfo`\<`Message`\>

#### Inherited from

`pb_1.Message.extensionsBinary`

## Accessors

### created_at

#### Get Signature

> **get** **created_at**(): [`Timestamp`](../../timestamp/classes/Timestamp.md)

##### Returns

[`Timestamp`](../../timestamp/classes/Timestamp.md)

#### Set Signature

> **set** **created_at**(`value`): `void`

##### Parameters

| Parameter | Type                                                |
| --------- | --------------------------------------------------- |
| `value`   | [`Timestamp`](../../timestamp/classes/Timestamp.md) |

##### Returns

`void`

---

### email

#### Get Signature

> **get** **email**(): `string`

##### Returns

`string`

#### Set Signature

> **set** **email**(`value`): `void`

##### Parameters

| Parameter | Type     |
| --------- | -------- |
| `value`   | `string` |

##### Returns

`void`

---

### email_verified

#### Get Signature

> **get** **email_verified**(): `boolean`

##### Returns

`boolean`

#### Set Signature

> **set** **email_verified**(`value`): `void`

##### Parameters

| Parameter | Type      |
| --------- | --------- |
| `value`   | `boolean` |

##### Returns

`void`

---

### family_name

#### Get Signature

> **get** **family_name**(): `string`

##### Returns

`string`

#### Set Signature

> **set** **family_name**(`value`): `void`

##### Parameters

| Parameter | Type     |
| --------- | -------- |
| `value`   | `string` |

##### Returns

`void`

---

### given_name

#### Get Signature

> **get** **given_name**(): `string`

##### Returns

`string`

#### Set Signature

> **set** **given_name**(`value`): `void`

##### Parameters

| Parameter | Type     |
| --------- | -------- |
| `value`   | `string` |

##### Returns

`void`

---

### has_created_at

#### Get Signature

> **get** **has_created_at**(): `boolean`

##### Returns

`boolean`

---

### name

#### Get Signature

> **get** **name**(): `string`

##### Returns

`string`

#### Set Signature

> **set** **name**(`value`): `void`

##### Parameters

| Parameter | Type     |
| --------- | -------- |
| `value`   | `string` |

##### Returns

`void`

---

### user_id

#### Get Signature

> **get** **user_id**(): `string`

##### Returns

`string`

#### Set Signature

> **set** **user_id**(`value`): `void`

##### Parameters

| Parameter | Type     |
| --------- | -------- |
| `value`   | `string` |

##### Returns

`void`

## Methods

### clone()

> **clone**(): `this`

#### Returns

`this`

#### Inherited from

`pb_1.Message.clone`

---

### cloneMessage()

> **cloneMessage**(): `this`

#### Returns

`this`

#### Inherited from

`pb_1.Message.cloneMessage`

---

### getExtension()

> **getExtension**\<`T`\>(`fieldInfo`): `T`

#### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

#### Parameters

| Parameter   | Type                        |
| ----------- | --------------------------- |
| `fieldInfo` | `ExtensionFieldInfo`\<`T`\> |

#### Returns

`T`

#### Inherited from

`pb_1.Message.getExtension`

---

### getJsPbMessageId()

> **getJsPbMessageId**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Inherited from

`pb_1.Message.getJsPbMessageId`

---

### readBinaryExtension()

> **readBinaryExtension**(`proto`, `reader`, `extensions`, `setExtensionFn`): `void`

#### Parameters

| Parameter        | Type                                                               |
| ---------------- | ------------------------------------------------------------------ |
| `proto`          | `Message`                                                          |
| `reader`         | `BinaryReader`                                                     |
| `extensions`     | \{\[`key`: `number`\]: `ExtensionFieldBinaryInfo`\<`Message`\>; \} |
| `setExtensionFn` | \<`T`\>(`fieldInfo`, `val`) => `void`                              |

#### Returns

`void`

#### Inherited from

`pb_1.Message.readBinaryExtension`

---

### serialize()

#### Call Signature

> **serialize**(): `Uint8Array`

##### Returns

`Uint8Array`

#### Call Signature

> **serialize**(`w`): `void`

##### Parameters

| Parameter | Type           |
| --------- | -------------- |
| `w`       | `BinaryWriter` |

##### Returns

`void`

---

### serializeBinary()

> **serializeBinary**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Overrides

`pb_1.Message.serializeBinary`

---

### serializeBinaryExtensions()

> **serializeBinaryExtensions**(`proto`, `writer`, `extensions`, `getExtensionFn`): `void`

#### Parameters

| Parameter        | Type                                                               |
| ---------------- | ------------------------------------------------------------------ |
| `proto`          | `Message`                                                          |
| `writer`         | `BinaryWriter`                                                     |
| `extensions`     | \{\[`key`: `number`\]: `ExtensionFieldBinaryInfo`\<`Message`\>; \} |
| `getExtensionFn` | \<`T`\>(`fieldInfo`) => `T`                                        |

#### Returns

`void`

#### Inherited from

`pb_1.Message.serializeBinaryExtensions`

---

### setExtension()

> **setExtension**\<`T`\>(`fieldInfo`, `value`): `void`

#### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

#### Parameters

| Parameter   | Type                        |
| ----------- | --------------------------- |
| `fieldInfo` | `ExtensionFieldInfo`\<`T`\> |
| `value`     | `T`                         |

#### Returns

`void`

#### Inherited from

`pb_1.Message.setExtension`

---

### toArray()

> **toArray**(): `MessageArray`

#### Returns

`MessageArray`

#### Inherited from

`pb_1.Message.toArray`

---

### toObject()

> **toObject**(): `object`

#### Returns

`object`

##### created_at?

> `optional` **created_at**: `object`

###### created_at.nanos?

> `optional` **nanos**: `number`

###### created_at.seconds?

> `optional` **seconds**: `number`

##### email?

> `optional` **email**: `string`

##### email_verified?

> `optional` **email_verified**: `boolean`

##### family_name?

> `optional` **family_name**: `string`

##### given_name?

> `optional` **given_name**: `string`

##### name?

> `optional` **name**: `string`

##### user_id?

> `optional` **user_id**: `string`

#### Overrides

`pb_1.Message.toObject`

---

### toString()

> **toString**(): `string`

#### Returns

`string`

#### Inherited from

`pb_1.Message.toString`

---

### addToRepeatedField()

> `static` **addToRepeatedField**(`msg`, `fieldNumber`, `value`, `index?`): `void`

#### Parameters

| Parameter     | Type      |
| ------------- | --------- |
| `msg`         | `Message` |
| `fieldNumber` | `number`  |
| `value`       | `any`     |
| `index?`      | `number`  |

#### Returns

`void`

#### Inherited from

`pb_1.Message.addToRepeatedField`

---

### addToRepeatedWrapperField()

> `static` **addToRepeatedWrapperField**\<`T`\>(`msg`, `fieldNumber`, `value`, `ctor`, `index?`): `T`

#### Type Parameters

| Type Parameter          |
| ----------------------- |
| `T` _extends_ `Message` |

#### Parameters

| Parameter     | Type               |
| ------------- | ------------------ |
| `msg`         | `Message`          |
| `fieldNumber` | `number`           |
| `value`       | `undefined` \| `T` |
| `ctor`        | () => `T`          |
| `index?`      | `number`           |

#### Returns

`T`

#### Inherited from

`pb_1.Message.addToRepeatedWrapperField`

---

### bytesAsB64()

> `static` **bytesAsB64**(`bytes`): `string`

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `bytes`   | `Uint8Array` |

#### Returns

`string`

#### Inherited from

`pb_1.Message.bytesAsB64`

---

### bytesAsU8()

> `static` **bytesAsU8**(`str`): `Uint8Array`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `str`     | `string` |

#### Returns

`Uint8Array`

#### Inherited from

`pb_1.Message.bytesAsU8`

---

### bytesListAsB64()

> `static` **bytesListAsB64**(`bytesList`): `string`[]

#### Parameters

| Parameter   | Type                                |
| ----------- | ----------------------------------- |
| `bytesList` | `Uint8Array`\<`ArrayBufferLike`\>[] |

#### Returns

`string`[]

#### Inherited from

`pb_1.Message.bytesListAsB64`

---

### bytesListAsU8()

> `static` **bytesListAsU8**(`strList`): `Uint8Array`\<`ArrayBufferLike`\>[]

#### Parameters

| Parameter | Type       |
| --------- | ---------- |
| `strList` | `string`[] |

#### Returns

`Uint8Array`\<`ArrayBufferLike`\>[]

#### Inherited from

`pb_1.Message.bytesListAsU8`

---

### clone()

> `static` **clone**\<`T`\>(`msg`): `T`

#### Type Parameters

| Type Parameter          |
| ----------------------- |
| `T` _extends_ `Message` |

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `msg`     | `T`  |

#### Returns

`T`

#### Inherited from

`pb_1.Message.clone`

---

### cloneMessage()

> `static` **cloneMessage**\<`T`\>(`msg`): `T`

#### Type Parameters

| Type Parameter          |
| ----------------------- |
| `T` _extends_ `Message` |

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `msg`     | `T`  |

#### Returns

`T`

#### Inherited from

`pb_1.Message.cloneMessage`

---

### compareExtensions()

> `static` **compareExtensions**(`extension1`, `extension2`): `boolean`

#### Parameters

| Parameter    | Type  |
| ------------ | ----- |
| `extension1` | \{ \} |
| `extension2` | \{ \} |

#### Returns

`boolean`

#### Inherited from

`pb_1.Message.compareExtensions`

---

### compareFields()

> `static` **compareFields**(`field1`, `field2`): `boolean`

#### Parameters

| Parameter | Type  |
| --------- | ----- |
| `field1`  | `any` |
| `field2`  | `any` |

#### Returns

`boolean`

#### Inherited from

`pb_1.Message.compareFields`

---

### computeOneofCase()

> `static` **computeOneofCase**(`msg`, `oneof`): `number`

#### Parameters

| Parameter | Type       |
| --------- | ---------- |
| `msg`     | `Message`  |
| `oneof`   | `number`[] |

#### Returns

`number`

#### Inherited from

`pb_1.Message.computeOneofCase`

---

### copyInto()

> `static` **copyInto**(`fromMessage`, `toMessage`): `void`

#### Parameters

| Parameter     | Type      |
| ------------- | --------- |
| `fromMessage` | `Message` |
| `toMessage`   | `Message` |

#### Returns

`void`

#### Inherited from

`pb_1.Message.copyInto`

---

### deserialize()

> `static` **deserialize**(`bytes`): `UserProfile`

#### Parameters

| Parameter | Type                                                |
| --------- | --------------------------------------------------- |
| `bytes`   | `Uint8Array`\<`ArrayBufferLike`\> \| `BinaryReader` |

#### Returns

`UserProfile`

---

### deserializeBinary()

> `static` **deserializeBinary**(`bytes`): `UserProfile`

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `bytes`   | `Uint8Array` |

#### Returns

`UserProfile`

#### Overrides

`pb_1.Message.deserializeBinary`

---

### deserializeBinaryFromReader()

> `static` **deserializeBinaryFromReader**(`message`, `reader`): `Message`

#### Parameters

| Parameter | Type           |
| --------- | -------------- |
| `message` | `Message`      |
| `reader`  | `BinaryReader` |

#### Returns

`Message`

#### Inherited from

`pb_1.Message.deserializeBinaryFromReader`

---

### difference()

> `static` **difference**\<`T`\>(`m1`, `m2`): `T`

#### Type Parameters

| Type Parameter          |
| ----------------------- |
| `T` _extends_ `Message` |

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `m1`      | `T`  |
| `m2`      | `T`  |

#### Returns

`T`

#### Inherited from

`pb_1.Message.difference`

---

### equals()

> `static` **equals**(`m1`, `m2`): `boolean`

#### Parameters

| Parameter | Type      |
| --------- | --------- |
| `m1`      | `Message` |
| `m2`      | `Message` |

#### Returns

`boolean`

#### Inherited from

`pb_1.Message.equals`

---

### fromObject()

> `static` **fromObject**(`data`): `UserProfile`

#### Parameters

| Parameter                  | Type                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`                     | \{ `created_at?`: \{ `nanos?`: `number`; `seconds?`: `number`; \}; `email?`: `string`; `email_verified?`: `boolean`; `family_name?`: `string`; `given_name?`: `string`; `name?`: `string`; `user_id?`: `string`; \} |
| `data.created_at?`         | \{ `nanos?`: `number`; `seconds?`: `number`; \}                                                                                                                                                                     |
| `data.created_at.nanos?`   | `number`                                                                                                                                                                                                            |
| `data.created_at.seconds?` | `number`                                                                                                                                                                                                            |
| `data.email?`              | `string`                                                                                                                                                                                                            |
| `data.email_verified?`     | `boolean`                                                                                                                                                                                                           |
| `data.family_name?`        | `string`                                                                                                                                                                                                            |
| `data.given_name?`         | `string`                                                                                                                                                                                                            |
| `data.name?`               | `string`                                                                                                                                                                                                            |
| `data.user_id?`            | `string`                                                                                                                                                                                                            |

#### Returns

`UserProfile`

---

### getField()

> `static` **getField**(`msg`, `fieldNumber`): `null` \| `FieldValue`

#### Parameters

| Parameter     | Type      |
| ------------- | --------- |
| `msg`         | `Message` |
| `fieldNumber` | `number`  |

#### Returns

`null` \| `FieldValue`

#### Inherited from

`pb_1.Message.getField`

---

### getFieldWithDefault()

> `static` **getFieldWithDefault**\<`T`\>(`msg`, `fieldNumber`, `defaultValue`): `T`

#### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

#### Parameters

| Parameter      | Type      |
| -------------- | --------- |
| `msg`          | `Message` |
| `fieldNumber`  | `number`  |
| `defaultValue` | `T`       |

#### Returns

`T`

#### Inherited from

`pb_1.Message.getFieldWithDefault`

---

### getMapField()

> `static` **getMapField**(`msg`, `fieldNumber`, `noLazyCreate`, `valueCtor?`): `Map`\<`any`, `any`\>

#### Parameters

| Parameter      | Type               |
| -------------- | ------------------ |
| `msg`          | `Message`          |
| `fieldNumber`  | `number`           |
| `noLazyCreate` | `boolean`          |
| `valueCtor?`   | _typeof_ `Message` |

#### Returns

`Map`\<`any`, `any`\>

#### Inherited from

`pb_1.Message.getMapField`

---

### getOptionalFloatingPointField()

> `static` **getOptionalFloatingPointField**(`msg`, `fieldNumber`): `undefined` \| `number`

#### Parameters

| Parameter     | Type      |
| ------------- | --------- |
| `msg`         | `Message` |
| `fieldNumber` | `number`  |

#### Returns

`undefined` \| `number`

#### Inherited from

`pb_1.Message.getOptionalFloatingPointField`

---

### getRepeatedFloatingPointField()

> `static` **getRepeatedFloatingPointField**(`msg`, `fieldNumber`): `number`[]

#### Parameters

| Parameter     | Type      |
| ------------- | --------- |
| `msg`         | `Message` |
| `fieldNumber` | `number`  |

#### Returns

`number`[]

#### Inherited from

`pb_1.Message.getRepeatedFloatingPointField`

---

### getRepeatedWrapperField()

> `static` **getRepeatedWrapperField**\<`T`\>(`msg`, `ctor`, `fieldNumber`): `T`[]

#### Type Parameters

| Type Parameter          |
| ----------------------- |
| `T` _extends_ `Message` |

#### Parameters

| Parameter     | Type      |
| ------------- | --------- |
| `msg`         | `Message` |
| `ctor`        | () => `T` |
| `fieldNumber` | `number`  |

#### Returns

`T`[]

#### Inherited from

`pb_1.Message.getRepeatedWrapperField`

---

### getWrapperField()

> `static` **getWrapperField**\<`T`\>(`msg`, `ctor`, `fieldNumber`, `required?`): `T`

#### Type Parameters

| Type Parameter          |
| ----------------------- |
| `T` _extends_ `Message` |

#### Parameters

| Parameter     | Type      |
| ------------- | --------- |
| `msg`         | `Message` |
| `ctor`        | () => `T` |
| `fieldNumber` | `number`  |
| `required?`   | `number`  |

#### Returns

`T`

#### Inherited from

`pb_1.Message.getWrapperField`

---

### initialize()

> `static` **initialize**(`msg`, `data`, `messageId`, `suggestedPivot`, `repeatedFields?`, `oneofFields?`): `void`

#### Parameters

| Parameter         | Type                   |
| ----------------- | ---------------------- |
| `msg`             | `Message`              |
| `data`            | `MessageArray`         |
| `messageId`       | `string` \| `number`   |
| `suggestedPivot`  | `number`               |
| `repeatedFields?` | `null` \| `number`[]   |
| `oneofFields?`    | `null` \| `number`[][] |

#### Returns

`void`

#### Inherited from

`pb_1.Message.initialize`

---

### registerMessageType()

> `static` **registerMessageType**(`id`, `constructor`): `void`

#### Parameters

| Parameter     | Type               |
| ------------- | ------------------ |
| `id`          | `number`           |
| `constructor` | _typeof_ `Message` |

#### Returns

`void`

#### Inherited from

`pb_1.Message.registerMessageType`

---

### serializeBinaryToWriter()

> `static` **serializeBinaryToWriter**(`message`, `writer`): `void`

#### Parameters

| Parameter | Type           |
| --------- | -------------- |
| `message` | `Message`      |
| `writer`  | `BinaryWriter` |

#### Returns

`void`

#### Inherited from

`pb_1.Message.serializeBinaryToWriter`

---

### setField()

> `static` **setField**(`msg`, `fieldNumber`, `value`): `void`

#### Parameters

| Parameter     | Type                 |
| ------------- | -------------------- |
| `msg`         | `Message`            |
| `fieldNumber` | `number`             |
| `value`       | `ReadonlyFieldValue` |

#### Returns

`void`

#### Inherited from

`pb_1.Message.setField`

---

### setOneofField()

> `static` **setOneofField**(`msg`, `fieldNumber`, `oneof`, `value`): `void`

#### Parameters

| Parameter     | Type                 |
| ------------- | -------------------- |
| `msg`         | `Message`            |
| `fieldNumber` | `number`             |
| `oneof`       | `number`[]           |
| `value`       | `ReadonlyFieldValue` |

#### Returns

`void`

#### Inherited from

`pb_1.Message.setOneofField`

---

### setOneofWrapperField()

> `static` **setOneofWrapperField**(`msg`, `fieldNumber`, `oneof`, `value`): `void`

#### Parameters

| Parameter     | Type       |
| ------------- | ---------- |
| `msg`         | `Message`  |
| `fieldNumber` | `number`   |
| `oneof`       | `number`[] |
| `value`       | `any`      |

#### Returns

`void`

#### Inherited from

`pb_1.Message.setOneofWrapperField`

---

### setRepeatedWrapperField()

> `static` **setRepeatedWrapperField**\<`T`\>(`msg`, `fieldNumber`, `value?`): `void`

#### Type Parameters

| Type Parameter          |
| ----------------------- |
| `T` _extends_ `Message` |

#### Parameters

| Parameter     | Type           |
| ------------- | -------------- |
| `msg`         | `Message`      |
| `fieldNumber` | `number`       |
| `value?`      | readonly `T`[] |

#### Returns

`void`

#### Inherited from

`pb_1.Message.setRepeatedWrapperField`

---

### setWrapperField()

> `static` **setWrapperField**\<`T`\>(`msg`, `fieldNumber`, `value?`): `void`

#### Type Parameters

| Type Parameter          |
| ----------------------- |
| `T` _extends_ `Message` |

#### Parameters

| Parameter     | Type                         |
| ------------- | ---------------------------- |
| `msg`         | `Message`                    |
| `fieldNumber` | `number`                     |
| `value?`      | `Map`\<`any`, `any`\> \| `T` |

#### Returns

`void`

#### Inherited from

`pb_1.Message.setWrapperField`

---

### toMap()

> `static` **toMap**(`field`, `mapKeyGetterFn`, `toObjectFn?`, `includeInstance?`): `void`

#### Parameters

| Parameter          | Type                  |
| ------------------ | --------------------- |
| `field`            | `any`[]               |
| `mapKeyGetterFn`   | (`field`) => `string` |
| `toObjectFn?`      | `StaticToObject`      |
| `includeInstance?` | `boolean`             |

#### Returns

`void`

#### Inherited from

`pb_1.Message.toMap`

---

### toObject()

> `static` **toObject**(`includeInstance`, `msg`): `object`

#### Parameters

| Parameter         | Type      |
| ----------------- | --------- |
| `includeInstance` | `boolean` |
| `msg`             | `Message` |

#### Returns

`object`

#### Inherited from

`pb_1.Message.toObject`

---

### toObjectExtension()

> `static` **toObjectExtension**(`msg`, `obj`, `extensions`, `getExtensionFn`, `includeInstance?`): `void`

#### Parameters

| Parameter          | Type                                                         |
| ------------------ | ------------------------------------------------------------ |
| `msg`              | `Message`                                                    |
| `obj`              | \{ \}                                                        |
| `extensions`       | \{\[`key`: `number`\]: `ExtensionFieldInfo`\<`Message`\>; \} |
| `getExtensionFn`   | (`fieldInfo`) => `Message`                                   |
| `includeInstance?` | `boolean`                                                    |

#### Returns

`void`

#### Inherited from

`pb_1.Message.toObjectExtension`

---

### toObjectList()

> `static` **toObjectList**\<`T`\>(`field`, `toObjectFn`, `includeInstance?`): `object`[]

#### Type Parameters

| Type Parameter          |
| ----------------------- |
| `T` _extends_ `Message` |

#### Parameters

| Parameter          | Type                                    |
| ------------------ | --------------------------------------- |
| `field`            | `T`[]                                   |
| `toObjectFn`       | (`includeInstance`, `data`) => `object` |
| `includeInstance?` | `boolean`                               |

#### Returns

`object`[]

#### Inherited from

`pb_1.Message.toObjectList`
