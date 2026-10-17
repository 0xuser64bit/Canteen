import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  activateDraftOwner,
  clearDrafts,
  readDraft,
  writeDraft,
} from "./draft-storage";

class MemoryStorage {
  [key: string]: unknown;
  getItem(key: string) {
    return typeof this[key] === "string" ? (this[key] as string) : null;
  }
  setItem(key: string, value: string) {
    this[key] = value;
  }
  removeItem(key: string) {
    delete this[key];
  }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
  vi.stubGlobal("window", new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());

it("keeps a same-session draft but never adopts another session or legacy text", () => {
  localStorage.setItem(
    "canteen:draft",
    JSON.stringify({ title: "Unowned", body: "Private" }),
  );
  activateDraftOwner("session-a");
  expect(readDraft("session-a").body).toBe("");
  writeDraft("session-a", { title: "Question", body: "A's private draft" });
  activateDraftOwner("session-a");
  expect(readDraft("session-a").body).toBe("A's private draft");
  activateDraftOwner("session-b");
  expect(readDraft("session-b").body).toBe("");
  expect(readDraft("session-a").body).toBe("");
  expect(localStorage.getItem("canteen:draft")).toBeNull();
});

it("prevents stale tabs from resurrecting cleared text or overwriting a new session", () => {
  activateDraftOwner("session-a");
  writeDraft("session-a", { title: "A", body: "Secret" });
  clearDrafts();
  writeDraft("session-a", { title: "A", body: "Stale effect" });
  expect(readDraft("session-a").body).toBe("");
  activateDraftOwner("session-b");
  writeDraft("session-b", { title: "B", body: "New draft" });
  writeDraft("session-a", null);
  writeDraft("session-a", { title: "A", body: "Stale effect" });
  expect(readDraft("session-b").body).toBe("New draft");
});

it("allows composing without usable storage", () => {
  vi.stubGlobal("localStorage", {
    getItem() {
      throw new Error("Blocked");
    },
  });
  expect(() => activateDraftOwner("session-a")).not.toThrow();
  expect(() =>
    writeDraft("session-a", { title: "A", body: "Text" }),
  ).not.toThrow();
  expect(readDraft("session-a")).toEqual({ title: "", body: "" });
  expect(() => clearDrafts()).not.toThrow();
});
