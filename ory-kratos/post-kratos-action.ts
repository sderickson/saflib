import type { Handler } from "express";
import type {
  KratosAction,
  KratosActionContext,
  KratosActionHandler,
} from "./actions.ts";

/**
 * Mounts as `POST /kratos/action`. Parses JSON body, packages it as a
 * `KratosAction`, and forwards to `handler.onAction`.
 *
 * No body-shape validation is performed: the body's shape is defined by the
 * jsonnet template configured in kratos.yml (currently a pass-through
 * `function(ctx) ctx`), and the application narrows what it cares about.
 * The only check is that the body is a JSON object (not null, not array,
 * not a primitive); anything else is a 400.
 */
export const makePostKratosActionHandler =
  (handler: KratosActionHandler): Handler =>
  async (req, res, next) => {
    const body = req.body;
    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      res.status(400).json({ error: "expected JSON object body" });
      return;
    }

    const action: KratosAction = {
      body: body as KratosActionContext,
      request: {
        userAgent: req.get("user-agent") ?? undefined,
        acceptLanguage: req.get("accept-language") ?? undefined,
        forwardedFor: req.get("x-forwarded-for") ?? undefined,
      },
    };
    try {
      await handler.onAction(action);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
