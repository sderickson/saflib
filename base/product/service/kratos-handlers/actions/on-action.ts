import type { KratosActionHandler } from "@saflib/ory-kratos-http";
import { recordKratosAction } from "@saflib/audit-http/express/kratos-action-audit";
import { getBaseAuditDbKey } from "@saflib/base-audit";

/**
 * Kratos webhook dispatcher: every successful sign-in, sign-up, recovery and
 * settings change (password, second factors) becomes an audit row, so the
 * audit log (and agents reading it through the ops API) can spot unusual
 * account activity. Add other fan-out (welcome email, notifications) here.
 */
export const makeKratosActionHandler = (): KratosActionHandler => ({
  onAction: async (action) => {
    await recordKratosAction(getBaseAuditDbKey(), action);
  },
});
