# Environment Variables

This package uses environment variables. The schema for these variables is as follows:

| Variable                    | Description                                                                                                         | Type   | Required |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| NODEMAILER_TRANSPORT_CONFIG | JSON string which can be passed into nodemailer.createTransport. See https://nodemailer.com/usage for more details. | string | Yes      |
