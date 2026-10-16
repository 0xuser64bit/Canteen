import { afterEach, expect, it, vi } from "vitest";
import { sendSignInCode } from "./email";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("keeps identifying provider responses out of delivery errors", async () => {
  vi.stubEnv("RESEND_API_KEY", "test-key");
  const response = new Response("Recipient private@stanford.edu was rejected", {
    status: 422,
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  await expect(
    sendSignInCode("private@stanford.edu", "123456"),
  ).rejects.toThrow(/^Resend responded 422$/);
});
