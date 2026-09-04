# Overview

The dev-site suite provides a full-stack framework and streamlined UI to help people manage development of SAF products. It highlights key changes across commits, surfaces problem areas in the codebase, and will eventually integrate with workflows to make following conventions that much easier.

When you run the development stack (`npm run dev` in your product's `dev` folder), the dev-site will also run so that it can be used to help make sense of and review major changes being made.

Commit analysis parses each source blob with [@saflib/imports](../imports/docs/01-overview.md) `buildFileSpecialty()` (backed by [@saflib/parser](../parser/docs/01-overview.md)) and stores the results in `blob_facts` for export/spec/DB inventories.
