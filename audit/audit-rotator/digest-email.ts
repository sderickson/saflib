import type { EmailService } from "@saflib/email-service";

/** What a seal digest reports about one sealed audit window. */
export type AuditDigest = {
  filename: string;
  sha256Hex: string;
  rowCount: number;
  firstTs: string;
  lastTs: string;
  headHash: string;
  tailHash: string;
  branchCount?: number;
  /** Object-store key the archive was uploaded to. */
  archiveKey: string;
  /** Deployment name, e.g. `production`. */
  environment: string;
  /** Service label shown in the digest, e.g. `api`. */
  serviceName: string;
  trigger: "cron" | "admin";
  triggeredByUserId?: string;
  gitCommitRoot?: string;
  gitCommitSaflib?: string;
  /** The previous digest, to chain windows together; absent for the first. */
  previous?: {
    archiveKey: string;
    chainTailHash: string;
    sentAt: string;
  };
};

/** Plain-text digest email for one sealed window. */
export function formatAuditDigestEmail(digest: AuditDigest): {
  subject: string;
  text: string;
} {
  const subject = `[audit] ${digest.environment} ${digest.filename} — ${digest.rowCount} events`;
  const { previous } = digest;
  const text = [
    `Service:               ${digest.serviceName}`,
    `Environment:           ${digest.environment}`,
    `Trigger:               ${digest.trigger}${digest.triggeredByUserId ? ` (admin: ${digest.triggeredByUserId})` : ""}`,
    `Window first row (UTC):  ${digest.firstTs}`,
    `Window last row (UTC):   ${digest.lastTs}`,
    `Event count:           ${digest.rowCount}`,
    ``,
    `Archive key:           ${digest.archiveKey}`,
    `Archive filename:      ${digest.filename}`,
    `Archive SHA-256:       ${digest.sha256Hex}`,
    `Chain genesis (this window): 0000000000000000000000000000000000000000000000000000000000000000`,
    `Chain head:            ${digest.headHash}`,
    `Chain tail:            ${digest.tailHash}`,
    ...(digest.branchCount != null && digest.branchCount > 0
      ? [
          `Chain branches:        ${digest.branchCount} (forked rows sharing a parent)`,
        ]
      : []),
    ``,
    previous
      ? `Previous archive:      ${previous.archiveKey}`
      : `Previous archive:      (none — first sealed window)`,
    previous
      ? `Previous chain tail:   ${previous.chainTailHash}`
      : `Previous chain tail:   (none)`,
    previous ? `Previous digest sent:  ${previous.sentAt}` : ``,
    ``,
    `Sealed at:             ${new Date().toISOString()}`,
    digest.gitCommitRoot
      ? `Git commit (root):     ${digest.gitCommitRoot}`
      : ``,
    digest.gitCommitSaflib
      ? `Git commit (saflib):   ${digest.gitCommitSaflib}`
      : ``,
  ]
    .filter((line) => line !== "")
    .join("\n");
  return { subject, text };
}

/** Sends {@link formatAuditDigestEmail} for `digest`. */
export async function sendAuditDigestEmail(options: {
  emailService: EmailService;
  from: string;
  to: string;
  digest: AuditDigest;
}): Promise<void> {
  const { subject, text } = formatAuditDigestEmail(options.digest);
  await options.emailService.sendEmail({
    from: options.from,
    to: options.to,
    subject,
    text,
  });
}
