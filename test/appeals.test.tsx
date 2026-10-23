// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Appeals } from "@/components/appeals";
import type { ModerationHistory } from "@/server/queries";

const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  review: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("@/server/actions", () => ({
  submitAppeal: mocks.submit,
  reviewAppeal: mocks.review,
}));
vi.mock("sonner", () => ({
  toast: { error: mocks.error, success: mocks.success },
}));
vi.mock("@/components/time", () => ({ TimeAgo: () => <span>just now</span> }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.submit.mockResolvedValue({ ok: true });
  mocks.review.mockResolvedValue({ ok: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const decision: ModerationHistory[number] = {
  id: "decision-one",
  decision: "REMOVE",
  reason: "OTHER",
  createdAt: new Date("2026-10-20T10:00:00Z"),
  appealText: null,
  appealedAt: null,
  resolvedAt: null,
  restored: null,
  response: null,
  title: "A removed discussion",
  body: "The original context",
};

it.each([
  { review: false, label: "Submit appeal", restore: undefined },
  { review: true, label: "Restore", restore: true },
  { review: true, label: "Uphold decision", restore: false },
])(
  "preserves text and permits retry after $label loses its connection",
  async ({ review, label, restore }) => {
    const action = review ? mocks.review : mocks.submit;
    let reject!: (error: Error) => void;
    action.mockReturnValueOnce(
      new Promise((_, no) => {
        reject = no;
      }),
    );
    const item = review
      ? {
          ...decision,
          appealText: "Please reconsider the context.",
          appealedAt: new Date(),
        }
      : decision;
    await act(async () =>
      root.render(<Appeals items={[item]} review={review} />),
    );
    const body = "Please consider the complete context.";
    const field = container.querySelector("textarea")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set!.call(field, body);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const button = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === label,
    )!;
    await act(async () => button.click());
    expect(field.disabled).toBe(true);
    await act(async () => reject(new Error("Offline")));
    expect(mocks.error).toHaveBeenCalledWith(
      review
        ? "Couldn't confirm the appeal review. Check your connection and try again."
        : "Couldn't confirm your appeal. Check your connection and try again.",
    );
    expect(field.value).toBe(body);
    expect(field.disabled).toBe(false);
    expect(button.disabled).toBe(false);
    expect(container.textContent).toContain(decision.title);
    expect(mocks.success).not.toHaveBeenCalled();
    await act(async () => button.click());
    expect(action).toHaveBeenCalledTimes(2);
    expect(action).toHaveBeenLastCalledWith(
      ...(review ? [decision.id, restore, body] : [decision.id, body]),
    );
    expect(field.value).toBe("");
    expect(mocks.success).toHaveBeenCalledWith(
      review ? "Appeal reviewed" : "Appeal sent to the team",
    );
  },
);
