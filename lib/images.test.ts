import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { preparePostImage } from "./images";

describe("preparePostImage", () => {
  it.each(["jpeg", "png", "webp"] as const)(
    "decodes %s and caps its dimensions",
    async (format) => {
      const bytes = await sharp({
        create: { width: 4096, height: 4, channels: 3, background: "red" },
      })
        .toFormat(format)
        .toBuffer();
      const { data, info } = await preparePostImage(bytes);
      expect(info).toMatchObject({ format: "webp", width: 2048, height: 2 });
      expect((await sharp(data).metadata()).width).toBe(2048);
    },
  );

  it.each([
    Buffer.from([0xff, 0xd8, 0xff]),
    Buffer.from("RIFFxxxxWEBP"),
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
    ),
  ])("rejects corrupt and unsupported image content", async (bytes) => {
    await expect(preparePostImage(bytes)).rejects.toThrow();
  });

  it("rejects oversized decoded images even when the file is small", async () => {
    const bytes = await sharp({
      create: { width: 5001, height: 5000, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    expect(bytes.length).toBeLessThan(4 * 1024 * 1024);
    await expect(preparePostImage(bytes)).rejects.toThrow();
  });
});
