import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Linkified } from "./linkified";

const html = (text: string) => renderToStaticMarkup(<Linkified text={text} />);

describe("Linkified", () => {
  it("links bare URLs and keeps trailing punctuation outside", () => {
    const out = html("Apply at https://example.com/jobs. Deadline Friday!");
    expect(out).toContain('href="https://example.com/jobs"');
    expect(out).toContain("</a>. Deadline Friday!");
  });

  it("escapes markup instead of rendering it", () => {
    expect(html('<img src=x onerror="alert(1)">')).not.toContain("<img");
  });

  it("ignores non-http schemes", () => {
    expect(html("javascript:alert(1)")).not.toContain("href");
  });
});
