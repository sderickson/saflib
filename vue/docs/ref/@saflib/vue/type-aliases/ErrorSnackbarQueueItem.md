[**@saflib/vue**](../../../index.md)

---

# Type Alias: ErrorSnackbarQueueItem

> **ErrorSnackbarQueueItem** = `string` \| \{ `action?`: [`ErrorSnackbarAction`](ErrorSnackbarAction.md); `text`: `string`; \}

Queue item for VSnackbarQueue: strings become `{ text }` internally;
objects may include `action` for the error snackbar `#actions` slot only.
