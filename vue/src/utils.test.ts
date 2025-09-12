import { linkToProps } from "./utils";
import { describe, it, expect } from "vitest";

describe("linkToProps", () => {
  it("returns href for links to other subdomains, and to for links to the same subdomain", () => {
    expect(linkToProps({ subdomain: "subdomain-a", path: "/" })).toEqual({
      to: "/",
    });
    expect(linkToProps({ subdomain: "subdomain-b", path: "/" })).toEqual({
      href: "http://subdomain-b.docker.localhost/",
    });
  });
});
