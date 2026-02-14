import { describe, expect, it } from "vitest";
import { isValidBaseUrl } from "../route";

describe("isValidBaseUrl", () => {
  it("allows valid public URLs", () => {
    expect(isValidBaseUrl("https://api.openai.com/v1")).toBe(true);
    expect(isValidBaseUrl("http://example.com")).toBe(true);
    expect(isValidBaseUrl("https://8.8.8.8")).toBe(true);
  });

  it("blocks localhost", () => {
    expect(isValidBaseUrl("http://localhost:3000")).toBe(false);
    expect(isValidBaseUrl("https://localhost")).toBe(false);
  });

  it("blocks loopback IPs", () => {
    expect(isValidBaseUrl("http://127.0.0.1")).toBe(false);
    expect(isValidBaseUrl("http://127.1.2.3")).toBe(false);
    expect(isValidBaseUrl("http://[::1]")).toBe(false);
  });

  it("blocks private IPv4 ranges", () => {
    // 10.0.0.0/8
    expect(isValidBaseUrl("http://10.0.0.1")).toBe(false);
    expect(isValidBaseUrl("http://10.255.255.255")).toBe(false);

    // 172.16.0.0/12
    expect(isValidBaseUrl("http://172.16.0.1")).toBe(false);
    expect(isValidBaseUrl("http://172.31.255.255")).toBe(false);
    // 172.15.x.x is public
    expect(isValidBaseUrl("http://172.15.0.1")).toBe(true);
    // 172.32.x.x is public
    expect(isValidBaseUrl("http://172.32.0.1")).toBe(true);

    // 192.168.0.0/16
    expect(isValidBaseUrl("http://192.168.1.1")).toBe(false);
  });

  it("blocks link-local addresses", () => {
    expect(isValidBaseUrl("http://169.254.169.254")).toBe(false);
  });

  it("blocks IPv6 private/local ranges", () => {
    // fc00::/7
    expect(isValidBaseUrl("http://[fc00::1]")).toBe(false);
    expect(isValidBaseUrl("http://[fd00::1]")).toBe(false);
    // fe80::/10
    expect(isValidBaseUrl("http://[fe80::1]")).toBe(false);
  });

  it("blocks non-http protocols", () => {
    expect(isValidBaseUrl("ftp://example.com")).toBe(false);
    expect(isValidBaseUrl("file:///etc/passwd")).toBe(false);
    expect(isValidBaseUrl("gopher://example.com")).toBe(false);
  });

  it("handles invalid URLs gracefully", () => {
    expect(isValidBaseUrl("not-a-url")).toBe(false);
    expect(isValidBaseUrl("")).toBe(false);
  });
});
