export {
  buildReferenceGraph,
  workspaceDepsOf,
  applyCompositionRootReferences,
  type ReferenceGraph,
  type ReferenceGraphNode,
  type BuildReferenceGraphResult,
} from "./build-graph.ts";
export {
  detectReferenceCycles,
  type ReferenceCycle,
} from "./detect-cycles.ts";
export { resolveTsconfigEntry } from "./resolve-entry.ts";
export {
  previewReferencesGenerate,
  generateReferences,
  checkReferences,
  computeSolutions,
  isWorkflowTemplatePackage,
  type GenerateReferencesPreview,
  type PackageReferencePreview,
  type SolutionReferencePreview,
  type CheckReferencesResult,
  type ReferenceDrift,
} from "./generate.ts";
export {
  mergePackageReferences,
  isInternalReference,
  referencesEqual,
  sortReferences,
  type TsconfigReference,
} from "./tsconfig-io.ts";
