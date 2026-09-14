import { describe, expect, it } from "vitest";
import {
  accountName,
  canonicalEmail,
  positiveVersion,
} from "../../src/admin/account-domain.js";
describe("account policy", () => {
  it("canonicalizes strict email", () => {
    expect(canonicalEmail(" A.B+tag@Example.COM ")).toBe("a.b+tag@example.com");
    expect(canonicalEmail("a..b@example.com")).toBeNull();
    expect(canonicalEmail("a@-example.com")).toBeNull();
  });
  it("counts Unicode names and rejects malformed input", () => {
    expect(accountName(String.fromCodePoint(0x1f600).repeat(120))).not.toBeNull();
    expect(accountName(String.fromCodePoint(0x1f600).repeat(121))).toBeNull();
    expect(accountName(String.fromCharCode(0xd800))).toBeNull();
  });
  it("accepts only positive integer versions", () => {
    expect(positiveVersion(1)).toBe(1);
    expect(positiveVersion("1")).toBeNull();
    expect(positiveVersion(0)).toBeNull();
  });
});
