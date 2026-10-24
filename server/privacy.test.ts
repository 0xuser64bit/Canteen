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
import { sendReplyNotice, sendSignInCode } from "@/lib/email";
import { getViewer } from "@/lib/session";
import { TEAM } from "@/lib/universities";

const TEST_DATABASE_URL = vi.hoisted(() => {
  const url = process.env.TEST_DATABASE_URL;
  if (url) process.env.DATABASE_URL = url;
  return url;
});

const state = vi.hoisted(() => {
  const { AsyncLocalStorage } = process.getBuiltinModule("node:async_hooks");
  return {
    viewerId: null as string | null,
    background: [] as Promise<unknown>[],
    // The signed-in student of one simulated request, pinned before its first await.
    request: new AsyncLocalStorage<{ viewerId: string | null }>(),
  };
});

// The real session-to-viewer mapping (suspension, staff and host checks) runs on
// top of the mocked Better Auth session below; only the draft owner is stubbed.
vi.mock("@/lib/session", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/session")>();
  const perRequest = <T>(load: () => Promise<T>) =>
    vi.fn(() => state.request.run({ viewerId: state.viewerId }, load));
  return {
    ...real,
    getDraftOwner: vi.fn(async () => `draft-owner:${state.viewerId}`),
    getAccountViewer: perRequest(real.getAccountViewer),
    getViewer: perRequest(real.getViewer),
  };
});
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signOut: vi.fn(),
      getSession: vi.fn(async () => {
        const pinned = state.request.getStore();
        const viewerId = pinned ? pinned.viewerId : state.viewerId;
        return viewerId ? { user: { id: viewerId } } : null;
      }),
    },
  },
}));
vi.mock("@/lib/email", () => ({
  sendSignInCode: vi.fn(),
  sendReplyNotice: vi.fn(),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));
vi.mock("next/server", () => ({
  connection: async () => {},
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
      'TRUNCATE "Maintenance", "SignInBudget", "SuspendedEmail", "UniversityRequest", "Publication", "DailyActivity", "ModerationCase", "Follow", "Bookmark", "HelpfulAnswer", "BlobDeletion", "Notification", "Report", "PostView", "Like", "Comment", "Post", "Session", "Account", "Verification", "RateLimit", "User", "University" CASCADE',
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
    // A concurrent hide can outlive the write-time check; reads still treat it as unanswered.
    await db.comment.update({
      where: { id: c.id },
      data: { hiddenAt: new Date() },
    });
    expect(
      (await queries.getThread(await viewer("ada"), p.id))?.helpfulCommentId,
    ).toBeNull();
    expect(
      (
        await queries.getFeed(await viewer("ada"), {
          scope: { kind: "campus" },
          unanswered: true,
        })
      ).items,
    ).toHaveLength(1);
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

  it("tells a reply's author it helped, and takes back unseen thanks when the choice changes", async () => {
    const p = await post("ada", { kind: "QUESTION" });
    const [annex, weekends] = await Promise.all(
      [
        ["alan", "Try the library annex."],
        ["grace", "It's open on weekends too."],
      ].map(([authorId, body]) =>
        db.comment.create({
          data: { postId: p.id, authorId: authorId!, body: body! },
        }),
      ),
    );
    const thanks = () =>
      db.notification.findMany({
        select: { userId: true, type: true, replyId: true, readAt: true },
        orderBy: { userId: "asc" },
      });
    as("ada");
    expect((await actions.markHelpful(p.id, annex!.id)).ok).toBe(true);
    // Choosing the same reply again is not a second thank-you.
    expect((await actions.markHelpful(p.id, annex!.id)).ok).toBe(true);
    expect(await thanks()).toEqual([
      { userId: "alan", type: "HELPFUL", replyId: annex!.id, readAt: null },
    ]);
    expect(
      (await queries.getNotifications(await viewer("alan")))[0],
    ).toMatchObject({
      type: "HELPFUL",
      replyId: annex!.id,
      post: { id: p.id, mine: false, question: true },
    });
    expect(await queries.getNotifications(await viewer("ada"))).toEqual([]);

    expect((await actions.markHelpful(p.id, weekends!.id)).ok).toBe(true);
    expect(await thanks()).toEqual([
      { userId: "grace", type: "HELPFUL", replyId: weekends!.id, readAt: null },
    ]);
    // A thank-you the student already saw stays in their history.
    as("grace");
    await actions.markNotificationsRead(
      (await queries.getNotifications(await viewer("grace"))).map(
        ({ id, revision }) => ({ id, revision }),
      ),
    );
    as("ada");
    expect((await actions.markHelpful(p.id, null)).ok).toBe(true);
    expect(await db.notification.count({ where: { userId: "grace" } })).toBe(1);
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

  it("follows a thread for each student who replies, so follow-ups reach them", async () => {
    const p = await post("ada", { kind: "QUESTION" });
    as("alan");
    await actions.addComment(p.id, "Try the library annex");
    as("grace");
    await actions.addComment(p.id, "Same question here");
    as("ada");
    await actions.addComment(p.id, "Thanks! Is it open on weekends?");
    expect(
      await db.follow.findMany({
        select: { userId: true },
        orderBy: { userId: "asc" },
      }),
    ).toEqual([{ userId: "alan" }, { userId: "grace" }]);
    // One coalesced alert each; the author's own replies never follow or alert themselves.
    expect(
      await db.notification.findMany({
        where: { readAt: null },
        select: { userId: true, type: true },
        orderBy: { userId: "asc" },
      }),
    ).toEqual([
      { userId: "ada", type: "COMMENT" },
      { userId: "alan", type: "COMMENT" },
      { userId: "grace", type: "COMMENT" },
    ]);
    // Unfollowing sticks until the student replies again.
    as("alan");
    expect((await actions.setCollection(p.id, "following", false)).ok).toBe(
      true,
    );
    await db.notification.deleteMany({ where: { userId: "alan" } });
    as("grace");
    await actions.addComment(p.id, "Weekends too, until six");
    expect(await db.notification.count({ where: { userId: "alan" } })).toBe(0);
  });

  it("saves simultaneous replies and alerts when two students reply to each other", async () => {
    const a = await post("ada");
    const b = await post("alan");
    const [ada, alan] = await Promise.all([viewer("ada"), viewer("alan")]);
    await db.$executeRawUnsafe(
      `CREATE FUNCTION test_slow_reply() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.1); RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER test_slow_reply BEFORE INSERT ON "Comment" FOR EACH ROW EXECUTE FUNCTION test_slow_reply()`,
    );
    try {
      vi.mocked(getViewer)
        .mockResolvedValueOnce(ada)
        .mockResolvedValueOnce(alan);
      const results = await Promise.all([
        actions.addComment(b.id, "A reply to your question"),
        actions.addComment(a.id, "A reply to your question"),
      ]);
      expect(results.every((result) => result.ok)).toBe(true);
      expect(await db.comment.count()).toBe(2);
      expect(await db.notification.count()).toBe(2);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER test_slow_reply ON "Comment"');
      await db.$executeRawUnsafe("DROP FUNCTION test_slow_reply()");
    }
  });

  it("fills busy campuses with eligible universities before applying the discovery cap", async () => {
    const campuses = Array.from({ length: 16 }, (_, index) => ({
      id: `busy-campus-${index}`,
      domain: `busy-campus-${index}.example`,
      slug: `busy-campus-${index}`,
      name: `Campus ${index}`,
      country: "United States",
      countryCode: "US",
    }));
    await db.university.createMany({ data: campuses });
    for (const [index, campus] of campuses.entries()) {
      await db.user.createMany({
        data: Array.from({ length: index < 12 ? 1 : 5 }, (_, member) => ({
          id: `${campus.id}-student-${member}`,
          email: `student-${member}@${campus.domain}`,
          emailVerified: true,
          universityId: campus.id,
        })),
      });
      await db.post.createMany({
        data: Array.from({ length: index < 12 ? 3 : 1 }, () => ({
          authorId: `${campus.id}-student-0`,
          universityId: campus.id,
          title: "A recent public discussion",
          body: "Some context",
          audience: "EVERYONE" as const,
        })),
      });
    }
    const eligible = campuses.slice(12);
    await db.post.createMany({
      data: [
        { audience: "CAMPUS" as const },
        { audience: "EVERYONE" as const, hiddenAt: new Date() },
        {
          audience: "EVERYONE" as const,
          deadline: new Date(Date.now() - 60_000),
        },
        {
          audience: "EVERYONE" as const,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60_000),
        },
      ].map((fields) => ({
        ...fields,
        authorId: `${eligible[0]!.id}-student-0`,
        universityId: eligible[0]!.id,
        title: "Not in discovery",
        body: "Some context",
      })),
    });
    expect(await queries.getActiveUniversities()).toEqual(
      eligible.map((campus) => ({
        name: campus.name,
        slug: campus.slug,
        postCount: 1,
      })),
    );
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

  it("keeps campus-only, hidden and expired posts out of trending discovery", async () => {
    const campus = await post("ada", { audience: "CAMPUS" });
    const hidden = await post("ada");
    const expired = await post("ada");
    const visible = await post("ada");
    await db.post.update({
      where: { id: hidden.id },
      data: { hiddenAt: new Date() },
    });
    await db.post.update({
      where: { id: expired.id },
      data: { deadline: new Date(0), topic: "OPPORTUNITIES" },
    });
    await db.like.createMany({
      data: [campus, hidden, expired, visible].map((p) => ({
        postId: p.id,
        userId: "alan",
      })),
    });
    expect(
      (await queries.getTrending(await viewer("grace"))).map((p) => p.id),
    ).toEqual([visible.id]);
    expect(
      new Set(
        (await queries.getTrending(await viewer("alan"))).map((p) => p.id),
      ),
    ).toEqual(new Set([campus.id, visible.id]));
  });

  it("counts only visible replies in trending summaries", async () => {
    const p = await post("ada");
    await db.comment.createMany({
      data: [
        { postId: p.id, authorId: "alan", body: "A visible reply" },
        {
          postId: p.id,
          authorId: "grace",
          body: "A hidden reply",
          hiddenAt: new Date(),
        },
      ],
    });
    expect(await queries.getTrending(await viewer("linus"))).toMatchObject([
      { id: p.id, commentCount: 1 },
    ]);
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

  it("leaves out a small campus's country when that would name the campus", async () => {
    await db.university.create({
      data: {
        id: "u-luxembourg",
        domain: "uni.lu",
        slug: "university-of-luxembourg",
        name: "University of Luxembourg",
        country: "Luxembourg",
        countryCode: "LU",
      },
    });
    await db.user.create({
      data: {
        id: "lux",
        email: "lux@uni.lu",
        universityId: "u-luxembourg",
        emailVerified: true,
      },
    });
    const p = await post("lux");
    const outsider = await queries.getThread(await viewer("grace"), p.id);
    expect(outsider!.university).toEqual({ name: "A university", slug: null });
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
    // The marker can't be joined back to the student: no reading list is stored.
    const marker = await db.postView.findFirstOrThrow();
    expect(marker.viewer).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(marker)).not.toContain("grace");
    as("linus");
    await actions.recordView(p.id);
    expect(await db.postView.count()).toBe(2);
    await actions.setLike(p.id, true);
    await finishBackground();
    const notifications = await db.notification.findMany({
      where: { userId: "ada" },
    });
    expect(notifications).toHaveLength(1);
    expect(Object.keys(notifications[0]!)).not.toContain("actorId");
  });

  it("emails a question's author once, without content, only when asked", async () => {
    vi.mocked(sendReplyNotice).mockClear();
    const ask = (kind: "QUESTION" | "DISCUSSION") => {
      const form = new FormData();
      for (const [key, value] of Object.entries({
        title: "Which dorm is quietest?",
        body: "Asking before housing opens",
        topic: "CAMPUS_LIFE",
        audience: "CAMPUS",
        kind,
        emailOnReply: "on",
      }))
        form.set(key, value);
      return actions.createPost(null, form);
    };
    as("ada");
    const { postedId } = (await ask("QUESTION")) as { postedId: string };
    const conversation = (await ask("DISCUSSION")) as { postedId: string };
    expect(
      await db.post.findUniqueOrThrow({
        where: { id: conversation.postedId },
      }),
    ).toMatchObject({ emailOnReply: false });

    // The author's own reply doesn't count; the first reply from someone else does.
    await actions.addComment(postedId, "Adding some context");
    as("alan");
    await actions.addComment(postedId, "The east dorms are quiet");
    await actions.addComment(postedId, "Also the library annex");
    await actions.addComment(conversation.postedId, "Hi");
    await finishBackground();
    expect(sendReplyNotice).toHaveBeenCalledOnce();
    const [to, url] = vi.mocked(sendReplyNotice).mock.calls[0]!;
    expect(to).toBe("ada@stanford.edu");
    expect(url).toMatch(new RegExp(`^https?://[^/]+/p/${postedId}$`));
  });

  it("sends no reply email unless the author asked for one", async () => {
    vi.mocked(sendReplyNotice).mockClear();
    const p = await post("ada", { kind: "QUESTION" });
    as("alan");
    await actions.addComment(p.id, "A reply");
    await finishBackground();
    expect(sendReplyNotice).not.toHaveBeenCalled();
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
    await actions.markNotificationsRead(
      (await queries.getNotifications(await viewer("ada"))).map(
        ({ id, revision }) => ({ id, revision }),
      ),
    );
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

  it("acknowledges only delivered versions and leaves older, new and foreign alerts unread", async () => {
    const p = await post("ada");
    await db.notification.createMany({
      data: Array.from({ length: 55 }, (_, i) => ({
        id: crypto.randomUUID(),
        userId: "ada",
        postId: p.id,
        type: "COMMENT" as const,
        createdAt: new Date(Date.now() - (60 - i) * 1000),
      })),
    });
    const delivered = await queries.getNotifications(await viewer("ada"));
    expect(delivered).toHaveLength(50);
    const stale = delivered[0]!;
    await db.notification.update({
      where: { id: stale.id },
      data: { revision: { increment: 1 } },
    });
    const arrived = await db.notification.create({
      data: { userId: "ada", postId: p.id, type: "LIKE" },
    });
    const foreign = await db.notification.create({
      data: { userId: "alan", postId: p.id, type: "COMMENT" },
    });
    as("ada");
    await actions.markNotificationsRead([
      ...delivered.slice(0, 49).map(({ id, revision }) => ({ id, revision })),
      { id: foreign.id, revision: 0 },
    ]);
    expect(
      (await db.notification.findUniqueOrThrow({ where: { id: stale.id } }))
        .readAt,
    ).toBeNull();
    expect(
      (await db.notification.findUniqueOrThrow({ where: { id: arrived.id } }))
        .readAt,
    ).toBeNull();
    expect(
      (await db.notification.findUniqueOrThrow({ where: { id: foreign.id } }))
        .readAt,
    ).toBeNull();
    expect(
      await db.notification.count({
        where: { userId: "ada", readAt: { not: null } },
      }),
    ).toBe(48);
    const last = delivered.at(-1)!;
    const older = await queries.getNotifications(
      await viewer("ada"),
      `${last.createdAt.toISOString()}_${last.id}`,
    );
    expect(older).toHaveLength(5);
    expect(older.every((item) => item.unread)).toBe(true);
  });

  it("preserves a focused historical reply page through revision changes and rechecks removed replies", async () => {
    const p = await post("ada", { kind: "QUESTION" });
    const ids = Array.from({ length: 110 }, () => crypto.randomUUID());
    await db.comment.createMany({
      data: ids.map((id, i) => ({
        id,
        postId: p.id,
        authorId: "alan",
        body: `Reply ${i}`,
        createdAt: new Date(Date.now() - (110 - i) * 1000),
      })),
    });
    await db.helpfulAnswer.create({
      data: { postId: p.id, commentId: ids[8]! },
    });
    const initial = (await queries.getThread(
      await viewer("ada"),
      p.id,
      undefined,
      ids[30],
    ))!;
    expect(initial.comments.at(-1)?.id).toBe(ids[30]);
    expect(initial.helpfulReply?.id).toBe(ids[8]);
    as("grace");
    await actions.setLike(p.id, true);
    await db.comment.update({
      where: { id: ids[20] },
      data: { hiddenAt: new Date() },
    });
    const refreshed = (await queries.getThread(
      await viewer("ada"),
      p.id,
      undefined,
      ids[30],
    ))!;
    expect(refreshed.comments.at(-1)?.id).toBe(ids[30]);
    expect(refreshed.comments.map((reply) => reply.id)).not.toContain(ids[20]);
    expect(refreshed.revision).toBeGreaterThan(initial.revision);
    await db.comment.delete({ where: { id: ids[8] } });
    expect(
      (await queries.getThread(await viewer("ada"), p.id, undefined, ids[30]))!
        .helpfulReply,
    ).toBeNull();
  });

  it("makes interrupted post retries idempotent without replenishing publication quotas", async () => {
    as("ada");
    const form = new FormData();
    const id = crypto.randomUUID();
    for (const [key, value] of Object.entries({
      id,
      title: "A useful question",
      body: "Some context",
      topic: "GENERAL",
      audience: "CAMPUS",
    }))
      form.set(key, value);
    expect(await actions.createPost(null, form)).toEqual({ postedId: id });
    expect(await actions.createPost(null, form)).toEqual({ postedId: id });
    form.set("draftOwner", "a-different-session");
    expect(await actions.createPost(null, form)).toHaveProperty("error");
    expect(await db.post.count()).toBe(1);
    expect(
      await db.publication.count({ where: { userId: "ada", kind: "POST" } }),
    ).toBe(1);
    await actions.deletePost(id);
    expect(
      await db.publication.count({ where: { userId: "ada", kind: "POST" } }),
    ).toBe(1);
  });

  it("acknowledges a saved opportunity retry even after its deadline passes", async () => {
    as("ada");
    const form = new FormData();
    const id = crypto.randomUUID();
    const now = Date.now();
    for (const [key, value] of Object.entries({
      id,
      title: "A closing opportunity",
      body: "Some context",
      topic: "OPPORTUNITIES",
      audience: "EVERYONE",
      applicationUrl: "https://example.org/apply",
      deadline: new Date(now + 60_000).toISOString(),
    }))
      form.set(key, value);
    expect(await actions.createPost(null, form)).toEqual({ postedId: id });
    const clock = vi.spyOn(Date, "now").mockReturnValue(now + 120_000);
    try {
      expect(await actions.createPost(null, form)).toEqual({ postedId: id });
      expect(await db.post.count()).toBe(1);
      expect(
        await db.publication.count({ where: { userId: "ada", kind: "POST" } }),
      ).toBe(1);
      as("alan");
      expect(await actions.createPost(null, form)).not.toHaveProperty(
        "postedId",
      );
    } finally {
      clock.mockRestore();
    }
  });

  it("sorts waiting questions oldest first and saved opportunities by deadline across page boundaries", async () => {
    const ids = Array.from({ length: 24 }, () => crypto.randomUUID());
    await db.post.createMany({
      data: ids.map((id, i) => ({
        id,
        authorId: "ada",
        universityId: "u-stanford",
        title: "A waiting question",
        body: "Some context",
        audience: "CAMPUS" as const,
        kind: "QUESTION" as const,
        createdAt: new Date(Date.now() - (24 - i) * 1000),
      })),
    });
    await db.comment.create({
      data: { postId: ids[0]!, authorId: "alan", body: "An initial reply" },
    });
    const v = await viewer("alan");
    const first = await queries.getFeed(v, {
      scope: { kind: "campus" },
      unanswered: true,
      noReplies: true,
      sort: "oldest",
    });
    const second = await queries.getFeed(v, {
      scope: { kind: "campus" },
      unanswered: true,
      noReplies: true,
      sort: "oldest",
      cursor: first.nextCursor!,
    });
    expect([...first.items, ...second.items].map((item) => item.id)).toEqual(
      ids.slice(1),
    );
    await db.post.updateMany({
      where: { id: { in: ids } },
      data: {
        topic: "OPPORTUNITIES",
        deadline: new Date(Date.now() + 86400000),
        applicationUrl: "https://example.org/apply",
      },
    });
    await db.bookmark.createMany({
      data: ids.map((postId) => ({ userId: "alan", postId })),
    });
    const closing = await queries.getFeed(v, {
      scope: { kind: "saved" },
      topic: "OPPORTUNITIES",
      sort: "closing",
    });
    const more = await queries.getFeed(v, {
      scope: { kind: "saved" },
      topic: "OPPORTUNITIES",
      sort: "closing",
      cursor: closing.nextCursor!,
    });
    expect([...closing.items, ...more.items].map((item) => item.id)).toEqual(
      [...ids].sort(),
    );
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

  it("accepts exact reply retries and rejects reused ids with a different payload or author", async () => {
    const p = await post("ada");
    const other = await post("alan");
    as("grace");
    const id = crypto.randomUUID();
    expect((await actions.addComment(p.id, "first", id)).ok).toBe(true);
    expect(await db.comment.findUnique({ where: { id } })).not.toBeNull();
    expect((await actions.addComment(p.id, "  first  ", id)).ok).toBe(true);
    expect((await actions.addComment(p.id, "again", id)).ok).toBe(false);
    expect((await actions.addComment(other.id, "first", id)).ok).toBe(false);
    as("linus");
    expect((await actions.addComment(p.id, "first", id)).ok).toBe(false);
    expect((await actions.addComment(p.id, "bad", "not-a-uuid")).ok).toBe(
      false,
    );
    expect(await db.comment.count()).toBe(1);
  });

  it("acknowledges simultaneous reply retries once without repeating quota or notifications", async () => {
    vi.mocked(sendReplyNotice).mockClear();
    const p = await post("ada", { kind: "QUESTION" });
    await db.post.update({
      where: { id: p.id },
      data: { emailOnReply: true },
    });
    as("alan");
    const id = crypto.randomUUID();
    expect(
      await Promise.all([
        actions.addComment(p.id, "A useful reply", id),
        actions.addComment(p.id, "A useful reply", id),
      ]),
    ).toEqual([
      { ok: true, data: null },
      { ok: true, data: null },
    ]);
    await finishBackground();
    expect(sendReplyNotice).toHaveBeenCalledOnce();
    expect(await db.comment.count()).toBe(1);
    expect(await db.publication.count({ where: { kind: "COMMENT" } })).toBe(1);
    expect(await db.notification.findMany()).toMatchObject([
      { userId: "ada", replyId: id, revision: 0 },
    ]);

    // An acknowledgement still succeeds when the original reply used the last slot.
    await db.publication.createMany({
      data: Array.from({ length: 19 }, () => ({
        userId: "alan",
        kind: "COMMENT" as const,
      })),
    });
    expect((await actions.addComment(p.id, "A useful reply", id)).ok).toBe(
      true,
    );
    expect((await actions.addComment(p.id, "A new reply")).ok).toBe(false);
    await finishBackground();
    expect(sendReplyNotice).toHaveBeenCalledOnce();
    expect(await db.comment.count()).toBe(1);
    expect(await db.publication.count({ where: { kind: "COMMENT" } })).toBe(20);
    expect(await db.notification.count()).toBe(1);
    expect(
      (await db.post.findUniqueOrThrow({ where: { id: p.id } })).revision,
    ).toBe(1);
  });

  it("rechecks authentication, suspension and post visibility before acknowledging a reply retry", async () => {
    const p = await post("ada", { audience: "CAMPUS" });
    const id = crypto.randomUUID();
    as("alan");
    expect((await actions.addComment(p.id, "A campus reply", id)).ok).toBe(
      true,
    );
    const beforeBan = await viewer("alan");
    await db.user.update({
      where: { id: "alan" },
      data: { bannedAt: new Date() },
    });
    vi.mocked(getViewer).mockResolvedValueOnce(beforeBan);
    expect((await actions.addComment(p.id, "A campus reply", id)).ok).toBe(
      false,
    );
    as(null);
    expect((await actions.addComment(p.id, "A campus reply", id)).ok).toBe(
      false,
    );
    await db.user.update({ where: { id: "alan" }, data: { bannedAt: null } });
    await db.post.update({
      where: { id: p.id },
      data: { hiddenAt: new Date() },
    });
    as("alan");
    expect((await actions.addComment(p.id, "A campus reply", id)).ok).toBe(
      false,
    );
    expect(await db.comment.count()).toBe(1);
    expect(await db.publication.count()).toBe(1);
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

  it("does not replenish reply quotas when the student erases replies", async () => {
    const p = await post("ada");
    as("alan");
    for (let i = 0; i < 20; i++) {
      const id = crypto.randomUUID();
      expect((await actions.addComment(p.id, "A reply", id)).ok).toBe(true);
      expect((await actions.deleteComment(id)).ok).toBe(true);
    }
    expect(await db.comment.count()).toBe(0);
    expect((await actions.addComment(p.id, "One more")).ok).toBe(false);
    await db.publication.updateMany({
      data: { createdAt: new Date(Date.now() - 11 * 60_000) },
    });
    expect((await actions.addComment(p.id, "After the window")).ok).toBe(true);
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
    const published = results.filter(
      (result) => result.status === "fulfilled" && result.value?.postedId,
    );
    expect(published).toHaveLength(5);
    expect(await db.post.count()).toBe(5);
    expect(
      results.filter(
        (result) => result.status === "fulfilled" && result.value?.error,
      ),
    ).toEqual([
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

    const revision = (await db.post.findUniqueOrThrow({ where: { id: p.id } }))
      .revision;
    as("grace");
    await expect(
      actions.deleteAccount("delete my account"),
    ).resolves.toMatchObject({ ok: true });
    expect(await db.user.findUnique({ where: { id: "grace" } })).toBeNull();
    expect(await db.comment.count()).toBe(0);
    expect(await db.like.count()).toBe(0);
    expect(await db.post.count()).toBe(1);
    expect(
      (await db.post.findUniqueOrThrow({ where: { id: p.id } })).revision,
    ).toBeGreaterThan(revision);
  });

  it("erases two accounts with cross-replies without reversing post lock order", async () => {
    const a = await post("ada"),
      b = await post("alan");
    await db.comment.createMany({
      data: [
        { postId: a.id, authorId: "alan", body: "Cross reply A" },
        { postId: b.id, authorId: "ada", body: "Cross reply B" },
      ],
    });
    const { getAccountViewer } = await import("@/lib/session");
    vi.mocked(getAccountViewer)
      .mockResolvedValueOnce({ ...(await viewer("ada")), bannedAt: null })
      .mockResolvedValueOnce({ ...(await viewer("alan")), bannedAt: null });
    const results = await Promise.all([
      actions.deleteAccount("delete my account"),
      actions.deleteAccount("delete my account"),
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(await db.post.count()).toBe(0);
    expect(await db.comment.count()).toBe(0);
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
      vi.mocked(get).mockReset();
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
      form.set("imageAlt", "Description of the attached image");
      form.set("imageWidth", "9999");
      form.set("imageHeight", "9999");
      return form;
    }

    it("strips metadata on the server and derives the dimensions from the image", async () => {
      expect(await actions.createPost(null, await imageForm())).toMatchObject({
        postedId: expect.any(String),
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
        imageAlt: "Description of the attached image",
      });
      const p = await db.post.findFirstOrThrow();
      expect(
        (await queries.getThread(await viewer("alan"), p.id))!.image?.alt,
      ).toBe("Description of the attached image");
    });

    it("requires an image description before doing upload work", async () => {
      const form = await imageForm();
      form.delete("imageAlt");
      expect(
        (await actions.createPost(null, form))?.fieldErrors?.imageAlt,
      ).toBeDefined();
      expect(put).not.toHaveBeenCalled();
      expect(await db.publication.count()).toBe(0);
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

    it("limits moderator images to assigned campuses or open reports", async () => {
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
      const p = await post("ada", { audience: "CAMPUS", imageUrl });
      const { GET } = await import("@/app/api/images/[id]/route");
      const read = () =>
        GET(new Request("http://localhost/api/images/" + p.id), {
          params: Promise.resolve({ id: p.id }),
        });
      vi.mocked(get).mockImplementation(
        async () =>
          ({
            statusCode: 200,
            stream: new Response("image").body,
            blob: { contentType: "image/webp" },
          }) as never,
      );
      as("mod");
      expect((await read()).status).toBe(404);
      expect(get).not.toHaveBeenCalled();

      vi.stubEnv(
        "CAMPUS_HOSTS",
        JSON.stringify({ "mod@example.com": ["stanford.edu"] }),
      );
      expect((await read()).status).toBe(200);
      vi.stubEnv("CAMPUS_HOSTS", "{}");
      expect((await read()).status).toBe(404);

      as("alan");
      expect(
        await actions.reportContent({
          target: "post",
          id: p.id,
          reason: "OTHER",
        }),
      ).toEqual({ ok: true, data: null });
      as("mod");
      expect((await read()).status).toBe(200);
      await db.post.update({
        where: { id: p.id },
        data: { hiddenAt: new Date() },
      });
      expect((await read()).status).toBe(200);
      as("grace");
      expect((await read()).status).toBe(404);

      as("mod");
      await db.user.update({
        where: { id: "mod" },
        data: { bannedAt: new Date() },
      });
      expect((await read()).status).toBe(401);
      await db.user.update({ where: { id: "mod" }, data: { bannedAt: null } });
      await db.report.updateMany({ data: { resolvedAt: new Date() } });
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
      ).resolves.toMatchObject({ ok: true });
      await Promise.all(state.background.splice(0));
      expect(await db.blobDeletion.count()).toBe(1);
      expect(await db.user.findUnique({ where: { id: "ada" } })).toBeNull();
    });

    it("migrates legacy images before erasing their public originals", async () => {
      const { migrateLegacyImages, processImageDeletions } =
        await import("@/server/media");
      vi.stubEnv("BLOB_READ_WRITE_TOKEN", "legacy-token");
      const legacy = "https://test.public.blob.vercel-storage.com/old.webp";
      const broken = await post("ada", {
        imageUrl: "https://test.public.blob.vercel-storage.com/broken.webp",
      });
      await db.post.update({
        where: { id: broken.id },
        data: { updatedAt: new Date("2000-01-01") },
      });
      const p = await post("ada", { imageUrl: legacy });
      await db.post.update({
        where: { id: p.id },
        data: { updatedAt: new Date("2001-01-01") },
      });
      vi.mocked(get).mockRejectedValueOnce(new Error("Damaged legacy file"));
      expect(await migrateLegacyImages()).toBe(0);
      const bytes = await sharp({
        create: { width: 2, height: 3, channels: 3, background: "red" },
      })
        .webp()
        .toBuffer();
      vi.mocked(get).mockResolvedValueOnce({
        statusCode: 200,
        stream: new Response(new Uint8Array(bytes)).body,
      } as never);
      expect(await migrateLegacyImages()).toBe(1);
      expect(await db.post.findUnique({ where: { id: p.id } })).toMatchObject({
        imageUrl,
        imageWidth: 2,
        imageHeight: 3,
      });
      expect(put).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        expect.objectContaining({ access: "private", token: "test-token" }),
      );
      expect(await db.blobDeletion.findMany({ select: { key: true } })).toEqual(
        [{ key: legacy }],
      );
      await processImageDeletions();
      expect(del).toHaveBeenCalledWith(
        legacy,
        expect.objectContaining({ token: "legacy-token" }),
      );
    });

    it.each(["post", "account"] as const)(
      "queues the current image when migration commits before %s erasure",
      async (scope) => {
        const { migrateLegacyImages } = await import("@/server/media");
        vi.stubEnv("BLOB_READ_WRITE_TOKEN", "legacy-token");
        const legacy = "https://test.public.blob.vercel-storage.com/raced.webp";
        const p = await post("ada", { imageUrl: legacy });
        const bytes = await sharp({
          create: { width: 2, height: 3, channels: 3, background: "red" },
        })
          .webp()
          .toBuffer();
        vi.mocked(get).mockResolvedValueOnce({
          statusCode: 200,
          stream: new Response(new Uint8Array(bytes)).body,
        } as never);
        vi.mocked(del).mockRejectedValue(
          new Error("Storage temporarily unavailable"),
        );
        const transaction = db.$transaction.bind(db);
        vi.spyOn(db, "$transaction").mockImplementationOnce(
          async (operation) => {
            expect(await migrateLegacyImages()).toBe(1);
            return transaction(operation);
          },
        );
        const result =
          scope === "post"
            ? await actions.deletePost(p.id)
            : await actions.deleteAccount("delete my account");
        expect(result.ok).toBe(true);
        await finishBackground();
        expect(await db.post.count()).toBe(0);
        expect(
          (await db.blobDeletion.findMany({ select: { key: true } })).map(
            (job) => job.key,
          ),
        ).toContain(imageUrl);
      },
    );

    it("retains the orphan intent when erasure commits during a legacy upload", async () => {
      const { migrateLegacyImages } = await import("@/server/media");
      vi.stubEnv("BLOB_READ_WRITE_TOKEN", "legacy-token");
      const legacy = "https://test.public.blob.vercel-storage.com/raced.webp";
      const p = await post("ada", { imageUrl: legacy });
      const bytes = await sharp({
        create: { width: 2, height: 3, channels: 3, background: "red" },
      })
        .webp()
        .toBuffer();
      vi.mocked(get).mockResolvedValueOnce({
        statusCode: 200,
        stream: new Response(new Uint8Array(bytes)).body,
      } as never);
      const blob = await vi.mocked(put).getMockImplementation()!(
        "",
        Buffer.alloc(0),
        {} as never,
      );
      vi.mocked(put).mockImplementationOnce(async () => {
        await actions.deletePost(p.id);
        return blob;
      });
      expect(await migrateLegacyImages()).toBe(0);
      await finishBackground();
      expect(await db.post.count()).toBe(0);
      expect(
        (await db.blobDeletion.findMany({ select: { key: true } })).some(
          (job) => job.key.startsWith("posts/"),
        ),
      ).toBe(true);
    });

    it("records maintenance health and expires only bounded limiter and activity data", async () => {
      const { GET } = await import("@/app/api/maintenance/route");
      vi.stubEnv("CRON_SECRET", "a-test-secret");
      await db.publication.createMany({
        data: [
          {
            userId: "ada",
            kind: "POST",
            createdAt: new Date(Date.now() - 25 * 60 * 60_000),
          },
          { userId: "ada", kind: "POST" },
        ],
      });
      await db.rateLimit.createMany({
        data: [
          {
            id: "old-budget",
            key: "old-budget",
            count: 1,
            lastRequest: BigInt(Date.now() - 25 * 60 * 60_000),
          },
          {
            id: "fresh-budget",
            key: "fresh-budget",
            count: 1,
            lastRequest: BigInt(Date.now()),
          },
        ],
      });
      await db.signInBudget.createMany({
        data: [
          {
            key: "try:lapsed",
            count: 4,
            windowStart: new Date(Date.now() - 61 * 60_000),
          },
          { key: "try:current", count: 4, windowStart: new Date() },
        ],
      });
      const expired = new Date(Date.now() - 1_000);
      const live = new Date(Date.now() + 60_000);
      await db.session.createMany({
        data: [
          {
            id: "expired",
            token: "expired",
            userId: "ada",
            expiresAt: expired,
          },
          { id: "live", token: "live", userId: "ada", expiresAt: live },
        ],
      });
      await db.verification.createMany({
        data: [
          { id: "expired", identifier: "a", value: "a", expiresAt: expired },
          { id: "live", identifier: "b", value: "b", expiresAt: live },
        ],
      });
      const request = () =>
        new Request("http://localhost/api/maintenance", {
          headers: { authorization: "Bearer a-test-secret" },
        });
      expect((await GET(request())).status).toBe(200);
      expect(
        (await db.maintenance.findUniqueOrThrow({ where: { id: "scheduled" } }))
          .succeededAt,
      ).not.toBeNull();
      expect(await db.publication.count()).toBe(1);
      expect(await db.rateLimit.count()).toBe(1);
      expect(
        (await db.signInBudget.findMany()).map((budget) => budget.key),
      ).toEqual(["try:current"]);
      expect((await db.session.findMany()).map(({ id }) => id)).toEqual([
        "live",
      ]);
      expect((await db.verification.findMany()).map(({ id }) => id)).toEqual([
        "live",
      ]);
      vi.spyOn(db.publication, "deleteMany").mockRejectedValueOnce(
        new Error("Database unavailable"),
      );
      vi.stubEnv("OPS_ALERT_WEBHOOK_URL", "https://hooks.example.test/ops");
      const alert = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(null, { status: 200 }));
      expect((await GET(request())).status).toBe(503);
      expect(
        (await db.maintenance.findUniqueOrThrow({ where: { id: "scheduled" } }))
          .failedAt,
      ).not.toBeNull();
      expect(alert).toHaveBeenCalledOnce();
      expect(String(alert.mock.calls[0]![1]?.body)).toContain(
        "maintenance failed",
      );
      alert.mockRestore();
    });

    it("reports maintenance health publicly, without details", async () => {
      const { GET } = await import("@/app/api/health/route");
      expect((await GET()).status).toBe(503);
      await db.maintenance.create({
        data: {
          id: "scheduled",
          startedAt: new Date(),
          succeededAt: new Date(),
        },
      });
      const healthy = await GET();
      expect(healthy.status).toBe(200);
      expect(await healthy.json()).toEqual({ maintenance: "ok" });
      await db.maintenance.update({
        where: { id: "scheduled" },
        data: { succeededAt: new Date(Date.now() - 27 * 60 * 60_000) },
      });
      expect((await GET()).status).toBe(503);
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
      const transaction = db.$transaction.bind(db);
      vi.spyOn(db, "$transaction")
        .mockImplementationOnce(async (operation) => transaction(operation))
        .mockRejectedValueOnce(new Error("Database unavailable"));
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
      vi.spyOn(db, "$transaction")
        .mockImplementationOnce(async (operation) => transaction(operation))
        .mockImplementationOnce(async (operation) => {
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

    it("discards profile-bearing provider tokens on both account creation and returning sign-in updates", async () => {
      const context = await realAuth.$context;
      const token = `synthetic.${Buffer.from(JSON.stringify({ name: "Private name", picture: "https://example.org/photo.jpg" })).toString("base64url")}.signature`;
      const account = await context.internalAdapter.createAccount({
        userId: "ada",
        providerId: "google",
        accountId: "synthetic-provider-subject",
        accessToken: "access",
        refreshToken: "refresh",
        idToken: token,
      });
      expect(account).toBeDefined();
      expect(account).toMatchObject({
        accessToken: null,
        refreshToken: null,
        idToken: null,
      });
      await context.internalAdapter.updateAccount(account!.id, {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        idToken: token,
        accessTokenExpiresAt: new Date(),
      });
      const stored = await db.account.findUniqueOrThrow({
        where: { id: account!.id },
      });
      expect(stored).toMatchObject({
        userId: "ada",
        providerId: "google",
        accountId: "synthetic-provider-subject",
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
      });
    });

    it("verifies a university email without storing a name or photo", async () => {
      const email = "new-student@stanford.edu";
      const otp = await codeFor(email);
      expect(otp).toMatch(/^\d{8}$/);
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

    it("fails closed and says so when a code can't be delivered", async () => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      let undelivered = "";
      vi.mocked(sendSignInCode).mockImplementation(async (_email, otp) => {
        undelivered = otp;
        throw new Error("Email provider unavailable");
      });
      const email = "new-student@stanford.edu";
      const response = await request("/email-otp/send-verification-otp", {
        email,
        type: "sign-in",
      });
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        code: "EMAIL_DELIVERY_FAILED",
      });
      // The undelivered code was erased, so it can't be guessed or redeemed.
      expect(await db.verification.count()).toBe(0);
      expect(
        (await request("/sign-in/email-otp", { email, otp: undelivered }))
          .status,
      ).toBe(400);
      expect(await db.user.count({ where: { email } })).toBe(0);
      expect(log).toHaveBeenCalledWith("Failed to send sign-in code");
      log.mockRestore();

      // No cooldown is left behind: the student can simply try again.
      vi.mocked(sendSignInCode).mockResolvedValue(undefined);
      expect(
        (
          await request("/email-otp/send-verification-otp", {
            email,
            type: "sign-in",
          })
        ).status,
      ).toBe(200);
    });

    // A different code of the same length, whatever the real one is.
    const wrong = (code: string) =>
      (code.startsWith("0") ? "1" : "0").repeat(code.length);

    it("caps codes per address, even across lockouts and cooldowns", async () => {
      const email = "target@stanford.edu";
      for (let sent = 0; sent < 5; sent++) {
        await codeFor(email);
        // Let the 30-second resend cooldown pass.
        await db.verification.updateMany({
          data: { updatedAt: new Date(Date.now() - 31_000) },
        });
      }
      const response = await request("/email-otp/send-verification-otp", {
        email,
        type: "sign-in",
      });
      expect(response.status).toBe(429);
      expect(await response.json()).toMatchObject({ code: "SIGN_IN_LIMIT" });
      expect(sendSignInCode).toHaveBeenCalledTimes(5);
      // Other addresses at the campus are unaffected.
      await codeFor("someone-else@stanford.edu");
    });

    it("caps sign-in tries per address across fresh codes", async () => {
      const email = "ada@stanford.edu";
      let otp = await codeFor(email);
      for (let tries = 0; tries < 5; tries++)
        expect(
          (await request("/sign-in/email-otp", { email, otp: wrong(otp) }))
            .status,
        ).toBe(400);
      // Locked out; this used to clear the cooldown and allow five more guesses.
      expect((await request("/sign-in/email-otp", { email, otp })).status).toBe(
        403,
      );
      otp = await codeFor(email);
      for (let tries = 0; tries < 4; tries++)
        expect(
          (await request("/sign-in/email-otp", { email, otp: wrong(otp) }))
            .status,
        ).toBe(400);
      // The eleventh try in an hour is refused, even with the right code.
      const response = await request("/sign-in/email-otp", { email, otp });
      expect(response.status).toBe(429);
      expect(await response.json()).toMatchObject({ code: "SIGN_IN_LIMIT" });
      expect(await db.session.count()).toBe(0);
    });

    it("caps sign-in tries per campus, so random addresses can't be guessed into", async () => {
      const email = "new-student@stanford.edu";
      await db.signInBudget.create({
        data: {
          key: "try-campus:stanford.edu",
          count: 300,
          windowStart: new Date(),
        },
      });
      const otp = await codeFor(email);
      expect((await request("/sign-in/email-otp", { email, otp })).status).toBe(
        429,
      );
      expect(await db.user.count({ where: { email } })).toBe(0);

      // Other campuses are unaffected, and the budget renews after an hour.
      const mit = await codeFor("new-student@mit.edu");
      expect(
        (
          await request("/sign-in/email-otp", {
            email: "new-student@mit.edu",
            otp: mit,
          })
        ).status,
      ).toBe(200);
      await db.signInBudget.update({
        where: { key: "try-campus:stanford.edu" },
        data: { windowStart: new Date(Date.now() - 61 * 60_000) },
      });
      expect((await request("/sign-in/email-otp", { email, otp })).status).toBe(
        200,
      );
    });

    it("keeps a suspension when the suspended account erases itself", async () => {
      await db.user.update({
        where: { id: "ada" },
        data: { bannedAt: new Date() },
      });
      as("ada");
      expect((await actions.deleteAccount("delete my account")).ok).toBe(true);
      as(null);
      const blocks = await db.suspendedEmail.findMany();
      expect(blocks).toHaveLength(1);
      expect(blocks[0]!.hash).toMatch(/^[0-9a-f]{64}$/);

      const email = "ada@stanford.edu";
      const rejoin = await request("/sign-in/email-otp", {
        email,
        otp: await codeFor(email),
      });
      expect(rejoin.status).toBe(403);
      expect(await rejoin.json()).toMatchObject({ code: "ACCOUNT_SUSPENDED" });
      expect(await db.user.count({ where: { email } })).toBe(0);

      // A student who leaves in good standing can come back.
      as("alan");
      expect((await actions.deleteAccount("delete my account")).ok).toBe(true);
      as(null);
      expect(
        (
          await request("/sign-in/email-otp", {
            email: "alan@stanford.edu",
            otp: await codeFor("alan@stanford.edu"),
          })
        ).status,
      ).toBe(200);
      expect(await db.suspendedEmail.count()).toBe(1);

      // The block lapses after its time.
      await db.suspendedEmail.updateMany({
        data: { expiresAt: new Date(Date.now() - 1_000) },
      });
      expect(
        (
          await request("/sign-in/email-otp", {
            email,
            otp: await codeFor(email),
          })
        ).status,
      ).toBe(200);
    });

    it("keeps no network address or device description on sessions", async () => {
      const email = "ada@stanford.edu";
      const otp = await codeFor(email);
      const response = await realAuth.handler(
        new Request("http://localhost:3000/api/auth/sign-in/email-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:3000",
            "x-forwarded-for": "198.51.100.23",
            "user-agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
          },
          body: JSON.stringify({ email, otp }),
        }),
      );
      expect(response.status).toBe(200);
      expect(
        await db.session.findFirstOrThrow({
          select: { ipAddress: true, userAgent: true },
        }),
      ).toEqual({ ipAddress: null, userAgent: null });
    });

    it("keeps no email address in sign-in budgets", async () => {
      await codeFor("ada@stanford.edu");
      const keys = (await db.signInBudget.findMany()).map(({ key }) => key);
      expect(keys).toHaveLength(2);
      expect(keys.join(" ")).not.toContain("ada");
    });

    it("allows verified suspended students a restricted session for appeals", async () => {
      await db.user.update({
        where: { id: "ada" },
        data: { bannedAt: new Date() },
      });
      const email = "ada@stanford.edu";
      const otp = await codeFor(email);
      const response = await request("/sign-in/email-otp", { email, otp });
      expect(response.status).toBe(200);
      expect(await db.session.count()).toBe(1);
      as("ada");
      expect(await getViewer()).toBeNull();
      expect((await actions.setLike("anything", true)).ok).toBe(false);
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
      for (let attempt = 0; attempt < 5; attempt++)
        expect(
          (await request("/sign-in/email-otp", { email, otp: wrong(otp) }))
            .status,
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

    // Configuration is read when lib/auth loads, so these build a fresh instance.
    const freshAuth = async () => {
      vi.resetModules();
      return vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
    };

    it("closes email-code sign-in when production has no email provider", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("RESEND_API_KEY", "");
      vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
      const { auth: production, isEmailEnabled } = await freshAuth();
      expect(isEmailEnabled).toBe(false);
      for (const path of [
        "/email-otp/send-verification-otp",
        "/sign-in/email-otp",
      ]) {
        const response = await production.handler(
          new Request(`http://localhost:3000/api/auth${path}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: "http://localhost:3000",
            },
            body: JSON.stringify({
              email: "ada@stanford.edu",
              type: "sign-in",
              otp: "000000",
            }),
          }),
        );
        expect(response.status).toBe(404);
      }
      // No code was stored that someone could guess.
      expect(await db.verification.count()).toBe(0);
      expect(await db.session.count()).toBe(0);
    });

    it("trusts only a preview deployment's own aliases", async () => {
      vi.stubEnv("BETTER_AUTH_URL", "");
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.stubEnv("VERCEL_URL", "canteen-abc123-team.vercel.app");
      vi.stubEnv("VERCEL_BRANCH_URL", "canteen-git-fix-team.vercel.app");
      const { auth: preview } = await freshAuth();
      expect(preview.options.baseURL).toEqual({
        allowedHosts: [
          "canteen-abc123-team.vercel.app",
          "canteen-git-fix-team.vercel.app",
        ],
        protocol: "https",
      });
    });
  });

  describe("account access", () => {
    beforeEach(async () => {
      vi.stubEnv("TEAM_EMAILS", "staff@example.org");
      await db.university.create({ data: { ...TEAM, id: "u-team" } });
      await db.user.create({
        data: {
          id: "staff",
          email: "staff@example.org",
          universityId: "u-team",
          emailVerified: true,
        },
      });
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("ends staff access when TEAM_EMAILS drops the address mid-session", async () => {
      const { getAccountViewer, requireViewer } = await import("@/lib/session");
      as("staff");
      expect(await getViewer()).toMatchObject({ id: "staff" });

      vi.stubEnv("TEAM_EMAILS", "");
      expect(await getAccountViewer()).toBeNull();
      expect(await getViewer()).toBeNull();
      // Signed-out, not bounced between /join and the app.
      await expect(requireViewer()).rejects.toMatchObject({
        url: "/join?next=%2Fcampus",
      });
      const form = new FormData();
      for (const [key, value] of Object.entries({
        title: "Official notice",
        body: "Posted after leaving the team",
        topic: "GENERAL",
        audience: "EVERYONE",
      }))
        form.set(key, value);
      expect(await actions.createPost(null, form)).toEqual({
        error: "Your session ended. Sign in again to continue.",
      });
      expect(await db.post.count()).toBe(0);
    });

    it("limits suspended students to their account pages", async () => {
      const { getAccountViewer, requireViewer } = await import("@/lib/session");
      await db.user.update({
        where: { id: "ada" },
        data: { bannedAt: new Date() },
      });
      as("ada");
      expect(await getAccountViewer()).toMatchObject({ id: "ada" });
      expect(await getViewer()).toBeNull();
      await expect(requireViewer()).rejects.toMatchObject({
        url: "/account-status",
      });
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

    it("serializes threshold reports with KEEP for posts and comments", async () => {
      for (const target of ["post", "comment"] as const) {
        const p = await post("ada");
        const id =
          target === "post"
            ? p.id
            : (
                await db.comment.create({
                  data: {
                    postId: p.id,
                    authorId: "ada",
                    body: "A reported reply",
                  },
                })
              ).id;
        await report("grace", target, id);
        await report("linus", target, id);
        const reporter = await viewer("margaret"),
          moderator = await viewer("mod");
        vi.mocked(getViewer)
          .mockResolvedValueOnce(reporter)
          .mockResolvedValueOnce(moderator);
        const results = await Promise.all([
          actions.reportContent({ target, id, reason: "SPAM" }),
          actions.moderate({ target, id, decision: "keep" }),
        ]);
        expect(results.every((result) => result.ok)).toBe(true);
        const item =
          target === "post"
            ? await db.post.findUniqueOrThrow({ where: { id } })
            : await db.comment.findUniqueOrThrow({ where: { id } });
        const open = await db.report.count({
          where: {
            resolvedAt: null,
            ...(target === "post" ? { postId: id } : { commentId: id }),
          },
        });
        expect(item.hiddenAt === null || open > 0).toBe(true);
      }
    });

    it("restricts campus hosts to explicit assignments, labels their posts and revokes reply alerts", async () => {
      vi.stubEnv(
        "CAMPUS_HOSTS",
        JSON.stringify({ "mod@example.com": ["stanford.edu"] }),
      );
      const base = await viewer("mod");
      const host = {
        ...base,
        hostCampuses: [
          {
            id: "u-stanford",
            slug: "stanford-university",
            name: "Stanford University",
          },
        ],
      };
      const campus = await post("ada", { audience: "CAMPUS" });
      const other = await post("grace", { audience: "CAMPUS" });
      expect(await queries.getThread(host, campus.id)).not.toBeNull();
      expect(await queries.getThread(base, campus.id)).toBeNull();
      expect(await queries.getThread(host, other.id)).toBeNull();
      vi.mocked(getViewer).mockResolvedValueOnce(host);
      const form = new FormData();
      for (const [key, value] of Object.entries({
        title: "A message from the host",
        body: "Ask during our coverage hours",
        topic: "GENERAL",
        audience: "CAMPUS",
        hostCampus: "stanford-university",
      }))
        form.set(key, value);
      const created = await actions.createPost(null, form);
      const thread = (await queries.getThread(
        await viewer("ada"),
        created!.postedId!,
      ))!;
      expect(thread.staff).toBe(true);
      expect(thread.university.name).toBe("Stanford University");
      as("ada");
      await actions.addComment(thread.id, "A question for the host");
      expect(await db.notification.count({ where: { userId: "mod" } })).toBe(1);
      vi.stubEnv("CAMPUS_HOSTS", "{}");
      await actions.addComment(thread.id, "A later reply");
      expect(
        (await db.notification.findFirstOrThrow({ where: { userId: "mod" } }))
          .revision,
      ).toBe(0);
      expect(
        await queries.getThread(await viewer("mod"), campus.id),
      ).toBeNull();
      as("mod");
      expect(await actions.createPost(null, form)).toHaveProperty("error");
    });

    it("revokes a former host's access even to campus threads they authored", async () => {
      vi.stubEnv(
        "CAMPUS_HOSTS",
        JSON.stringify({ "mod@example.com": ["stanford.edu"] }),
      );
      as("mod");
      const host = (await getViewer())!;
      const form = new FormData();
      for (const [key, value] of Object.entries({
        title: "A question from the host",
        body: "Ask during our coverage hours",
        topic: "GENERAL",
        kind: "QUESTION",
        audience: "CAMPUS",
        hostCampus: "stanford-university",
      }))
        form.set(key, value);
      const created = await actions.createPost(null, form);
      const id = created!.postedId!;
      await db.post.update({
        where: { id },
        data: {
          imageUrl: "https://test.private.blob.vercel-storage.com/host.webp",
          emailOnReply: true,
        },
      });
      const reply = await db.comment.create({
        data: { postId: id, authorId: "ada", body: "Private campus context" },
      });
      expect((await queries.getThread(host, id))?.comments).toHaveLength(1);
      expect(
        (await queries.getFeed(host, { scope: { kind: "mine" } })).items,
      ).toHaveLength(1);

      const reported = await post("ada", { audience: "CAMPUS" });
      await report("alan", "post", reported.id);
      expect((await queries.getModQueue(host))[0]?.threadId).toBe(reported.id);

      vi.stubEnv("CAMPUS_HOSTS", "{}");
      as("mod");
      const revoked = (await getViewer())!;
      expect(await queries.getThread(revoked, id)).toBeNull();
      expect(await queries.getComments(revoked, id)).toBeNull();
      expect(
        (await queries.getFeed(revoked, { scope: { kind: "mine" } })).items,
      ).toHaveLength(0);
      expect((await actions.markHelpful(id, reply.id)).ok).toBe(false);
      expect((await queries.getModQueue(revoked))[0]?.threadId).toBeNull();
      const params = { params: Promise.resolve({ id }) };
      const { GET: updates } =
        await import("@/app/api/threads/[id]/updates/route");
      const { GET: image } = await import("@/app/api/images/[id]/route");
      expect(
        (await updates(new Request("http://localhost"), params)).status,
      ).toBe(404);
      expect(
        (await image(new Request("http://localhost"), params)).status,
      ).toBe(404);

      vi.mocked(sendReplyNotice).mockClear();
      as("ada");
      expect((await actions.addComment(id, "A later private reply")).ok).toBe(
        true,
      );
      await finishBackground();
      expect(sendReplyNotice).not.toHaveBeenCalled();
      expect(
        (await db.post.findUniqueOrThrow({ where: { id } })).replyEmailedAt,
      ).toBeNull();

      const own = await post("ada", { audience: "CAMPUS" });
      await db.post.update({
        where: { id: own.id },
        data: { hiddenAt: new Date() },
      });
      expect(
        await queries.getThread(await viewer("ada"), own.id),
      ).not.toBeNull();
      expect(await queries.getThread(await viewer("grace"), own.id)).toBeNull();
      as("mod");
      expect((await actions.deletePost(id)).ok).toBe(true);
      expect(await db.post.findUnique({ where: { id } })).toBeNull();
    });

    it("counts waiting host questions when a previously helpful answer is hidden", async () => {
      const { getWaitingSummary } = await import("@/server/operations");
      const base = await viewer("mod");
      const host = {
        ...base,
        hostCampuses: [
          {
            id: "u-stanford",
            slug: "stanford-university",
            name: "Stanford University",
          },
        ],
      };
      const posts = [];
      for (let index = 0; index < 5; index++)
        posts.push(await post("ada", { audience: "CAMPUS", kind: "QUESTION" }));
      const oldest = new Date(Date.now() - 10 * 24 * 60 * 60_000);
      await db.post.update({
        where: { id: posts[0]!.id },
        data: { createdAt: oldest },
      });
      const answer = await db.comment.create({
        data: {
          postId: posts[0]!.id,
          authorId: "alan",
          body: "A previous answer",
          hiddenAt: new Date(),
        },
      });
      await db.helpfulAnswer.create({
        data: { postId: posts[0]!.id, commentId: answer.id },
      });
      expect(await getWaitingSummary(host, "u-stanford")).toEqual({
        count: 5,
        oldest,
      });
      expect(await getWaitingSummary(base, "u-stanford")).toBeNull();
      expect(
        await getWaitingSummary(await viewer("ada"), "u-stanford"),
      ).toBeNull();
      await db.comment.update({
        where: { id: answer.id },
        data: { hiddenAt: null },
      });
      expect(await getWaitingSummary(host, "u-stanford")).toBeNull();
    });

    it("keeps domain corrections private, bounded and subject to actual dataset verification", async () => {
      const { requestUniversity, reviewUniversityRequest } =
        await import("@/server/university-requests");
      const form = new FormData();
      form.set("domain", "missing-campus.example");
      form.set("website", "https://missing-campus.example");
      as(null);
      expect(await requestUniversity(null, form)).toEqual({ ok: true });
      expect(await requestUniversity(null, form)).toEqual({ ok: true });
      const request = await db.universityRequest.findFirstOrThrow();
      expect(await db.universityRequest.count()).toBe(1);
      expect((await reviewUniversityRequest(request.id, false)).ok).toBe(false);
      as("mod");
      expect((await reviewUniversityRequest(request.id, true)).ok).toBe(false);
      expect((await reviewUniversityRequest(request.id, false)).ok).toBe(true);

      // The shared daily budget survives Better Auth pruning its RateLimit rows.
      await db.universityRequest.createMany({
        data: Array.from({ length: 99 }, (_, i) => ({
          domain: `queued-${i}.example`,
          website: `https://queued-${i}.example`,
        })),
      });
      form.set("domain", "one-more-campus.example");
      form.set("website", "https://one-more-campus.example");
      expect(await requestUniversity(null, form)).toHaveProperty("error");
      await db.rateLimit.deleteMany();
      expect(await requestUniversity(null, form)).toHaveProperty("error");
      await db.universityRequest.updateMany({
        data: { createdAt: new Date(Date.now() - 25 * 60 * 60_000) },
      });
      expect(await requestUniversity(null, form)).toEqual({ ok: true });
    });

    it("pages the team about urgent reports, hidden content and appeals, without content", async () => {
      vi.stubEnv("OPS_ALERT_WEBHOOK_URL", "https://hooks.example.test/ops");
      const sent: string[] = [];
      const webhook = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async (_url, init) => {
          sent.push(String(init?.body));
          return new Response(null, { status: 200 });
        });
      try {
        const p = await post("ada", { title: "A very private title" });
        as("grace");
        await actions.reportContent({
          target: "post",
          id: p.id,
          reason: "SELF_HARM",
        });
        as("linus");
        await actions.reportContent({
          target: "post",
          id: p.id,
          reason: "SELF_HARM",
        });
        await finishBackground();
        // One page per item, however many students flag it.
        expect(sent).toHaveLength(1);
        expect(sent[0]).toContain("may be at risk");
        expect(JSON.parse(sent[0]!).text).toMatch(/\/mod$/);

        as("margaret");
        await actions.reportContent({
          target: "post",
          id: p.id,
          reason: "SPAM",
        });
        await finishBackground();
        expect(sent).toHaveLength(2);
        expect(sent[1]).toContain("hid a post or reply");

        as("mod");
        await actions.moderate({
          target: "post",
          id: p.id,
          decision: "remove",
        });
        const decision = await db.moderationCase.findFirstOrThrow();
        as("ada");
        await actions.submitAppeal(
          decision.id,
          "Please look at this decision again.",
        );
        await finishBackground();
        expect(sent).toHaveLength(3);
        expect(sent[2]).toContain("appeal is waiting");

        for (const body of sent) {
          expect(body).not.toContain("private title");
          expect(body).not.toContain(p.id);
          expect(body).not.toContain("stanford");
          expect(body).not.toMatch(/grace|linus|margaret/);
        }
      } finally {
        webhook.mockRestore();
      }
    });

    it("sends no alert without a configured webhook", async () => {
      const webhook = vi.spyOn(globalThis, "fetch");
      const p = await post("ada");
      as("grace");
      await actions.reportContent({
        target: "post",
        id: p.id,
        reason: "SELF_HARM",
      });
      await finishBackground();
      expect(webhook).not.toHaveBeenCalled();
      webhook.mockRestore();
    });

    it("lists reports about someone at risk before everything else", async () => {
      const urgent = await post("ada");
      const loud = await post("alan");
      await report("grace", "post", loud.id);
      await report("linus", "post", loud.id);
      as("margaret");
      await actions.reportContent({
        target: "post",
        id: urgent.id,
        reason: "SELF_HARM",
      });
      const queue = await queries.getModQueue(await viewer("mod"));
      expect(queue.map((item) => item.id)).toEqual([urgent.id, loud.id]);
      expect(queue[0]).toMatchObject({ urgent: true });
      expect(queue[1]).toMatchObject({ urgent: false });
    });

    it("includes at-risk posts and replies before limiting a full moderation queue", async () => {
      const thread = await post("ada");
      const postIds = Array.from(
        { length: 100 },
        (_, i) => `backlog-post-${i}`,
      );
      const commentIds = Array.from(
        { length: 100 },
        (_, i) => `backlog-comment-${i}`,
      );
      await db.post.createMany({
        data: [...postIds, "urgent-post"].map((id) => ({
          id,
          title: "Waiting for review",
          body: "Reported post",
          authorId: "ada",
          universityId: "u-stanford",
        })),
      });
      await db.comment.createMany({
        data: [...commentIds, "urgent-comment"].map((id) => ({
          id,
          body: "Reported reply",
          authorId: "ada",
          postId: thread.id,
        })),
      });
      await db.report.createMany({
        data: [
          ...postIds.map((postId) => ({
            postId,
            reporterId: "grace",
            reason: "HARASSMENT" as const,
          })),
          ...commentIds.map((commentId) => ({
            commentId,
            reporterId: "grace",
            reason: "HARASSMENT" as const,
          })),
          {
            postId: "urgent-post",
            reporterId: "grace",
            reason: "SELF_HARM",
          },
          {
            commentId: "urgent-comment",
            reporterId: "grace",
            reason: "SELF_HARM",
          },
        ],
      });

      const queue = await queries.getModQueue(await viewer("mod"));
      expect(queue).toHaveLength(200);
      expect(queue.slice(0, 2)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "urgent-post", urgent: true }),
          expect.objectContaining({ id: "urgent-comment", urgent: true }),
        ]),
      );
    });

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
      expect(await db.post.count({ where: { hiddenAt: null } })).toBe(0);
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
        (await db.post.findUniqueOrThrow({ where: { id: reported.id } }))
          .removedAt,
      ).not.toBeNull();
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

    it("supports private appeals and restores only the appealed suspension", async () => {
      const target = await post("ada");
      const independent = await post("ada");
      const other = await post("ada");
      await db.post.update({
        where: { id: independent.id },
        data: { hiddenAt: new Date("2020-01-01") },
      });
      as("mod");
      expect(
        (
          await actions.moderate({
            target: "post",
            id: target.id,
            decision: "ban",
            reason: "HARASSMENT",
          })
        ).ok,
      ).toBe(true);
      const decision = await db.moderationCase.findFirstOrThrow();
      as("alan");
      expect(
        (
          await actions.submitAppeal(
            decision.id,
            "This was taken out of context.",
          )
        ).ok,
      ).toBe(false);
      expect(
        await queries.getModerationHistory(await viewer("alan")),
      ).toHaveLength(0);
      expect(await queries.getAppeals(await viewer("alan"))).toHaveLength(0);
      as("ada");
      const realSession =
        await vi.importActual<typeof import("@/lib/session")>("@/lib/session");
      expect(await realSession.getViewer()).toBeNull();
      expect((await realSession.getAccountViewer())?.bannedAt).not.toBeNull();
      expect(
        (
          await actions.submitAppeal(
            decision.id,
            "This was taken out of context.",
          )
        ).ok,
      ).toBe(true);
      expect(
        (await actions.submitAppeal(decision.id, "This is a duplicate appeal."))
          .ok,
      ).toBe(false);
      expect((await actions.addComment(other.id, "Still suspended")).ok).toBe(
        false,
      );
      as("mod");
      const queue = await queries.getAppeals(await viewer("mod"));
      expect(queue).toHaveLength(1);
      for (const secret of ["ada@", '"authorId"', '"reporterId"', '"userId"'])
        expect(JSON.stringify(queue)).not.toContain(secret);
      expect(
        (
          await actions.reviewAppeal(
            decision.id,
            true,
            "The context supports restoring this content.",
          )
        ).ok,
      ).toBe(true);
      expect(await hiddenAt(target.id)).toBeNull();
      expect(await hiddenAt(other.id)).toBeNull();
      expect(await hiddenAt(independent.id)).not.toBeNull();
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: "ada" } })).bannedAt,
      ).toBeNull();
      expect(
        (
          await actions.reviewAppeal(
            decision.id,
            true,
            "Cannot review it twice.",
          )
        ).ok,
      ).toBe(false);
      as("ada");
      expect(await realSession.getViewer()).not.toBeNull();
    });

    it("keeps a suspension appealable when a thread owner deletes its reported reply", async () => {
      const thread = await post("alan");
      const comment = await db.comment.create({
        data: { postId: thread.id, authorId: "ada", body: "Reported reply" },
      });
      as("mod");
      await actions.moderate({
        target: "comment",
        id: comment.id,
        decision: "ban",
      });
      const decision = await db.moderationCase.findFirstOrThrow();
      as("alan");
      await actions.deletePost(thread.id);
      expect(
        (
          await db.moderationCase.findUniqueOrThrow({
            where: { id: decision.id },
          })
        ).commentId,
      ).toBeNull();
      as("ada");
      expect(
        (
          await actions.submitAppeal(
            decision.id,
            "Please reconsider my suspension.",
          )
        ).ok,
      ).toBe(true);
      as("mod");
      expect(
        (
          await actions.reviewAppeal(
            decision.id,
            true,
            "The suspension is overturned after review.",
          )
        ).ok,
      ).toBe(true);
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: "ada" } })).bannedAt,
      ).toBeNull();
    });

    it("reports useful help and return rates only as protected aggregates", async () => {
      const { getLaunchMetrics, recordActivity } =
        await import("@/server/metrics");
      expect(await getLaunchMetrics(await viewer("ada"))).toBeNull();
      expect(await getLaunchMetrics(await viewer("mod"))).toEqual([]);
      const today = new Date(new Date().toISOString().slice(0, 10));
      const day = (offset: number) =>
        new Date(today.getTime() - offset * 86400000);
      const ids = Array.from({ length: 5 }, (_, i) => `cohort-${i}`);
      await db.user.createMany({
        data: ids.map((id) => ({
          id,
          email: `${id}@stanford.edu`,
          emailVerified: true,
          universityId: "u-stanford",
          createdAt: day(20),
        })),
      });
      await db.dailyActivity.create({ data: { userId: "alan", day: day(30) } });
      for (const id of ids.slice(0, 3))
        await db.dailyActivity.create({ data: { userId: id, day: day(10) } });
      await recordActivity(await viewer(ids[0]!));
      await recordActivity(await viewer(ids[0]!));
      expect(
        await db.dailyActivity.count({ where: { userId: ids[0], day: today } }),
      ).toBe(1);
      expect((await getLaunchMetrics(await viewer("mod")))![0]).toMatchObject({
        name: "Stanford University",
        members: 7,
        active: null,
        helped: null,
        returnRate: null,
      });
      for (const id of ids.slice(1)) await recordActivity(await viewer(id));
      for (const id of ids.slice(3))
        await db.dailyActivity.create({ data: { userId: id, day: day(10) } });
      for (const id of ids) {
        const question = await post(id, { kind: "QUESTION" });
        const answer = await db.comment.create({
          data: {
            postId: question.id,
            authorId: "alan",
            body: "A useful answer",
          },
        });
        await db.helpfulAnswer.create({
          data: { postId: question.id, commentId: answer.id },
        });
      }
      const metrics = (await getLaunchMetrics(await viewer("mod")))!;
      expect(metrics[0]).toMatchObject({
        active: 5,
        helped: 5,
        returnRate: 100,
      });
      for (const secret of [
        ...ids,
        "ada@",
        '"userId"',
        '"authorId"',
        '"email"',
      ])
        expect(JSON.stringify(metrics)).not.toContain(secret);
      await db.user.delete({ where: { id: ids[0] } });
      expect(await db.dailyActivity.count({ where: { userId: ids[0] } })).toBe(
        0,
      );
      expect((await getLaunchMetrics(await viewer("mod")))![0]).toMatchObject({
        active: null,
        helped: null,
        returnRate: null,
      });
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
      expect(await db.post.count({ where: { hiddenAt: null } })).toBe(0);
      expect(await db.moderationCase.count()).toBe(1);
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
      expect(await db.comment.count({ where: { hiddenAt: null } })).toBe(0);
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
      expect(await actions.createPost(null, form)).toMatchObject({
        postedId: expect.any(String),
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

    it("rejects new and changed votes with a viewer captured before suspension", async () => {
      const voted = await pollPost("ada", ["Yes", "No"]);
      const untouched = await pollPost("ada", ["Up", "Down"]);
      as("grace");
      expect(
        (await actions.votePoll(voted.id, voted.pollOptions[0]!.id)).ok,
      ).toBe(true);
      const beforeBan = await viewer("grace");
      await db.user.update({
        where: { id: "grace" },
        data: { bannedAt: new Date() },
      });

      vi.mocked(getViewer).mockResolvedValueOnce(beforeBan);
      expect(
        (await actions.votePoll(voted.id, voted.pollOptions[1]!.id)).ok,
      ).toBe(false);
      vi.mocked(getViewer).mockResolvedValueOnce(beforeBan);
      expect(
        (await actions.votePoll(untouched.id, untouched.pollOptions[0]!.id)).ok,
      ).toBe(false);

      expect(await db.pollVote.findMany()).toMatchObject([
        { postId: voted.id, optionId: voted.pollOptions[0]!.id },
      ]);
      expect(
        (await db.post.findUniqueOrThrow({ where: { id: voted.id } })).revision,
      ).toBe(1);
      expect(
        (await db.post.findUniqueOrThrow({ where: { id: untouched.id } }))
          .revision,
      ).toBe(0);
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
