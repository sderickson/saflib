# Environment Variables

This package uses environment variables. The schema for these variables is as follows:

| Variable          | Description                                                                                                                                    | Type   | Required |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| ALLOW_DB_CREATION | Whether to allow the creation of new databases. Useful for ensuring existing production environments don't inadvertently create new databases. | string |          |
