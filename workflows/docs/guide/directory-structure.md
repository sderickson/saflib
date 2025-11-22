# Directory structure

## Overview

The recommended directory structure for your workflows is:

```
your-project/
├── package.json
├── docs/
│   └── ...
├── workflows/
│   ├── templates/
│   │   └── ...
│   ├── index.ts
│   ├── workflow-1.ts
│   ├── workflow-1.test.ts
│   ├── workflow-2.ts
│   ├── workflow-2.test.ts
│   └── ...
```

If you have a monorepo structure with multiple packages in a single project, you should have a workflows directory in each package. If you have a large project structure but it is only one package, you may need to organize your workflows folder into nested subdirectories which mimic the structure of the project.

## Templates

Workflows often start by copying template files into the target directory. The templates directory should mimic the structure of the part of the project that those templates will be copied to.

## Documentation

Documentation is useful to refer to, both for creating workflows, and as part of workflows. So keep documentation near the workflows for easy reference.

## Workflows

Workflows for the same area of the codebase should reside together, and will draw from the same template files.