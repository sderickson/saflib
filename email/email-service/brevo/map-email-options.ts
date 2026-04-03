import { promises as fs } from "fs";
import type { SendTransacEmailRequest } from "@getbrevo/brevo/transactionalEmails";
import type { EmailOptions } from "../types.ts";

function mapRecipientList(
  field:
    | EmailOptions["to"]
    | EmailOptions["cc"]
    | EmailOptions["bcc"]
    | undefined,
): { email: string; name?: string }[] | undefined {
  if (field == null) return undefined;
  if (typeof field === "string") {
    return [{ email: field.trim() }];
  }
  if (Array.isArray(field)) {
    return field.flatMap((item) => {
      if (typeof item === "string") return [{ email: item.trim() }];
      if (item && typeof item === "object" && "address" in item && item.address) {
        return [
          {
            email: item.address.trim(),
            name: item.name?.trim() || undefined,
          },
        ];
      }
      return [];
    });
  }
  if (typeof field === "object" && "address" in field && field.address) {
    return [
      {
        email: field.address.trim(),
        name: field.name?.trim() || undefined,
      },
    ];
  }
  return undefined;
}

/**
 * Parse `from` like nodemailer: string (bare email or `"Name" <email>`) or Address object.
 */
export function mapSender(from: EmailOptions["from"]): SendTransacEmailRequest.Sender {
  if (from == null) {
    throw new Error(
      "Brevo transactional email requires `from` (sender). Set `EmailOptions.from`.",
    );
  }
  if (typeof from === "string") {
    const trimmed = from.trim();
    const angle = trimmed.match(/^(.+)<([^>]+)>$/);
    if (angle) {
      const email = angle[2]!.trim();
      const name = angle[1]!.replace(/^["']|["']$/g, "").trim();
      return { email, name: name || undefined };
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { email: trimmed };
    }
    throw new Error(`Invalid from address string for Brevo: ${from}`);
  }
  if (typeof from === "object" && "address" in from && from.address) {
    return {
      email: from.address.trim(),
      name: from.name?.trim() || undefined,
    };
  }
  throw new Error("Invalid `from` field for Brevo");
}

function mapReplyTo(
  replyTo: EmailOptions["replyTo"],
): SendTransacEmailRequest.ReplyTo | undefined {
  if (replyTo == null) return undefined;
  if (typeof replyTo === "string") {
    const m = mapSender(replyTo);
    return { email: m.email!, name: m.name };
  }
  if (typeof replyTo === "object" && "address" in replyTo && replyTo.address) {
    return {
      email: replyTo.address.trim(),
      name: replyTo.name?.trim() || undefined,
    };
  }
  return undefined;
}

async function mapAttachments(
  attachments: EmailOptions["attachments"],
): Promise<SendTransacEmailRequest["attachment"]> {
  if (!attachments?.length) return undefined;
  const out: NonNullable<SendTransacEmailRequest["attachment"]> = [];
  for (const att of attachments) {
    if (!att || typeof att !== "object") continue;
    const filename =
      "filename" in att && att.filename
        ? att.filename
        : "name" in att && att.name
          ? String(att.name)
          : "attachment";
    if ("content" in att && att.content != null) {
      const c = att.content;
      const b64 = Buffer.isBuffer(c)
        ? c.toString("base64")
        : typeof c === "string"
          ? Buffer.from(c, "utf8").toString("base64")
          : "";
      if (b64) out.push({ name: filename, content: b64 });
    } else if ("path" in att && typeof att.path === "string") {
      const buf = await fs.readFile(att.path);
      out.push({ name: filename, content: buf.toString("base64") });
    } else if ("href" in att && typeof att.href === "string") {
      out.push({ name: filename, url: att.href });
    }
  }
  return out.length ? out : undefined;
}

function bodyContent(options: EmailOptions): {
  htmlContent?: string;
  textContent?: string;
} {
  let html: string | undefined;
  let text: string | undefined;
  if (typeof options.html === "string") {
    html = options.html;
  } else if (options.html != null && typeof (options.html as { toString?: () => string }).toString === "function") {
    html = String(options.html);
  }
  if (typeof options.text === "string") {
    text = options.text;
  } else if (options.text != null && typeof (options.text as { toString?: () => string }).toString === "function") {
    text = String(options.text);
  }
  if (!html && !text) {
    throw new Error(
      "Brevo transactional email requires `html` and/or `text` body content.",
    );
  }
  return { htmlContent: html, textContent: text };
}

/**
 * Maps {@link EmailOptions} to Brevo {@link SendTransacEmailRequest}.
 */
export async function emailOptionsToSendTransacEmail(
  options: EmailOptions,
): Promise<SendTransacEmailRequest> {
  let to = mapRecipientList(options.to);
  let cc = mapRecipientList(options.cc);
  let bcc = mapRecipientList(options.bcc);

  if (!to?.length && cc?.length) {
    to = cc;
    cc = undefined;
  }
  if (!to?.length && bcc?.length) {
    to = bcc;
    bcc = undefined;
  }

  if (!to?.length && !cc?.length && !bcc?.length) {
    throw new Error("No recipients specified");
  }
  if (!to?.length) {
    throw new Error(
      "Brevo requires at least one primary `to` recipient (set `to`, or `cc`/`bcc` which will be mapped to `to` when needed).",
    );
  }

  const { htmlContent, textContent } = bodyContent(options);
  const attachment = await mapAttachments(options.attachments);

  return {
    sender: mapSender(options.from),
    to,
    cc,
    bcc,
    replyTo: mapReplyTo(options.replyTo),
    subject: options.subject,
    htmlContent,
    textContent,
    attachment,
  };
}
