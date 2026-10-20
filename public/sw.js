// Network-only navigation recovery. Private pages and mutations are never stored.
const offlineDocument = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#f6f7f9" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#121418" media="(prefers-color-scheme: dark)">
  <title>You're offline · Canteen</title>
  <style>
    :root { color-scheme: light dark; --background: #f6f7f9; --ink: #16181d; --muted: #626775; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100svh; display: grid; place-items: center; padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left)); background: var(--background); color: var(--ink); font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; }
    main { width: min(100%, 360px); }
    header { display: flex; align-items: center; gap: 10px; margin-bottom: 40px; }
    svg { width: 48px; height: 48px; }
    .wordmark { font-size: 25px; font-weight: 800; letter-spacing: -0.035em; }
    h1 { margin: 0 0 12px; font-size: 32px; font-weight: 800; line-height: 1.2; letter-spacing: -0.035em; text-wrap: balance; }
    p { margin: 0 0 28px; color: var(--muted); }
    button { min-height: 48px; padding: 0 24px; border: 0; border-radius: 999px; background: #ffd84a; color: #16181d; cursor: pointer; font: inherit; font-weight: 700; -webkit-tap-highlight-color: transparent; }
    button:hover { background: #ffdf70; }
    button:focus-visible { outline: 3px solid var(--ink); outline-offset: 4px; }
    ::selection { background: #ffd84a; color: #16181d; }
    @media (prefers-color-scheme: dark) { :root { --background: #121418; --ink: #f4f5f7; --muted: #b7bcc6; } }
  </style>
</head>
<body>
  <main>
    <header>
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M33 17h2.5a7.5 7.5 0 0 1 0 15H33" stroke="#16181d" stroke-width="7" stroke-linecap="round"/>
        <path d="M33 17h2.5a7.5 7.5 0 0 1 0 15H33" stroke="#ffd84a" stroke-width="3" stroke-linecap="round"/>
        <path d="M14.5 9.5h12a8 8 0 0 1 8 8v13a8 8 0 0 1-8 8h-11l-7.5 5.5 1.6-7.4A8 8 0 0 1 6.5 30.5v-13a8 8 0 0 1 8-8Z" fill="#ffd84a" stroke="#16181d" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="14" cy="24" r="2.4" fill="#16181d"/>
        <circle cx="20.5" cy="24" r="2.4" fill="#16181d"/>
        <circle cx="27" cy="24" r="2.4" fill="#16181d"/>
      </svg>
      <span class="wordmark">canteen</span>
    </header>
    <h1>You're offline.</h1>
    <p>Reconnect to load this page. We'll try again when your connection returns.</p>
    <button id="retry" type="button">Try again</button>
  </main>
  <script>
    document.getElementById("retry").addEventListener("click", () => location.reload());
    window.addEventListener("online", () => location.reload());
  </script>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    request.destination !== "document" ||
    url.origin !== self.location.origin ||
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/")
  )
    return;

  event.respondWith(
    fetch(request, { cache: "no-store" }).catch(
      () =>
        new Response(offlineDocument, {
          status: 503,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
            "Content-Security-Policy":
              "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
          },
        }),
    ),
  );
});
