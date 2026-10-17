import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLoader } from "./brand-loader";

describe("Canteen loading state", () => {
  it("renders a branded, accessible fallback without requiring JavaScript", () => {
    const html = renderToStaticMarkup(<BrandLoader />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading Canteen"');
    expect(html).toContain("var(--you)");
    expect(html).toContain("canteen");
    expect(html).not.toContain("setTimeout");
  });
});
