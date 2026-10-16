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
import { TEAM } from "@/lib/universities";

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
            where: { id: state.viewerId, bannedAt: null },
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

      as("ada");
      expect((await actions.addComment(other.id, "Still here?")).ok).toBe(
        false,
      );
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
