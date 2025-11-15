[**@saflib/grpc**](../../../index.md)

---

# Class: SafRequest

## Extends

- `Message`

## Constructors

### Constructor

> **new SafRequest**(`data?`): `SafRequest`

#### Parameters

| Parameter | Type                              |
| --------- | --------------------------------- |
| `data?`   | `any`[] \| \{ `id?`: `string`; \} |

#### Returns

`SafRequest`

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

### id

#### Get Signature

> **get** **id**(): `string`

##### Returns

`string`

#### Set Signature

> **set** **id**(`value`): `void`

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

##### id?

> `optional` **id**: `string`

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

> `static` **deserialize**(`bytes`): `SafRequest`

#### Parameters

| Parameter | Type                                                |
| --------- | --------------------------------------------------- |
| `bytes`   | `Uint8Array`\<`ArrayBufferLike`\> \| `BinaryReader` |

#### Returns

`SafRequest`

---

### deserializeBinary()

> `static` **deserializeBinary**(`bytes`): `SafRequest`

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `bytes`   | `Uint8Array` |

#### Returns

`SafRequest`

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

> `static` **fromObject**(`data`): `SafRequest`

#### Parameters

| Parameter  | Type                   |
| ---------- | ---------------------- |
| `data`     | \{ `id?`: `string`; \} |
| `data.id?` | `string`               |

#### Returns

`SafRequest`

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
