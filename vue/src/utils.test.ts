import { linkToProps, setClientName, getHost } from "./utils.ts";
import { describe, it, expect } from "vitest";

describe("linkToProps", () => {
  it("returns href for links to other subdomains, and to for links to the same subdomain", () => {
    setClientName("subdomain-a");
    expect(linkToProps({ subdomain: "subdomain-a", path: "/" })).toEqual({
      to: "/",
    });
    const domain = getHost();
    expect(linkToProps({ subdomain: "subdomain-b", path: "/" })).toEqual({
      href: `http://subdomain-b.${domain}/`,
    });
  });
});
