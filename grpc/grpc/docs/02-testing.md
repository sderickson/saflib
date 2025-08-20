# Testing

Testing gRPC implementations is not very well defined. I only have [one test file](https://github.com/sderickson/saflib/blob/main/identity/identity-service/rpcs/users/get-user-profile.test.ts) written and maintained currently and it's a bit heavy given that it spins up the entire server and connects to it via a client.

There's work here to do to make testing methods simpler and more lightweight, while also including all wrappers.
