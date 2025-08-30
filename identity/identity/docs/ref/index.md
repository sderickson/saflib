**@saflib/identity**

---

# @saflib/identity

## Interfaces

| Interface                                                                | Description                                                                                                       |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [IdentityServiceCallbacks](interfaces/IdentityServiceCallbacks.md)       | Callbacks for events which occur in the identity service. This is the main way to hook into the identity service. |
| [StartIdentityServiceOptions](interfaces/StartIdentityServiceOptions.md) | Options for starting the auth service, including both HTTP and gRPC servers.                                      |

## Type Aliases

| Type Alias                   | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| [User](type-aliases/User.md) | The underlying user model, provided to callbacks. |

## Functions

| Function                                                  | Description                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------- |
| [startIdentityService](functions/startIdentityService.md) | Start the auth service, including both HTTP and gRPC servers. |
