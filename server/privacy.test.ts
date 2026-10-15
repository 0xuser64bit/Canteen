/**
 * Integration tests for the rules that keep Canteen anonymous and safe.
 * They run against a real Postgres: set TEST_DATABASE_URL to a disposable,
 * already-migrated database (see CONTRIBUTING.md). Skipped otherwise.
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const TEST_DATABASE_URL = vi.hoisted(() => {
  const url = process.env.TEST_DATABASE_URL;
  if (url) process.env.DATABASE_URL = url;
  return url;
});

const state = vi.hoisted(() => ({ viewerId: null as string | null }));

vi.mock("@/lib/session", async () => {
  const { db } = await import("@/lib/db");
  return {
    getViewer: async () =>
      state.viewerId
        ? db.user.findUnique({
            where: { id: state.viewerId },
            select: {
              id: true,
              email: true,
              createdAt: true,
              university: { select: { id: true, slug: true, name: true } },
            },
          })
        : null,
  };
});
vi.mock("@/lib/auth", () => ({ auth: { api: { signOut: vi.fn() } } }));
vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));
vi.mock("next/server", () => ({
  after: (task: Promise<unknown> | (() => unknown)) =>
    typeof task === "function" ? task() : task,
}));
vi.mock("@vercel/blob", () => ({ put: vi.fn(), del: vi.fn() }));

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
      'TRUNCATE "Notification", "Report", "PostView", "Like", "Comment", "Post", "Session", "Account", "User", "University" CASCADE',
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

  async function post(
    author: string,
    overrides: Partial<{ audience: "EVERYONE" | "CAMPUS"; title: string }> = {},
  ) {
    const user = await db.user.findUniqueOrThrow({ where: { id: author } });
    return db.post.create({
      data: {
        title: overrides.title ?? "A question for everyone",
        body: "Body text",
        audience: overrides.audience ?? "EVERYONE",
        authorId: author,
        universityId: user.universityId,
      },
    });
  }

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
    const notifications = await db.notification.findMany({
      where: { userId: "ada" },
    });
    expect(notifications).toHaveLength(1);
    expect(Object.keys(notifications[0]!)).not.toContain("actorId");
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
});
