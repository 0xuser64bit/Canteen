import type { MetadataRoute } from "next";

// Installable from the browser: students mostly arrive on phones.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Canteen",
    short_name: "Canteen",
    description:
      "Conversations behind per-thread aliases for students with a university email.",
    start_url: "/campus",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#f6f7f9",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Long-press the home-screen icon to jump straight in.
    shortcuts: [
      { name: "New post", url: "/new" },
      { name: "Notifications", url: "/notifications" },
      { name: "Opportunities", url: "/home?topic=opportunities" },
    ].map((shortcut) => ({
      ...shortcut,
      icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    })),
  };
}
