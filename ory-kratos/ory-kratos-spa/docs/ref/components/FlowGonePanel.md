**@saflib/vue**

---

# FlowGonePanel

Source: `pages/common/FlowGonePanel.vue`

## Props

| Name         | Type                                      | Default | Required | Description                                                               |
| ------------ | ----------------------------------------- | ------- | -------- | ------------------------------------------------------------------------- |
| result       | FlowGone                                  | —       | yes      | —                                                                         |
| restartPath  | string                                    | —       | yes      | Route path to navigate to when starting again (e.g. `/new-registration`). |
| restartQuery | Record&lt;string, string&gt; \| undefined | —       | no       | Optional query for restart (e.g. preserve `return_to`).                   |
