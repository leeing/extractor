import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyAuth } from "@/lib/auth";

// Mock @/lib/env module
// We create a mutable object to control the mocked accessToken value
const mockEnv = {
  accessToken: "",
};

vi.mock("@/lib/env", () => ({
  extractEnv: {
    get accessToken() {
      return mockEnv.accessToken;
    },
  },
}));

describe("verifyAuth", () => {
  afterEach(() => {
    mockEnv.accessToken = "";
    vi.clearAllMocks();
  });

  it("returns null when ACCESS_TOKEN is not set (auth skipped)", () => {
    mockEnv.accessToken = "";
    const req = new Request("http://localhost/api/test", {
      headers: {},
    });
    const result = verifyAuth(req);
    expect(result).toBeNull();
  });

  it("returns 401 when ACCESS_TOKEN is set but header is missing", async () => {
    mockEnv.accessToken = "secret123";
    const req = new Request("http://localhost/api/test", {
      headers: {},
    });
    const result = verifyAuth(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);

    const body = await result?.json();
    expect(body).toEqual({ success: false, error: "未提供访问密钥" });
  });

  it("returns 401 when header does not start with Bearer", async () => {
    mockEnv.accessToken = "secret123";
    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: "Basic user:pass" },
    });
    const result = verifyAuth(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);

    const body = await result?.json();
    expect(body).toEqual({ success: false, error: "未提供访问密钥" });
  });

  it("returns 401 when token is incorrect", async () => {
    mockEnv.accessToken = "secret123";
    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer wrong-token" },
    });
    const result = verifyAuth(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);

    const body = await result?.json();
    expect(body).toEqual({ success: false, error: "访问密钥无效" });
  });

  it("returns null when token matches", () => {
    mockEnv.accessToken = "secret123";
    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer secret123" },
    });
    const result = verifyAuth(req);
    expect(result).toBeNull();
  });
});
