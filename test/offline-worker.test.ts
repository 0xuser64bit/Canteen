import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

const source = readFileSync(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);

function worker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const fetch = vi.fn<typeof globalThis.fetch>();
  const cacheAccess = vi.fn(() => {
    throw new Error("Private content must never enter the Cache API");
  });
  const skipWaiting = vi.fn(async () => {});
  const claim = vi.fn(async () => {});
  runInNewContext(source, {
    self: {
      location: new URL("https://canteen.test"),
      addEventListener: (type: string, handler: (event: unknown) => void) =>
        handlers.set(type, handler),
      skipWaiting,
      clients: { claim },
    },
    fetch,
    URL,
    Response,
    caches: new Proxy({}, { get: cacheAccess }),
  });
  const navigate = (
    overrides: Partial<{
      method: string;
      mode: string;
      destination: string;
      url: string;
    }> = {},
  ) => {
    const request = {
      method: "GET",
      mode: "navigate",
      destination: "document",
      url: "https://canteen.test/campus",
      ...overrides,
    };
    let response: Promise<Response> | undefined;
    const respondWith = vi.fn((promise: Promise<Response>) => {
      response = promise;
    });
    handlers.get("fetch")!({ request, respondWith });
    return { request, response, respondWith };
  };
  return { fetch, navigate, handlers, cacheAccess, skipWaiting, claim };
}

it("passes document navigation through the network without caching its private response", async () => {
  const app = worker();
  const network = new Response("Private conversation");
  app.fetch.mockResolvedValue(network);
  const event = app.navigate();
  expect(await event.response).toBe(network);
  expect(app.fetch).toHaveBeenCalledExactlyOnceWith(event.request, {
    cache: "no-store",
  });
  expect(app.cacheAccess).not.toHaveBeenCalled();
});

it("returns only a generic, uncached offline page after a failed navigation", async () => {
  const app = worker();
  app.fetch.mockRejectedValue(new Error("Private network error detail"));
  const { response } = app.navigate({
    url: "https://canteen.test/p/private-thread?private-query",
  });
  const fallback = await response!;
  expect(fallback.status).toBe(503);
  expect(fallback.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(fallback.headers.get("cache-control")).toBe("no-store");
  const html = await fallback.text();
  expect(html).toContain("You're offline.");
  expect(html).toContain('id="retry" type="button">Try again</button>');
  expect(html).not.toContain("private-thread");
  expect(html).not.toContain("private-query");
  expect(html).not.toContain("Private network error detail");
  expect(app.cacheAccess).not.toHaveBeenCalled();
});

it("preserves server errors instead of calling them an offline failure", async () => {
  const app = worker();
  const unavailable = new Response("Service unavailable", { status: 503 });
  app.fetch.mockResolvedValue(unavailable);
  expect(await app.navigate().response).toBe(unavailable);
});

it.each([
  { method: "POST" },
  { url: "https://canteen.test/api" },
  { url: "https://canteen.test/api/auth/get-session" },
  { url: "https://another.test/campus" },
  { mode: "cors" },
  { destination: "image" },
  { destination: "iframe" },
])(
  "leaves mutations, APIs, foreign origins and subresources unhandled: %j",
  (overrides) => {
    const app = worker();
    const event = app.navigate(overrides);
    expect(event.respondWith).not.toHaveBeenCalled();
    expect(app.fetch).not.toHaveBeenCalled();
    expect(app.cacheAccess).not.toHaveBeenCalled();
  },
);

it("activates navigation recovery without cache writes or background replay handlers", async () => {
  const app = worker();
  const pending: Promise<void>[] = [];
  const event = {
    waitUntil: (promise: Promise<void>) => pending.push(promise),
  };
  app.handlers.get("install")!(event);
  app.handlers.get("activate")!(event);
  await Promise.all(pending);
  expect(app.skipWaiting).toHaveBeenCalledOnce();
  expect(app.claim).toHaveBeenCalledOnce();
  expect([...app.handlers.keys()].sort()).toEqual([
    "activate",
    "fetch",
    "install",
  ]);
  expect(app.cacheAccess).not.toHaveBeenCalled();
});

it("lets the student retry and reloads on a restored connection", async () => {
  const app = worker();
  app.fetch.mockRejectedValue(new Error("Offline"));
  const html = await (await app.navigate().response!).text();
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  expect(script).toBeDefined();
  const callbacks = new Map<string, () => void>();
  const reload = vi.fn();
  runInNewContext(script!, {
    document: {
      getElementById: (id: string) => {
        expect(id).toBe("retry");
        return {
          addEventListener: (type: string, callback: () => void) =>
            callbacks.set(type, callback),
        };
      },
    },
    window: {
      addEventListener: (type: string, callback: () => void) =>
        callbacks.set(type, callback),
    },
    location: { reload },
  });
  expect(reload).not.toHaveBeenCalled();
  callbacks.get("click")!();
  callbacks.get("online")!();
  expect(reload).toHaveBeenCalledTimes(2);
});
