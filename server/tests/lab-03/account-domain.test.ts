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
  it("trades local and domain lengths within the total email boundary", () => {
    const domain = ["a".repeat(63), "b".repeat(63), "c".repeat(62)].join(".");
    expect(canonicalEmail(`x@${domain}`)).not.toBeNull();
    const boundary = `x@${domain}.${"d".repeat(61)}`;
    expect(boundary).toHaveLength(254);
    expect(canonicalEmail(boundary)).toBe(boundary);
    expect(canonicalEmail(boundary + "d")).toBeNull();
    const localTradeoffDomain = [
      "a".repeat(63),
      "b".repeat(63),
      "c".repeat(60),
    ].join(".");
    expect(
      canonicalEmail(`${"x".repeat(64)}@${localTradeoffDomain}`),
    ).not.toBeNull();
    expect(canonicalEmail(`${"x".repeat(65)}@example.com`)).toBeNull();
    expect(canonicalEmail(`x@${"a".repeat(64)}.com`)).toBeNull();
  });
  it("counts Unicode names and rejects malformed input", () => {
    expect(
      accountName(String.fromCodePoint(0x1f600).repeat(120)),
    ).not.toBeNull();
    expect(accountName(String.fromCodePoint(0x1f600).repeat(121))).toBeNull();
    expect(accountName(String.fromCharCode(0xd800))).toBeNull();
  });
  it("accepts only positive integer versions", () => {
    expect(positiveVersion(1)).toBe(1);
    expect(positiveVersion("1")).toBeNull();
    expect(positiveVersion(0)).toBeNull();
  });
});
