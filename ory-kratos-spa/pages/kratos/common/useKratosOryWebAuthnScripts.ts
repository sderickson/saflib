import type { UiNode, UiNodeScriptAttributes } from "@ory/client";
import { getHost, getProtocol } from "@saflib/links";
import { onBeforeUnmount, watch, type Ref } from "vue";

/** Resolve script `src` from Kratos (often root-relative) against the public Kratos origin. */
function resolveKratosScriptSrc(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }
  if (typeof document === "undefined") {
    return src;
  }
  const origin = `${getProtocol()}//kratos.${getHost()}`;
  if (src.startsWith("/")) {
    return `${origin}${src}`;
  }
  return `${origin}/${src}`;
}

/**
 * Injects Ory `webauthn.js` script nodes from a flow into `document.body`. Required for passkey /
 * WebAuthn buttons (`onclick` / `onclickTrigger`) to work with a custom UI.
 */
export function useKratosOryWebAuthnScripts(nodes: Ref<readonly UiNode[]>) {
  const attached: HTMLScriptElement[] = [];

  function clearScripts() {
    for (const s of attached) {
      s.remove();
    }
    attached.length = 0;
  }

  function syncScripts(list: readonly UiNode[]) {
    clearScripts();
    for (const node of list) {
      if (node.type !== "script") continue;
      const attrs = node.attributes as UiNodeScriptAttributes;
      const script = document.createElement("script");
      script.src = resolveKratosScriptSrc(attrs.src);
      script.async = attrs.async;
      script.type = attrs.type?.trim() || "text/javascript";
      if (attrs.referrerpolicy) {
        script.referrerPolicy = attrs.referrerpolicy as ReferrerPolicy;
      }
      if (attrs.crossorigin) {
        script.crossOrigin = attrs.crossorigin as
          | "anonymous"
          | "use-credentials";
      }
      if (attrs.integrity) {
        script.integrity = attrs.integrity;
      }
      if (attrs.nonce) {
        script.setAttribute("nonce", attrs.nonce);
      }
      document.body.appendChild(script);
      attached.push(script);
    }
  }

  watch(nodes, (list) => syncScripts(list), { immediate: true });
  onBeforeUnmount(() => clearScripts());
}
