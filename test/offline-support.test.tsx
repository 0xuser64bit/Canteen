// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OfflineSupport } from "@/components/offline-support";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});
const render = () =>
  act(async () =>
    root.render(
      <>
        <OfflineSupport />
        <p>Conversations</p>
      </>,
    ),
  );

it("registers same-origin navigation recovery without using an outdated worker script", async () => {
  const register = vi.fn().mockResolvedValue({});
  vi.stubGlobal("navigator", { serviceWorker: { register } });
  await render();
  expect(register).toHaveBeenCalledExactlyOnceWith("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  expect(container.textContent).toBe("Conversations");
});

it("keeps browsing available when registration fails", async () => {
  const register = vi.fn().mockRejectedValue(new Error("Blocked by browser"));
  vi.stubGlobal("navigator", { serviceWorker: { register } });
  await expect(render()).resolves.toBeUndefined();
  expect(container.textContent).toBe("Conversations");
});

it("keeps browsing available in browsers without service worker support", async () => {
  vi.stubGlobal("navigator", {});
  await expect(render()).resolves.toBeUndefined();
  expect(container.textContent).toBe("Conversations");
});
