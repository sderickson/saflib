export class AuditChainCorruptError extends Error {
  readonly phase: string;
  readonly reason: string;

  constructor(phase: string, reason: string, message?: string) {
    super(message ?? `Audit chain verification failed (${phase}): ${reason}`);
    this.name = "AuditChainCorruptError";
    this.phase = phase;
    this.reason = reason;
  }
}

export class AuditSealConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditSealConfigError";
  }
}

export class AuditSealShipError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AuditSealShipError";
    this.cause = cause;
  }
}

/** @deprecated Use {@link AuditSealShipError}. */
export class AuditSealUploadError extends AuditSealShipError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "AuditSealUploadError";
  }
}

/** @deprecated Use {@link AuditSealShipError}. */
export class AuditSealEmailError extends AuditSealShipError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "AuditSealEmailError";
  }
}

export class AuditSealInMemoryDbError extends Error {
  constructor() {
    super("Cannot seal an in-memory audit database");
    this.name = "AuditSealInMemoryDbError";
  }
}
