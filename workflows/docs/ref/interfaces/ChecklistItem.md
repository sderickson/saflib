[**@saflib/workflows**](../index.md)

---

# Interface: ChecklistItem

Simple checklist object. Machines should append one to the list for each
state. If a state invokes another machine, add its checklist output as subitems
to create a recursively generated checklist tree.

## Properties

### description

> **description**: `string`

---

### subitems?

> `optional` **subitems**: `ChecklistItem`[]
