/**
 * Integration tests for the rules that keep Canteen anonymous and safe.
 * They run against a real Postgres: set TEST_DATABASE_URL to a disposable,
 * already-migrated database (see CONTRIBUTING.md). Skipped otherwise.
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { del, get, put } from "@vercel/blob";
import sharp from "sharp";
import { sendSignInCode } from "@/lib/email";
import { getViewer } from "@/lib/session";
import { TEAM } from "@/lib/universities";

const TEST_DATABASE_URL = vi.hoisted(() => {
  const url = process.env.TEST_DATABASE_URL;
  if (url) process.env.DATABASE_URL = url;
  return url;
});

const state = vi.hoisted(() => ({
  viewerId: null as string | null,
  background: [] as Promise<unknown>[],
}));

vi.mock("@/lib/session", async () => {
  const { db } = await import("@/lib/db");
  return {
    getViewer: vi.fn(async () =>
      state.viewerId
        ? db.user.findUnique({
            where: { id: state.viewerId, bannedAt: null },
            select: {
              id: true,
              email: true,
              createdAt: true,
              university: { select: { id: true, slug: true, name: true } },
            },
          })
        : null,
    ),
  };
});
vi.mock("@/lib/auth", () => ({ auth: { api: { signOut: vi.fn() } } }));
vi.mock("@/lib/email", () => ({ sendSignInCode: vi.fn() }));
vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));
vi.mock("next/server", () => ({
  after: (task: Promise<unknown> | (() => unknown)) => {
    const pending = Promise.resolve().then(() =>
      typeof task === "function" ? task() : task,
    );
    state.background.push(pending);
    void pending.catch(() => {}); // The test awaits and surfaces failures below.
  },
}));
vi.mock("@vercel/blob", () => ({ put: vi.fn(), del: vi.fn(), get: vi.fn() }));

describe.skipIf(!TEST_DATABASE_URL)("privacy and authorization", () => {
  let db: typeof import("@/lib/db").db;
  let actions: typeof import("@/server/actions");
  let queries: typeof import("@/server/queries");

  const viewer = async (id: string) =>
    (await db.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        createdAt: true,
        university: { select: { id: true, slug: true, name: true } },
      },
    })) as Awaited<ReturnType<typeof import("@/lib/session").getViewer>> & {};
  const as = (id: string | null) => {
    state.viewerId = id;
  };

  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    actions = await import("@/server/actions");
    queries = await import("@/server/queries");
  });

  beforeEach(async () => {
    await db.$executeRawUnsafe(
      'TRUNCATE "Follow", "Bookmark", "HelpfulAnswer", "BlobDeletion", "Notification", "Report", "PostView", "Like", "Comment", "Post", "Session", "Account", "Verification", "RateLimit", "User", "University" CASCADE',
    );
    await db.university.createMany({
      data: [
        {
          id: "u-stanford",
          domain: "stanford.edu",
          slug: "stanford-university",
          name: "Stanford University",
          country: "United States",
          countryCode: "US",
        },
        {
          id: "u-mit",
          domain: "mit.edu",
          slug: "massachusetts-institute-of-technology",
          name: "Massachusetts Institute of Technology",
          country: "United States",
          countryCode: "US",
        },
      ],
    });
    await db.user.createMany({
      data: [
        {
          id: "ada",
          email: "ada@stanford.edu",
          universityId: "u-stanford",
          emailVerified: true,
        },
        {
          id: "alan",
          email: "alan@stanford.edu",
          universityId: "u-stanford",
          emailVerified: true,
        },
        {
          id: "grace",
          email: "grace@mit.edu",
          universityId: "u-mit",
          emailVerified: true,
        },
        {
          id: "linus",
          email: "linus@mit.edu",
          universityId: "u-mit",
          emailVerified: true,
        },
        {
          id: "margaret",
          email: "margaret@mit.edu",
          universityId: "u-mit",
          emailVerified: true,
        },
      ],
    });
    as(null);
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  const finishBackground = async () => {
    await Promise.all(state.background.splice(0));
  };
  afterEach(finishBackground);

  async function post(
    author: string,
    overrides: Partial<{
      audience: "EVERYONE" | "CAMPUS";
      title: string;
      kind: "QUESTION" | "DISCUSSION";
      imageUrl: string;
    }> = {},
  ) {
    const user = await db.user.findUniqueOrThrow({ where: { id: author } });
    return db.post.create({
      data: {
        ...overrides,
        title: overrides.title ?? "A question for everyone",
        body: "Body text",
        audience: overrides.audience ?? "EVERYONE",
        authorId: author,
        universityId: user.universityId,
      },
    });
  }

  it("lets only a question's author choose a visible helpful reply and reopens on deletion", async () => {
    const p = await post("ada", { audience: "CAMPUS", kind: "QUESTION" });
    const c = await db.comment.create({
      data: { postId: p.id, authorId: "alan", body: "Here is how to do it." },
    });
    as("grace");
    expect((await actions.markHelpful(p.id, c.id)).ok).toBe(false);
    as("alan");
    expect((await actions.markHelpful(p.id, c.id)).ok).toBe(false);
    as("ada");
    expect(
      (
        await queries.getFeed(await viewer("ada"), {
          scope: { kind: "campus" },
          unanswered: true,
        })
      ).items,
    ).toHaveLength(1);
    expect((await actions.markHelpful(p.id, c.id)).ok).toBe(true);
    expect(
      (
        await queries.getFeed(await viewer("ada"), {
          scope: { kind: "campus" },
          unanswered: true,
        })
      ).items,
    ).toHaveLength(0);
    expect(
      (await queries.getThread(await viewer("ada"), p.id))?.helpfulCommentId,
    ).toBe(c.id);
    const other = await post("alan");
    const unrelated = await db.comment.create({
      data: { postId: other.id, authorId: "alan", body: "Another thread" },
    });
    expect((await actions.markHelpful(p.id, unrelated.id)).ok).toBe(false);
    const own = await db.comment.create({
      data: { postId: p.id, authorId: "ada", body: "My own answer" },
    });
    expect((await actions.markHelpful(p.id, own.id)).ok).toBe(false);
    await db.comment.delete({ where: { id: c.id } });
    expect(
      (
        await queries.getFeed(await viewer("ada"), {
          scope: { kind: "campus" },
          unanswered: true,
        })
      ).items,
    ).toHaveLength(1);
  });

  it("keeps collections private and sends anonymous reply alerts to eligible followers", async () => {
    const p = await post("ada", { audience: "CAMPUS" });
    as("alan");
    expect((await actions.setCollection(p.id, "saved", true)).ok).toBe(true);
    expect((await actions.setCollection(p.id, "following", true)).ok).toBe(
      true,
    );
    await actions.setCollection(p.id, "following", true);
    expect(await db.follow.count()).toBe(1);
    expect(
      (
        await queries.getFeed(await viewer("alan"), {
          scope: { kind: "saved" },
        })
      ).items,
    ).toHaveLength(1);
    expect(
      (await queries.getFeed(await viewer("ada"), { scope: { kind: "saved" } }))
        .items,
    ).toHaveLength(0);
    as("grace");
    expect((await actions.setCollection(p.id, "saved", true)).ok).toBe(false);
    // A stale following relationship must not grant cross-campus access or alerts.
    await db.follow.create({ data: { userId: "grace", postId: p.id } });
    as("ada");
    await actions.addComment(p.id, "An update for classmates");
    expect(
      await db.notification.findMany({ select: { userId: true, type: true } }),
    ).toEqual([{ userId: "alan", type: "COMMENT" }]);
    as("alan");
    await actions.setCollection(p.id, "following", false);
    as("ada");
    await actions.addComment(p.id, "A second update");
    expect(await db.notification.count()).toBe(1);
    await db.post.update({
      where: { id: p.id },
      data: { hiddenAt: new Date() },
    });
    expect(
      (
        await queries.getFeed(await viewer("alan"), {
          scope: { kind: "saved" },
        })
      ).items,
    ).toHaveLength(0);
    expect(await queries.getNotifications(await viewer("alan"))).toHaveLength(
      0,
    );
    expect(await queries.getUnreadCount(await viewer("alan"))).toBe(0);
  });

  it("paginates replies without gaps and protects update and earlier-reply reads", async () => {
    const p = await post("ada", { audience: "CAMPUS" });
    await db.comment.createMany({
      data: Array.from({ length: 105 }, (_, i) => ({
        id: `reply-${String(i).padStart(3, "0")}`,
        postId: p.id,
        authorId: "alan",
        body: `Reply ${i}`,
        createdAt: new Date("2026-01-01"),
      })),
    });
    const thread = await queries.getThread(await viewer("ada"), p.id);
    expect(thread?.comments).toHaveLength(50);
    as("ada");
    const second = await actions.loadEarlierReplies(
      p.id,
      thread!.earlierCursor!,
    );
    if (!second.ok) throw new Error("Missing page");
    const third = await actions.loadEarlierReplies(
      p.id,
      second.data.nextCursor!,
    );
    if (!third.ok) throw new Error("Missing page");
    const ids = [
      ...third.data.items,
      ...second.data.items,
      ...thread!.comments,
    ].map((c) => c.id);
    expect(ids).toHaveLength(105);
    expect(new Set(ids).size).toBe(105);
    expect(third.data.nextCursor).toBeNull();
    const { GET } = await import("@/app/api/threads/[id]/updates/route");
    const read = () =>
      GET(new Request("http://localhost/api/threads/x/updates"), {
        params: Promise.resolve({ id: p.id }),
      });
    expect(await (await read()).json()).toEqual({ revision: 0, closed: false });
    await actions.addComment(p.id, "A new reply");
    expect(await (await read()).json()).toEqual({ revision: 1, closed: false });
    as("grace");
    expect((await read()).status).toBe(404);
    expect(
      (await actions.loadEarlierReplies(p.id, thread!.earlierCursor!)).ok,
    ).toBe(false);
    as(null);
    expect((await read()).status).toBe(401);
  });

  it("expires opportunities from discovery while preserving saved history", async () => {
    const p = await post("ada", { title: "Research internship" });
    await db.post.update({
      where: { id: p.id },
      data: {
        topic: "OPPORTUNITIES",
        applicationUrl: "https://example.org/apply",
        deadline: new Date(Date.now() + 60000),
      },
    });
    as("alan");
    await actions.setCollection(p.id, "saved", true);
    expect(
      (await queries.search(await viewer("alan"), "Research")).posts,
    ).toHaveLength(1);
    await db.post.update({
      where: { id: p.id },
      data: { deadline: new Date(0) },
    });
    expect(
      (
        await queries.getFeed(await viewer("alan"), {
          scope: { kind: "everyone" },
          topic: "OPPORTUNITIES",
        })
      ).items,
    ).toHaveLength(0);
    expect(
      (await queries.search(await viewer("alan"), "Research")).posts,
    ).toHaveLength(0);
    expect(
      (
        await queries.getFeed(await viewer("alan"), {
          scope: { kind: "saved" },
        })
      ).items,
    ).toHaveLength(1);
    expect(
      (await queries.getThread(await viewer("alan"), p.id))?.applicationUrl,
    ).toBe("https://example.org/apply");
  });

  it("keeps campus-only posts inside their university", async () => {
    const campus = await post("ada", {
      audience: "CAMPUS",
      title: "Campus secret",
    });

    const sameCampus = await queries.getFeed(await viewer("alan"), {
      scope: { kind: "campus" },
    });
    expect(sameCampus.items.map((p) => p.id)).toContain(campus.id);

    const otherCampus = await queries.getFeed(await viewer("grace"), {
      scope: { kind: "everyone" },
    });
    expect(otherCampus.items.map((p) => p.id)).not.toContain(campus.id);
    expect(
      await queries.getThread(await viewer("grace"), campus.id),
    ).toBeNull();

    as("grace");
    expect((await actions.setLike(campus.id, true)).ok).toBe(false);
    expect((await actions.addComment(campus.id, "hello")).ok).toBe(false);
    expect(
      (
        await actions.reportContent({
          target: "post",
          id: campus.id,
          reason: "SPAM",
        })
      ).ok,
    ).toBe(false);
  });

  it("never sends emails or user ids to the client", async () => {
    const p = await post("ada");
    as("grace");
    await actions.addComment(p.id, "Reply from MIT");
    as("ada");
    await actions.addComment(p.id, "OP replying");

    const thread = await queries.getThread(await viewer("alan"), p.id);
    const payload = JSON.stringify(thread);
    for (const secret of [
      "ada@stanford.edu",
      "grace@mit.edu",
      '"ada"',
      '"grace"',
      "u-stanford",
      "u-mit",
    ]) {
      expect(payload).not.toContain(secret);
    }
    expect(thread!.comments.map((c) => c.isAuthor)).toEqual([false, true]);
    expect(thread!.comments[1]!.alias).toEqual(thread!.alias);
  });

  it("names a university to outsiders only once it has enough members", async () => {
    const p = await post("ada");
    const outsider = await queries.getThread(await viewer("grace"), p.id);
    expect(outsider!.university).toEqual({
      name: "A university in the United States",
      slug: null,
    });
    expect(
      await queries.getUniversityPage(
        await viewer("grace"),
        "stanford-university",
      ),
    ).toBeNull();

    const insider = await queries.getThread(await viewer("alan"), p.id);
    expect(insider!.university.name).toBe("Stanford University");

    await db.user.createMany({
      data: [1, 2, 3].map((n) => ({
        id: `s${n}`,
        email: `s${n}@stanford.edu`,
        universityId: "u-stanford",
      })),
    });
    const named = await queries.getThread(await viewer("grace"), p.id);
    expect(named!.university).toEqual({
      name: "Stanford University",
      slug: "stanford-university",
    });
  });

  it("lets only the author delete a post", async () => {
    const p = await post("ada");
    as("grace");
    expect((await actions.deletePost(p.id)).ok).toBe(false);
    expect(await db.post.count()).toBe(1);
    as("ada");
    expect((await actions.deletePost(p.id)).ok).toBe(true);
    expect(await db.post.count()).toBe(0);
  });

  it("hides content after three distinct reports and keeps it visible to its author", async () => {
    const p = await post("ada");
    for (const reporter of ["grace", "grace", "linus"]) {
      as(reporter);
      await actions.reportContent({ target: "post", id: p.id, reason: "SPAM" });
    }
    expect(
      (await db.post.findUniqueOrThrow({ where: { id: p.id } })).hiddenAt,
    ).toBeNull();

    as("margaret");
    await actions.reportContent({
      target: "post",
      id: p.id,
      reason: "HARASSMENT",
    });
    expect(
      (await db.post.findUniqueOrThrow({ where: { id: p.id } })).hiddenAt,
    ).not.toBeNull();

    const feed = await queries.getFeed(await viewer("alan"), {
      scope: { kind: "everyone" },
    });
    expect(feed.items).toHaveLength(0);
    const own = await queries.getThread(await viewer("ada"), p.id);
    expect(own?.hidden).toBe(true);

    as("ada");
    expect(
      (
        await actions.reportContent({
          target: "post",
          id: p.id,
          reason: "SPAM",
        })
      ).ok,
    ).toBe(false);
  });

  it("counts likes and views once per student and notifies without naming anyone", async () => {
    const p = await post("ada");
    as("grace");
    await actions.setLike(p.id, true);
    const second = await actions.setLike(p.id, true);
    expect(second.ok && second.data.likeCount).toBe(1);
    await actions.recordView(p.id);
    await actions.recordView(p.id);
    expect(await db.postView.count()).toBe(1);

    as("linus");
    await actions.setLike(p.id, true);
    await finishBackground();
    const notifications = await db.notification.findMany({
      where: { userId: "ada" },
    });
    expect(notifications).toHaveLength(1);
    expect(Object.keys(notifications[0]!)).not.toContain("actorId");
  });

  it("coalesces simultaneous likes into one unread notification", async () => {
    const p = await post("ada");
    const results = await Promise.all(
      ["grace", "linus", "margaret"].map((id) => {
        as(id);
        return actions.setLike(p.id, true);
      }),
    );
    expect(results.every((result) => result.ok)).toBe(true);
    await finishBackground();
    expect(await db.like.count()).toBe(3);
    expect(
      await db.notification.count({
        where: { userId: "ada", postId: p.id, readAt: null },
      }),
    ).toBe(1);

    as("ada");
    await actions.markNotificationsRead();
    as("alan");
    await actions.setLike(p.id, true);
    await finishBackground();
    expect(
      await db.notification.count({
        where: { userId: "ada", postId: p.id, readAt: null },
      }),
    ).toBe(1);
    expect(await db.notification.count()).toBe(2);
  });

  it("rejects invalid posts and signed-out writes", async () => {
    as(null);
    expect((await actions.addComment("x", "hi")).ok).toBe(false);

    as("ada");
    const form = new FormData();
    form.set("title", "  ");
    form.set("body", "body");
    form.set("topic", "GENERAL");
    form.set("audience", "EVERYONE");
    const result = await actions.createPost(null, form);
    expect(result?.fieldErrors?.title).toBeDefined();
    expect(await db.post.count()).toBe(0);
  });

  it("rejects malformed action arguments without changing data", async () => {
    const p = await post("ada");
    as("ada");

    expect((await actions.setLike(p.id, "false" as never)).ok).toBe(false);
    expect((await actions.deletePost(null as never)).ok).toBe(false);
    expect((await actions.deleteComment({} as never)).ok).toBe(false);
    await expect(actions.recordView(null as never)).resolves.toBeUndefined();
    expect((await actions.loadMore(null as never)).ok).toBe(false);
    expect(
      (await actions.loadMore({ scope: "invalid" as never, cursor: "" })).ok,
    ).toBe(false);
    expect(await actions.searchCanteen(null as never)).toEqual({
      universities: [],
      posts: [],
    });
    expect(await actions.lookupUniversity(null as never)).toBeNull();
    expect((await actions.deleteAccount(null as never)).ok).toBe(false);
    expect(await actions.createPost(null, null as never)).toHaveProperty(
      "error",
    );

    expect(await db.post.count()).toBe(1);
    expect(await db.user.count()).toBe(5);
    expect(await db.like.count()).toBe(0);
    expect(await db.postView.count()).toBe(0);
  });

  it("accepts a client reply id only when it is a fresh UUID", async () => {
    const p = await post("ada");
    as("grace");
    const id = crypto.randomUUID();
    expect((await actions.addComment(p.id, "first", id)).ok).toBe(true);
    expect(await db.comment.findUnique({ where: { id } })).not.toBeNull();
    expect((await actions.addComment(p.id, "again", id)).ok).toBe(false);
    expect((await actions.addComment(p.id, "bad", "not-a-uuid")).ok).toBe(
      false,
    );
    expect(await db.comment.count()).toBe(1);
  });

  it("enforces the reply limit across simultaneous requests", async () => {
    const p = await post("ada");
    as("ada");
    const results = await Promise.all(
      Array.from({ length: 21 }, () => actions.addComment(p.id, "A reply")),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(20);
    expect(await db.comment.count()).toBe(20);
  });

  it("enforces the post limit across simultaneous requests", async () => {
    as("ada");
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => {
        const form = new FormData();
        form.set("title", "A question for everyone");
        form.set("body", "Body text");
        form.set("topic", "GENERAL");
        form.set("audience", "EVERYONE");
        return actions.createPost(null, form);
      }),
    );
    const redirects = results.filter((result) => result.status === "rejected");
    expect(redirects).toHaveLength(5);
    for (const result of redirects)
      expect(result.reason).toMatchObject({
        url: expect.stringMatching(/^\/p\//),
      });
    expect(await db.post.count()).toBe(5);
    expect(results.filter((result) => result.status === "fulfilled")).toEqual([
      {
        status: "fulfilled",
        value: { error: expect.stringContaining("quickly") },
      },
    ]);
  });

  it("rejects publishing with a viewer captured before a ban", async () => {
    const p = await post("ada");
    const beforeBan = await viewer("ada");
    await db.user.update({
      where: { id: "ada" },
      data: { bannedAt: new Date() },
    });
    as("ada");

    vi.mocked(getViewer).mockResolvedValueOnce(beforeBan);
    expect((await actions.addComment(p.id, "Still here?")).ok).toBe(false);
    vi.mocked(getViewer).mockResolvedValueOnce(beforeBan);
    const form = new FormData();
    form.set("title", "Trying to post after a ban");
    form.set("body", "Body text");
    form.set("topic", "GENERAL");
    form.set("audience", "EVERYONE");
    expect(await actions.createPost(null, form)).toHaveProperty("error");
    expect(await db.comment.count()).toBe(0);
    expect(await db.post.count()).toBe(1);
  });

  it("deletes everything a student wrote when they delete their account", async () => {
    const p = await post("ada");
    as("grace");
    await actions.addComment(p.id, "nice");
    await actions.setLike(p.id, true);

    as("grace");
    await expect(
      actions.deleteAccount("delete my account"),
    ).rejects.toMatchObject({ url: "/?deleted=1" });
    expect(await db.user.findUnique({ where: { id: "grace" } })).toBeNull();
    expect(await db.comment.count()).toBe(0);
    expect(await db.like.count()).toBe(0);
    expect(await db.post.count()).toBe(1);
  });

  describe("images", () => {
    const imageUrl =
      "https://test.private.blob.vercel-storage.com/posts/photo.webp";

    beforeEach(() => {
      vi.stubEnv("BLOB_PRIVATE_READ_WRITE_TOKEN", "test-token");
      vi.mocked(put).mockResolvedValue({
        url: imageUrl,
        downloadUrl: imageUrl,
        pathname: "posts/photo.webp",
        contentType: "image/webp",
        contentDisposition: "inline",
        etag: "test-etag",
      });
      vi.mocked(del).mockResolvedValue(undefined);
      vi.spyOn(console, "error").mockImplementation(() => {});
      as("ada");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
      vi.mocked(put).mockReset();
      vi.mocked(del).mockReset();
    });

    async function imageForm() {
      const bytes = await sharp({
        create: { width: 3, height: 2, channels: 3, background: "red" },
      })
        .withMetadata({
          orientation: 6,
          exif: { IFD0: { Artist: "Private name" } },
        })
        .jpeg()
        .toBuffer();
      expect((await sharp(bytes).metadata()).exif).toBeDefined();
      const form = new FormData();
      form.set("title", "A photo from campus");
      form.set("body", "A place to study.");
      form.set("topic", "GENERAL");
      form.set("audience", "EVERYONE");
      form.set(
        "image",
        new File([new Uint8Array(bytes)], "photo.jpg", { type: "image/jpeg" }),
      );
      // These are untrusted, even when a genuine client normally sends them.
      form.set("imageWidth", "9999");
      form.set("imageHeight", "9999");
      return form;
    }

    it("strips metadata on the server and derives the dimensions from the image", async () => {
      await expect(
        actions.createPost(null, await imageForm()),
      ).rejects.toMatchObject({
        url: expect.stringMatching(/^\/p\//),
      });
      const uploaded = vi.mocked(put).mock.calls[0]![1];
      if (!Buffer.isBuffer(uploaded)) throw new Error("Expected image bytes");
      const metadata = await sharp(uploaded).metadata();
      expect(metadata).toMatchObject({ format: "webp", width: 2, height: 3 });
      expect(metadata.exif).toBeUndefined();
      expect(metadata.icc).toBeUndefined();
      expect(await db.post.findFirst()).toMatchObject({
        imageUrl,
        imageWidth: 2,
        imageHeight: 3,
      });
    });

    it("serves image bytes only to authorized viewers and never caches them", async () => {
      const p = await post("ada", { audience: "CAMPUS", imageUrl });
      const { GET } = await import("@/app/api/images/[id]/route");
      const read = () =>
        GET(new Request("http://localhost/api/images/" + p.id), {
          params: Promise.resolve({ id: p.id }),
        });
      as(null);
      expect((await read()).status).toBe(401);
      as("grace");
      expect((await read()).status).toBe(404);
      expect(get).not.toHaveBeenCalled();
      as("alan");
      vi.mocked(get).mockResolvedValueOnce({
        statusCode: 200,
        stream: new Response("image").body,
        blob: { contentType: "image/webp" },
      } as never);
      const response = await read();
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(await response.text()).toBe("image");
      expect(
        JSON.stringify(await queries.getThread(await viewer("alan"), p.id)),
      ).not.toContain("blob.vercel-storage.com");
      await db.post.update({
        where: { id: p.id },
        data: { hiddenAt: new Date() },
      });
      expect((await read()).status).toBe(404);
    });

    it("retains deletion work across storage failures, leases and account deletion", async () => {
      const { processImageDeletions } = await import("@/server/media");
      const p = await post("ada", { imageUrl });
      vi.mocked(del).mockRejectedValue(new Error("Offline"));
      await actions.deletePost(p.id);
      await Promise.all(state.background.splice(0));
      const job = await db.blobDeletion.findFirstOrThrow();
      expect(job.attempts).toBe(1);
      expect(job.dueAt.getTime()).toBeGreaterThan(Date.now());
      vi.mocked(del).mockClear();
      await processImageDeletions();
      expect(del).not.toHaveBeenCalled();
      await db.blobDeletion.update({
        where: { id: job.id },
        data: { dueAt: new Date(0), lockedUntil: new Date(Date.now() + 10000) },
      });
      await processImageDeletions();
      expect(del).not.toHaveBeenCalled();
      await db.blobDeletion.update({
        where: { id: job.id },
        data: { lockedUntil: new Date(0) },
      });
      vi.mocked(del).mockResolvedValue(undefined);
      await Promise.all([processImageDeletions(), processImageDeletions()]);
      expect(del).toHaveBeenCalledTimes(1);
      expect(await db.blobDeletion.count()).toBe(0);
      await post("ada", { imageUrl });
      vi.mocked(del).mockRejectedValue(new Error("Offline"));
      await expect(
        actions.deleteAccount("delete my account"),
      ).rejects.toHaveProperty("url");
      await Promise.all(state.background.splice(0));
      expect(await db.blobDeletion.count()).toBe(1);
      expect(await db.user.findUnique({ where: { id: "ada" } })).toBeNull();
    });

    it("rejects unauthenticated maintenance requests", async () => {
      const { GET } = await import("@/app/api/maintenance/route");
      vi.stubEnv("CRON_SECRET", "a-test-secret");
      expect(
        (await GET(new Request("http://localhost/api/maintenance"))).status,
      ).toBe(401);
      expect(
        (
          await GET(
            new Request("http://localhost/api/maintenance", {
              headers: { authorization: "Bearer wrong" },
            }),
          )
        ).status,
      ).toBe(401);
    });

    it("returns an image error when storage is unavailable", async () => {
      vi.mocked(put).mockRejectedValueOnce(new Error("Storage unavailable"));
      const result = await actions.createPost(null, await imageForm());
      expect(result?.fieldErrors?.image).toBeDefined();
      expect(await db.post.count()).toBe(0);
    });

    it("durably cleans the upload when saving the post fails", async () => {
      vi.spyOn(db, "$transaction").mockRejectedValueOnce(
        new Error("Database unavailable"),
      );
      const result = await actions.createPost(null, await imageForm());
      expect(result?.error).toBeDefined();
      const job = await db.blobDeletion.findFirstOrThrow();
      await db.blobDeletion.update({
        where: { id: job.id },
        data: { dueAt: new Date(0) },
      });
      await (await import("@/server/media")).processImageDeletions();
      expect(del).toHaveBeenCalledWith(
        job.key,
        expect.objectContaining({ token: "test-token" }),
      );
      expect(await db.blobDeletion.count()).toBe(0);
      expect(await db.post.count()).toBe(0);
    });

    it("preserves the image if the database commits but its acknowledgement is lost", async () => {
      const transaction = db.$transaction.bind(db);
      vi.spyOn(db, "$transaction").mockImplementationOnce(async (operation) => {
        await transaction(operation);
        throw new Error("Commit acknowledgement lost");
      });
      expect(await actions.createPost(null, await imageForm())).toHaveProperty(
        "error",
      );
      expect(await db.post.count()).toBe(1);
      expect(del).not.toHaveBeenCalled();
      expect(await db.blobDeletion.count()).toBe(0);
    });
  });

  describe("authentication endpoints", () => {
    let realAuth: typeof import("@/lib/auth").auth;

    beforeAll(async () => {
      vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
      ({ auth: realAuth } =
        await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth"));
    });

    beforeEach(() => {
      vi.mocked(sendSignInCode).mockReset();
      vi.mocked(sendSignInCode).mockResolvedValue(undefined);
    });

    afterEach(() => vi.unstubAllEnvs());

    const request = (path: string, body: object) =>
      realAuth.handler(
        new Request(`http://localhost:3000/api/auth${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:3000",
          },
          body: JSON.stringify(body),
        }),
      );

    async function codeFor(email: string) {
      const response = await request("/email-otp/send-verification-otp", {
        email,
        type: "sign-in",
      });
      expect(response.status).toBe(200);
      return vi.mocked(sendSignInCode).mock.calls.at(-1)![1];
    }

    it("verifies a university email without storing a name or photo", async () => {
      const email = "new-student@stanford.edu";
      const otp = await codeFor(email);
      const response = await request("/sign-in/email-otp", {
        email,
        otp,
        name: "A real name",
        image: "https://example.com/me.jpg",
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("set-cookie")).toContain("session_token");
      expect(await db.user.findUnique({ where: { email } })).toMatchObject({
        name: "",
        image: null,
        emailVerified: true,
        universityId: "u-stanford",
      });
      expect(await db.session.count()).toBe(1);
    });

    it("rejects a university supplied by the client", async () => {
      const email = "new-student@stanford.edu";
      const otp = await codeFor(email);
      const response = await request("/sign-in/email-otp", {
        email,
        otp,
        universityId: "u-mit",
      });
      expect(response.status).toBe(400);
      expect(await db.user.count()).toBe(5);
      expect(await db.session.count()).toBe(0);
    });

    it("rejects personal emails and repeated code requests", async () => {
      expect(
        (
          await request("/email-otp/send-verification-otp", {
            email: "someone@gmail.com",
            type: "sign-in",
          })
        ).status,
      ).toBe(400);
      expect(sendSignInCode).not.toHaveBeenCalled();
      await codeFor("ada@stanford.edu");
      expect(
        (
          await request("/email-otp/send-verification-otp", {
            email: "ada@stanford.edu",
            type: "sign-in",
          })
        ).status,
      ).toBe(429);
      expect(sendSignInCode).toHaveBeenCalledTimes(1);
    });

    it("doesn't issue a session to a banned account", async () => {
      await db.user.update({
        where: { id: "ada" },
        data: { bannedAt: new Date() },
      });
      const email = "ada@stanford.edu";
      const otp = await codeFor(email);
      const response = await request("/sign-in/email-otp", { email, otp });
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        code: "ACCOUNT_SUSPENDED",
      });
      expect(await db.session.count()).toBe(0);
    });

    it.each(["former-staff@gmail.com", "former-staff@stanford.edu"])(
      "rechecks team access for %s when a previously issued code is redeemed",
      async (email) => {
        vi.stubEnv("TEAM_EMAILS", email);
        await db.university.create({ data: { ...TEAM, id: "u-team" } });
        await db.user.create({
          data: {
            id: "former-staff",
            email,
            emailVerified: true,
            universityId: "u-team",
          },
        });
        const otp = await codeFor(email);
        vi.stubEnv("TEAM_EMAILS", "");
        const response = await request("/sign-in/email-otp", { email, otp });
        expect(response.status).toBe(403);
        expect(await db.session.count()).toBe(0);
      },
    );

    it("consumes a sign-in code so it can't be reused", async () => {
      const email = "ada@stanford.edu";
      const otp = await codeFor(email);
      expect((await request("/sign-in/email-otp", { email, otp })).status).toBe(
        200,
      );
      expect((await request("/sign-in/email-otp", { email, otp })).status).toBe(
        400,
      );
      expect(await db.session.count()).toBe(1);
    });

    it("refuses expired codes", async () => {
      const email = "ada@stanford.edu";
      const otp = await codeFor(email);
      await db.verification.updateMany({
        data: { expiresAt: new Date(Date.now() - 1_000) },
      });
      expect((await request("/sign-in/email-otp", { email, otp })).status).toBe(
        400,
      );
      expect(await db.session.count()).toBe(0);
    });

    it("locks a code after five wrong guesses", async () => {
      const email = "ada@stanford.edu";
      const otp = await codeFor(email);
      const wrong = otp === "000000" ? "111111" : "000000";
      for (let attempt = 0; attempt < 5; attempt++)
        expect(
          (await request("/sign-in/email-otp", { email, otp: wrong })).status,
        ).toBe(400);
      const response = await request("/sign-in/email-otp", { email, otp });
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        code: "TOO_MANY_ATTEMPTS",
      });
      expect(await db.session.count()).toBe(0);
    });

    it.each([
      "/set-password",
      "/email-otp/check-verification-otp",
      "/email-otp/verify-email",
      "/email-otp/request-password-reset",
      "/forget-password/email-otp",
      "/email-otp/reset-password",
      "/email-otp/request-email-change",
      "/email-otp/change-email",
    ])("doesn't expose the unused %s endpoint", async (path) => {
      const response = await request(path, {
        email: "ada@stanford.edu",
        type: "sign-in",
        otp: "000000",
        password: "a-strong-test-password",
        newEmail: "someone@example.com",
      });
      expect(response.status).toBe(404);
      expect(sendSignInCode).not.toHaveBeenCalled();
    });
  });

  describe("moderation", () => {
    beforeEach(async () => {
      vi.stubEnv("TEAM_EMAILS", "mod@example.com");
      await db.university.create({ data: { ...TEAM, id: "u-team" } });
      await db.user.create({
        data: {
          id: "mod",
          email: "mod@example.com",
          universityId: "u-team",
          emailVerified: true,
        },
      });
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    const report = async (
      reporter: string,
      target: "post" | "comment",
      id: string,
    ) => {
      as(reporter);
      return actions.reportContent({ target, id, reason: "HARASSMENT" });
    };
    const hiddenAt = async (id: string) =>
      (await db.post.findUniqueOrThrow({ where: { id } })).hiddenAt;

    it("is team-only and shows content, never identities", async () => {
      const p = await post("ada");
      await report("grace", "post", p.id);

      as("alan");
      const decision = {
        target: "post",
        id: p.id,
        decision: "remove",
      } as const;
      expect((await actions.moderate(decision)).ok).toBe(false);
      // Being listed isn't enough: the account must also be a team account.
      vi.stubEnv("TEAM_EMAILS", "mod@example.com, alan@stanford.edu");
      expect((await actions.moderate(decision)).ok).toBe(false);
      expect(await db.post.count()).toBe(1);

      const queue = await queries.getModQueue(await viewer("mod"));
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        target: "post",
        reportCount: 1,
        reasons: [{ reason: "HARASSMENT", count: 1 }],
      });
      const payload = JSON.stringify(queue);
      for (const secret of [
        "ada@stanford.edu",
        '"ada"',
        '"grace"',
        "u-stanford",
      ])
        expect(payload).not.toContain(secret);

      as("mod");
      expect((await actions.moderate(decision)).ok).toBe(true);
      expect(await db.post.count()).toBe(0);
    });

    it("keeps content and makes it take new reporters to hide it again", async () => {
      const p = await post("ada");
      for (const reporter of ["grace", "linus", "margaret"])
        await report(reporter, "post", p.id);
      expect(await hiddenAt(p.id)).not.toBeNull();

      as("mod");
      const kept = await actions.moderate({
        target: "post",
        id: p.id,
        decision: "keep",
      });
      expect(kept.ok).toBe(true);
      expect(await hiddenAt(p.id)).toBeNull();
      expect(await queries.getModQueueSize()).toBe(0);

      for (const reporter of ["grace", "linus", "margaret"])
        await report(reporter, "post", p.id);
      expect(await hiddenAt(p.id)).toBeNull();
      expect(await queries.getModQueueSize()).toBe(0);

      await report("alan", "post", p.id);
      expect(await queries.getModQueueSize()).toBe(1);
      expect(await hiddenAt(p.id)).toBeNull();
    });

    it("bans the author: signed out, locked out, and everything they wrote hidden", async () => {
      const reported = await post("ada", { title: "The reported one" });
      const other = await post("ada", { title: "Another one" });
      as("ada");
      await actions.addComment(other.id, "A reply of mine");
      await db.session.create({
        data: {
          id: "session-ada",
          token: "token-ada",
          userId: "ada",
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
      await report("grace", "post", reported.id);
      await report("linus", "post", other.id);

      as("mod");
      const banned = await actions.moderate({
        target: "post",
        id: reported.id,
        decision: "ban",
      });
      expect(banned.ok).toBe(true);
      expect(
        await db.post.findUnique({ where: { id: reported.id } }),
      ).toBeNull();
      expect(await hiddenAt(other.id)).not.toBeNull();
      expect(
        await db.comment.count({ where: { authorId: "ada", hiddenAt: null } }),
      ).toBe(0);
      expect(await db.session.count({ where: { userId: "ada" } })).toBe(0);
      expect(await queries.getModQueueSize()).toBe(0);

      // A stale queue item must never restore a banned author's other content.
      expect(
        (
          await actions.moderate({
            target: "post",
            id: other.id,
            decision: "keep",
          })
        ).ok,
      ).toBe(false);
      expect(await hiddenAt(other.id)).not.toBeNull();

      as("ada");
      expect((await actions.addComment(other.id, "Still here?")).ok).toBe(
        false,
      );
    });

    it("rolls back content removal when banning the author fails", async () => {
      const p = await post("ada");
      await db.post.update({
        where: { id: p.id },
        data: {
          imageUrl: "https://test.public.blob.vercel-storage.com/kept.webp",
        },
      });
      vi.mocked(del).mockClear();
      await report("grace", "post", p.id);
      as("mod");
      await db.$executeRaw`ALTER TABLE "User" ADD CONSTRAINT test_ban_rejected CHECK ("bannedAt" IS NULL)`;
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        expect(
          (
            await actions.moderate({
              target: "post",
              id: p.id,
              decision: "ban",
            })
          ).ok,
        ).toBe(false);
        expect(
          await db.post.findUnique({ where: { id: p.id } }),
        ).not.toBeNull();
        expect(await db.report.count()).toBe(1);
        expect(del).not.toHaveBeenCalled();
        expect(
          (await db.user.findUniqueOrThrow({ where: { id: "ada" } })).bannedAt,
        ).toBeNull();
      } finally {
        await db.$executeRaw`ALTER TABLE "User" DROP CONSTRAINT test_ban_rejected`;
        log.mockRestore();
      }
    });

    it("handles two moderators removing the same post", async () => {
      const p = await post("ada");
      as("mod");
      const decision = {
        target: "post",
        id: p.id,
        decision: "remove",
      } as const;
      const results = await Promise.all([
        actions.moderate(decision),
        actions.moderate(decision),
      ]);
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(await db.post.count()).toBe(0);
    });

    it("bans a reported reply's author without removing the thread", async () => {
      const thread = await post("grace");
      const other = await post("ada");
      as("ada");
      const id = crypto.randomUUID();
      await actions.addComment(thread.id, "A reported reply", id);
      await report("linus", "comment", id);
      as("mod");
      expect(
        (await actions.moderate({ target: "comment", id, decision: "ban" })).ok,
      ).toBe(true);
      expect(await db.comment.count()).toBe(0);
      expect(
        await db.post.findUnique({ where: { id: thread.id } }),
      ).not.toBeNull();
      expect(await hiddenAt(other.id)).not.toBeNull();
      expect(
        (
          await actions.moderate({
            target: "post",
            id: other.id,
            decision: "keep",
          })
        ).ok,
      ).toBe(false);
    });

    it("won't let a moderator ban themselves", async () => {
      const p = await post("mod");
      await report("grace", "post", p.id);
      as("mod");
      const result = await actions.moderate({
        target: "post",
        id: p.id,
        decision: "ban",
      });
      expect(result.ok).toBe(false);
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: "mod" } })).bannedAt,
      ).toBeNull();
    });
  });

  describe("polls", () => {
    async function pollPost(
      author: string,
      labels: string[],
      audience: "EVERYONE" | "CAMPUS" = "EVERYONE",
    ) {
      const user = await db.user.findUniqueOrThrow({ where: { id: author } });
      return db.post.create({
        data: {
          title: "Which one?",
          body: "",
          audience,
          authorId: author,
          universityId: user.universityId,
          pollOptions: {
            create: labels.map((label, position) => ({ label, position })),
          },
        },
        include: { pollOptions: { orderBy: { position: "asc" } } },
      });
    }
    const pollFor = async (viewerId: string, postId: string) =>
      (
        await queries.getFeed(await viewer(viewerId), {
          scope: { kind: "everyone" },
        })
      ).items.find((item) => item.id === postId)?.poll;

    it("creates a poll from the composer's form", async () => {
      as("ada");
      const form = new FormData();
      form.set("title", "Best dining hall?");
      form.set("body", "");
      form.set("topic", "CAMPUS_LIFE");
      form.set("audience", "EVERYONE");
      form.append("pollChoice", "North");
      form.append("pollChoice", "South");
      await expect(actions.createPost(null, form)).rejects.toMatchObject({
        url: expect.stringMatching(/^\/p\//),
      });
      const options = await db.pollOption.findMany({
        orderBy: { position: "asc" },
      });
      expect(options.map((option) => option.label)).toEqual(["North", "South"]);
    });

    it("hides results until you vote and moves your vote when you change it", async () => {
      const p = await pollPost("ada", ["North", "South"]);
      const [north, south] = p.pollOptions;
      expect((await pollFor("ada", p.id))?.options.map((o) => o.votes)).toEqual(
        [0, 0],
      );

      as("grace");
      const first = await actions.votePoll(p.id, north!.id);
      expect(first.ok && first.data.options.map((o) => o.votes)).toEqual([
        1, 0,
      ]);
      expect(await pollFor("linus", p.id)).toMatchObject({
        total: 1,
        choice: null,
        options: [{ votes: null }, { votes: null }],
      });

      const moved = await actions.votePoll(p.id, south!.id);
      expect(moved.ok && moved.data).toMatchObject({
        total: 1,
        choice: south!.id,
        options: [{ votes: 0 }, { votes: 1 }],
      });
      expect(await db.pollVote.count()).toBe(1);
    });

    it("rejects choices from another poll and polls you can't see", async () => {
      const a = await pollPost("ada", ["Yes", "No"]);
      const b = await pollPost("ada", ["Up", "Down"]);
      const campus = await pollPost("ada", ["Here", "There"], "CAMPUS");
      as("grace");
      expect((await actions.votePoll(b.id, a.pollOptions[0]!.id)).ok).toBe(
        false,
      );
      expect(
        (await actions.votePoll(campus.id, campus.pollOptions[0]!.id)).ok,
      ).toBe(false);
      expect(await db.pollVote.count()).toBe(0);
    });

    it("never says who voted", async () => {
      const p = await pollPost("ada", ["Yes", "No"]);
      as("grace");
      await actions.votePoll(p.id, p.pollOptions[0]!.id);
      as("linus");
      await actions.votePoll(p.id, p.pollOptions[1]!.id);
      const payload = JSON.stringify(
        await queries.getThread(await viewer("alan"), p.id),
      );
      for (const secret of ['"grace"', '"linus"', "grace@mit.edu"])
        expect(payload).not.toContain(secret);
    });
  });
});
