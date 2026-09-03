[**@saflib/jobs**](../index.md)

---

# Interface: JobsRuntimeHandle

## Properties

### stop()

> **stop**: () => `Promise`\<`void`>\>

Stop polling, wait for in-flight work, close the internal caller.

#### Returns

`Promise`\<`void`\>

---

### wake()

> **wake**: () => `void`

Immediate claim pass — enqueue handler fast path.

#### Returns

`void`
