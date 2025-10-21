import { linkToProps, setClientName } from "./utils.ts";
import { describe, it, expect } from "vitest";

describe("linkToProps", () => {
  it("returns href for links to other subdomains, and to for links to the same subdomain", () => {
    process.env.DOMAIN = "docker.localhost";
    process.env.PROTOCOL = "http";
    setClientName("subdomain-a");
    expect(linkToProps({ subdomain: "subdomain-a", path: "/" })).toEqual({
      to: "/",
    });
    expect(linkToProps({ subdomain: "subdomain-b", path: "/" })).toEqual({
      href: `http://subdomain-b.docker.localhost/`,
    });
  });
});
