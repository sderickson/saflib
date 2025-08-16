# Conventions

These are not hard-and-fast rules for every stack, however these are good conventions to set one way or another for every stack.

## Container Volumes

If a package expects to have some state in the filesystem, such as an SQLite store or really any file object, it should be placed in directory called `data/` in the root of the package. This way all packages which require state can be identified easily such as for container volumes.

If a package might receive some larger piece of configuration beyond environment variables, it should be checked for in a directory called `config/` in the root of the package. Again, this is an easy way to identify directories which can be mounted as container volumes.

Files for state that are stored in `data/` should be gitignored. Both `data/` and `config/` should have a a single, empty `.gitkeep` file.

## Package "source"

Most packages have a core set of source files which is most of the logic contained within. These files should be in a folder which reflects the kind of package it is.

| Package Type | Source Dir Name |
| ------------ | --------------- |
| Library      | `src`           |
| DB           | `queries`       |
| HTTP         | `routes`        |
| Web App      | `pages`         |
| gRPCs        | `protos`        |

Other files, such as exports and test configs, should be in the root directory.

## Grouped Packages

Sometimes packages are related to one another, such as services which are composed of multiple subsystems. These should be stored in their own directory with the name of the service or client, and each package should be prefixed with the name of the service or client.

Share code should be in a package suffixed with `-common`.
