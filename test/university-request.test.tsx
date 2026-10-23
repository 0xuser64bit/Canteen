// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { UniversityRequestForm } from "@/components/university-request";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/server/university-requests", () => ({ requestUniversity: request }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  request.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

it.each(["returned", "thrown"])(
  "keeps a domain request through a %s failure and allows retry",
  async (mode) => {
    request.mockImplementationOnce(async () => {
      if (mode === "thrown") throw new Error("Offline");
      return { error: "Try again tomorrow." };
    });
    await act(async () => root.render(<UniversityRequestForm />));
    const fields = [...container.querySelectorAll("input")];
    const values = ["unlisted.example", "https://unlisted.example"];
    await act(async () =>
      fields.forEach((field, index) => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(field, values[index]);
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }),
    );
    const submit = () =>
      act(async () => {
        container
          .querySelector("form")!
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          );
      });
    await submit();
    expect(container.querySelector('[role="alert"]')!.textContent).toContain(
      mode === "thrown"
        ? "Couldn't confirm your request"
        : "Try again tomorrow.",
    );
    expect(fields.map((field) => field.value)).toEqual(values);
    request.mockResolvedValue({ ok: true });
    await submit();
    const sent = request.mock.calls[1]![1] as FormData;
    expect(sent.get("domain")).toBe(values[0]);
    expect(sent.get("website")).toBe(values[1]);
    expect(container.textContent).toContain("Your domain request is saved");
  },
);
