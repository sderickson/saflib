**@saflib/links**

---

# @saflib/links

## Interfaces

| Interface                                | Description                                 |
| ---------------------------------------- | ------------------------------------------- |
| [LinkOptions](interfaces/LinkOptions.md) | Options for creating a fully-qualified url. |

## Type Aliases

| Type Alias                         | Description                                                           |
| ---------------------------------- | --------------------------------------------------------------------- |
| [Link](type-aliases/Link.md)       | A link to a page on a website, independent of the domain or protocol. |
| [LinkMap](type-aliases/LinkMap.md) | A collection of links, keyed by a name.                               |

## Functions

| Function                                              | Description                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [getClientName](functions/getClientName.md)           | Getter for the client name.                                                                                                                                                                                                                                                                                                                       |
| [getHost](functions/getHost.md)                       | Utility to get the current host, including the port, e.g. "localhost:3000".                                                                                                                                                                                                                                                                       |
| [getProtocol](functions/getProtocol.md)               | Utility to get the current protocol the same way document.location.protocol does, e.g. "http:" or "https:".                                                                                                                                                                                                                                       |
| [linkToHref](functions/linkToHref.md)                 | Given a Link object, return a fully-qualified url. Any provided params must be specified in the Link object.                                                                                                                                                                                                                                      |
| [linkToHrefWithHost](functions/linkToHrefWithHost.md) | -                                                                                                                                                                                                                                                                                                                                                 |
| [linkToProps](functions/linkToProps.md)               | Given a Link object, return props which will work with vuetify components such as v-list-item and b-btn. What is returned is based on the current domain; if the link is to the same subdomain, this returns a "to" prop, otherwise it returns an "href" prop. That way a link will use vue-router wherever possible, to avoid full page reloads. |
| [navigateToLink](functions/navigateToLink.md)         | Simple utility to do a full page redirect to a link.                                                                                                                                                                                                                                                                                              |
| [setClientName](functions/setClientName.md)           | Call when the SPA starts, providing the name of the client. It should be the same as the subdomain, or "root" if it's the root domain.                                                                                                                                                                                                            |
