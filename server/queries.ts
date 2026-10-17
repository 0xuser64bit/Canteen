import "server-only";
import { cache } from "react";
import { inCountry } from "@/lib/countries";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type {
  Audience,
  PostKind,
  NotificationType,
  ReportReason,
  Topic,
} from "@/lib/generated/prisma/enums";
import { pseudonym, type Pseudonym } from "@/lib/pseudonym";
import type { Viewer } from "@/lib/session";
import { isTeamEmail, TEAM } from "@/lib/universities";

export const PAGE_SIZE = 20;

/**
 * Below this many members, naming a university on someone's post narrows the
 * author down to a handful of people, so others see only the country.
 */
export const MIN_MEMBERS_TO_NAME_UNIVERSITY = 5;

const EXCERPT_LENGTH = 420;

// ---------------------------------------------------------------------------
// Shared rules
// ---------------------------------------------------------------------------

/** The one visibility rule every read and write path goes through. */
export function visibleTo(viewer: Viewer): Prisma.PostWhereInput {
  return {
    hiddenAt: null,
    OR: [
      { audience: "EVERYONE" },
      { universityId: viewer.university.id },
      ...(viewer.hostCampuses?.length
        ? [
            {
              universityId: {
                in: viewer.hostCampuses.map((campus) => campus.id),
              },
            },
          ]
        : []),
    ],
  };
}

/** Closed opportunities remain readable, but leave discovery automatically. */
export function discoverableTo(viewer: Viewer): Prisma.PostWhereInput {
  return {
    AND: [
      visibleTo(viewer),
      { OR: [{ deadline: null }, { deadline: { gt: new Date() } }] },
    ],
  };
}

const universitySelect = {
  id: true,
  slug: true,
  name: true,
  countryCode: true,
  _count: { select: { users: true } },
} satisfies Prisma.UniversitySelect;

type UniversityRow = Prisma.UniversityGetPayload<{
  select: typeof universitySelect;
}>;

/** `slug` is null when the label must not link to a university page. */
export type PublicUniversity = { name: string; slug: string | null };

function publicUniversity(
  university: UniversityRow,
  viewer: Viewer,
): PublicUniversity {
  // Staff are always labeled, whatever the team's size.
  if (university.slug === TEAM.slug) return { name: TEAM.name, slug: null };
  const nameable =
    university.id === viewer.university.id ||
    viewer.hostCampuses?.some((campus) => campus.id === university.id) ||
    university._count.users >= MIN_MEMBERS_TO_NAME_UNIVERSITY;
  return nameable
    ? { name: university.name, slug: university.slug }
    : {
        name: `A university in ${inCountry(university.countryCode)}`,
        slug: null,
      };
}

// Keyset pagination: "<iso date>_<id>". Stable under inserts and deletes.
function encodeCursor(row: { createdAt: Date; id: string }) {
  return `${row.createdAt.toISOString()}_${row.id}`;
}

function afterCursor(
  cursor: string | undefined,
  inclusive = false,
  ascending = false,
) {
  if (!cursor) return {};
  const [iso, id] = cursor.split("_");
  const createdAt = new Date(iso ?? "");
  if (!id || Number.isNaN(createdAt.getTime())) return {};
  return {
    OR: [
      { createdAt: ascending ? { gt: createdAt } : { lt: createdAt } },
      {
        createdAt,
        id: ascending ? { gt: id } : inclusive ? { lte: id } : { lt: id },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

export type Poll = {
  /** `votes` is null until the viewer votes (or if the poll isn't theirs). */
  options: { id: string; label: string; votes: number | null }[];
  total: number;
  /** The option the viewer picked, if any. */
  choice: string | null;
};

function pollSelect(viewerId: string) {
  return {
    authorId: true,
    author: { select: { university: { select: { slug: true } } } },
    pollOptions: {
      orderBy: { position: "asc" },
      select: { id: true, label: true, _count: { select: { votes: true } } },
    },
    pollVotes: { where: { userId: viewerId }, select: { optionId: true } },
  } satisfies Prisma.PostSelect;
}

type PollRow = Prisma.PostGetPayload<{
  select: ReturnType<typeof pollSelect>;
}>;

function toPoll(row: PollRow, viewer: Viewer): Poll | null {
  if (row.pollOptions.length === 0) return null;
  const choice = row.pollVotes[0]?.optionId ?? null;
  // Results stay hidden until you vote, so early votes don't herd later ones.
  const reveal = choice !== null || row.authorId === viewer.id;
  return {
    options: row.pollOptions.map((option) => ({
      id: option.id,
      label: option.label,
      votes: reveal ? option._count.votes : null,
    })),
    total: row.pollOptions.reduce((sum, o) => sum + o._count.votes, 0),
    choice,
  };
}

export async function getPoll(viewer: Viewer, postId: string) {
  const row = await db.post.findFirst({
    where: { id: postId, ...visibleTo(viewer) },
    select: pollSelect(viewer.id),
  });
  return row && toPoll(row, viewer);
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

function postSelect(viewerId: string) {
  return {
    id: true,
    title: true,
    body: true,
    imageUrl: true,
    imageAlt: true,
    imageWidth: true,
    imageHeight: true,
    applicationUrl: true,
    deadline: true,
    kind: true,
    helpfulAnswer: {
      where: { comment: { hiddenAt: null } },
      select: { commentId: true },
    },
    topic: true,
    audience: true,
    createdAt: true,
    hiddenAt: true,
    revision: true,
    bookmarks: { where: { userId: viewerId }, select: { userId: true } },
    follows: { where: { userId: viewerId }, select: { userId: true } },
    ...pollSelect(viewerId),
    university: { select: universitySelect },
    likes: { where: { userId: viewerId }, select: { userId: true } },
    _count: {
      select: {
        likes: true,
        views: true,
        comments: { where: { hiddenAt: null } },
      },
    },
  } satisfies Prisma.PostSelect;
}

type PostRow = Prisma.PostGetPayload<{ select: ReturnType<typeof postSelect> }>;

export type PostSummary = {
  id: string;
  title: string;
  excerpt: string;
  image: { url: string; width: number; height: number; alt: string } | null;
  applicationUrl: string | null;
  deadline: Date | null;
  closed: boolean;
  kind: PostKind;
  helpfulCommentId: string | null;
  topic: Topic;
  audience: Audience;
  createdAt: Date;
  university: PublicUniversity;
  alias: Pseudonym;
  isMine: boolean;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  hidden: boolean;
  revision: number;
  saved: boolean;
  following: boolean;
  staff: boolean;
  poll: Poll | null;
};

function toSummary(row: PostRow, viewer: Viewer): PostSummary {
  return {
    id: row.id,
    title: row.title,
    applicationUrl: row.applicationUrl,
    deadline: row.deadline,
    closed: row.deadline !== null && row.deadline.getTime() <= Date.now(),
    excerpt:
      row.body.length > EXCERPT_LENGTH
        ? `${row.body.slice(0, EXCERPT_LENGTH).trimEnd()}…`
        : row.body,
    image: row.imageUrl
      ? {
          url: `/api/images/${row.id}`,
          alt:
            row.imageAlt ??
            "Image attached to this post; description unavailable.",
          width: row.imageWidth ?? 1200,
          height: row.imageHeight ?? 900,
        }
      : null,
    kind: row.kind,
    helpfulCommentId: row.helpfulAnswer?.commentId ?? null,
    topic: row.topic,
    audience: row.audience,
    createdAt: row.createdAt,
    university: publicUniversity(row.university, viewer),
    alias: pseudonym(row.authorId, row.id),
    isMine: row.authorId === viewer.id,
    liked: row.likes.length > 0,
    likeCount: row._count.likes,
    commentCount: row._count.comments,
    viewCount: row._count.views,
    hidden: row.hiddenAt !== null,
    revision: row.revision,
    saved: row.bookmarks.length > 0,
    following: row.follows.length > 0,
    staff: row.author.university.slug === TEAM.slug,
    poll: toPoll(row, viewer),
  };
}

export type FeedScope =
  | { kind: "everyone" }
  | { kind: "campus" }
  | { kind: "university"; universityId: string }
  | { kind: "mine" }
  | { kind: "saved" }
  | { kind: "following" };

export type FeedPage = { items: PostSummary[]; nextCursor: string | null };
export type FeedSort = "newest" | "oldest" | "closing";

function feedCursor(
  cursor: string | undefined,
  sort: FeedSort,
): Prisma.PostWhereInput {
  if (sort !== "closing") return afterCursor(cursor, false, sort === "oldest");
  if (!cursor) return {};
  const [iso, id] = cursor.split("_");
  const deadline = new Date(iso ?? "");
  if (!id || Number.isNaN(deadline.getTime())) return {};
  return { OR: [{ deadline: { gt: deadline } }, { deadline, id: { gt: id } }] };
}

export async function getFeed(
  viewer: Viewer,
  {
    scope,
    topic,
    cursor,
    unanswered,
    noReplies,
    sort = "newest",
  }: {
    scope: FeedScope;
    topic?: Topic;
    cursor?: string;
    unanswered?: boolean;
    noReplies?: boolean;
    sort?: FeedSort;
  },
): Promise<FeedPage> {
  const scoped: Prisma.PostWhereInput =
    scope.kind === "mine"
      ? { authorId: viewer.id } // authors also see their own hidden posts
      : {
          AND: [
            scope.kind === "saved" || scope.kind === "following"
              ? visibleTo(viewer)
              : discoverableTo(viewer),
            scope.kind === "saved"
              ? { bookmarks: { some: { userId: viewer.id } } }
              : {},
            scope.kind === "following"
              ? { follows: { some: { userId: viewer.id } } }
              : {},
            scope.kind === "campus"
              ? { universityId: viewer.university.id }
              : {},
            scope.kind === "university"
              ? { universityId: scope.universityId }
              : {},
          ],
        };

  const rows = await db.post.findMany({
    where: {
      AND: [
        scoped,
        topic ? { topic } : {},
        unanswered
          ? {
              kind: "QUESTION",
              OR: [
                { helpfulAnswer: null },
                { helpfulAnswer: { comment: { hiddenAt: { not: null } } } },
              ],
            }
          : {},
        noReplies
          ? { kind: "QUESTION", comments: { none: { hiddenAt: null } } }
          : {},
        sort === "closing" ? { deadline: { gt: new Date() } } : {},
        feedCursor(cursor, sort),
      ],
    },
    orderBy:
      sort === "closing"
        ? [{ deadline: "asc" }, { id: "asc" }]
        : [
            { createdAt: sort === "oldest" ? "asc" : "desc" },
            { id: sort === "oldest" ? "asc" : "desc" },
          ],
    take: PAGE_SIZE + 1,
    select: postSelect(viewer.id),
  });

  const page = rows.slice(0, PAGE_SIZE);
  return {
    items: page.map((row) => toSummary(row, viewer)),
    nextCursor:
      rows.length > PAGE_SIZE
        ? encodeCursor(
            sort === "closing"
              ? { createdAt: page.at(-1)!.deadline!, id: page.at(-1)!.id }
              : page.at(-1)!,
          )
        : null,
  };
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

export type ThreadComment = {
  id: string;
  body: string;
  createdAt: Date;
  alias: Pseudonym;
  university: PublicUniversity;
  isMine: boolean;
  isAuthor: boolean;
  hidden: boolean;
};

export type Thread = PostSummary & {
  body: string;
  comments: ThreadComment[];
  earlierCursor: string | null;
  participantCount: number;
  /** How the viewer appears if they reply. */
  viewerAlias: Pseudonym;
  historical: boolean;
  helpfulReply: ThreadComment | null;
};

export type CommentPage = { items: ThreadComment[]; nextCursor: string | null };
const COMMENT_PAGE_SIZE = 50;

export async function getComments(
  viewer: Viewer,
  postId: string,
  cursor?: string,
  inclusive = false,
): Promise<CommentPage | null> {
  const post = await db.post.findFirst({
    where: { id: postId, OR: [{ authorId: viewer.id }, visibleTo(viewer)] },
    select: { authorId: true },
  });
  if (!post) return null;
  const rows = await db.comment.findMany({
    where: {
      AND: [
        { postId, OR: [{ hiddenAt: null }, { authorId: viewer.id }] },
        afterCursor(cursor, inclusive),
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: COMMENT_PAGE_SIZE + 1,
    select: {
      id: true,
      body: true,
      createdAt: true,
      hiddenAt: true,
      authorId: true,
      author: { select: { university: { select: universitySelect } } },
    },
  });
  const page = rows.slice(0, COMMENT_PAGE_SIZE);
  return {
    items: page.toReversed().map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      alias: pseudonym(comment.authorId, postId),
      university: publicUniversity(comment.author.university, viewer),
      isMine: comment.authorId === viewer.id,
      isAuthor: comment.authorId === post.authorId,
      hidden: comment.hiddenAt !== null,
    })),
    nextCursor:
      rows.length > COMMENT_PAGE_SIZE ? encodeCursor(page.at(-1)!) : null,
  };
}

// Cached per request: the page and its metadata both read the thread.
export const getThread = cache(
  async (
    viewer: Viewer,
    postId: string,
    cursor?: string,
    focusId?: string,
  ): Promise<Thread | null> => {
    const post = await db.post.findFirst({
      where: { id: postId, OR: [{ authorId: viewer.id }, visibleTo(viewer)] },
      select: postSelect(viewer.id),
    });
    if (!post) return null;
    const focus = focusId
      ? await db.comment.findFirst({
          where: {
            id: focusId,
            postId,
            OR: [{ hiddenAt: null }, { authorId: viewer.id }],
          },
          select: { id: true, createdAt: true },
        })
      : null;
    const [comments, participants] = await Promise.all([
      getComments(
        viewer,
        postId,
        focus ? encodeCursor(focus) : cursor,
        Boolean(focus),
      ),
      db.$queryRaw<
        { count: bigint }[]
      >`SELECT COUNT(DISTINCT "authorId") AS count FROM (
      SELECT "authorId" FROM "Comment" WHERE "postId" = ${postId} AND ("hiddenAt" IS NULL OR "authorId" = ${viewer.id})
      UNION SELECT ${post.authorId} AS "authorId"
    ) AS participants`,
    ]);
    const helpfulId = post.helpfulAnswer?.commentId;
    const helpful = helpfulId
      ? await db.comment.findFirst({
          where: { id: helpfulId, postId, hiddenAt: null },
          select: {
            id: true,
            body: true,
            createdAt: true,
            authorId: true,
            author: { select: { university: { select: universitySelect } } },
          },
        })
      : null;
    return {
      ...toSummary(post, viewer),
      body: post.body,
      viewerAlias: pseudonym(viewer.id, post.id),
      participantCount: Number(participants[0]?.count ?? 1),
      comments: comments?.items ?? [],
      earlierCursor: comments?.nextCursor ?? null,
      historical: Boolean(cursor || focus),
      helpfulReply: helpful
        ? {
            id: helpful.id,
            body: helpful.body,
            createdAt: helpful.createdAt,
            alias: pseudonym(helpful.authorId, postId),
            university: publicUniversity(helpful.author.university, viewer),
            isMine: helpful.authorId === viewer.id,
            isAuthor: helpful.authorId === post.authorId,
            hidden: false,
          }
        : null,
    };
  },
);

// ---------------------------------------------------------------------------
// Universities, discovery, search
// ---------------------------------------------------------------------------

/** Students who share the viewer's university, the viewer included. */
export function getCampusSize(viewer: Viewer) {
  return db.user.count({ where: { universityId: viewer.university.id } });
}

export async function getUniversityPage(viewer: Viewer, slug: string) {
  const university = await db.university.findUnique({
    where: { slug },
    select: { ...universitySelect, website: true },
  });
  if (!university) return null;
  const isMine =
    university.id === viewer.university.id ||
    Boolean(viewer.hostCampuses?.some((campus) => campus.id === university.id));
  // Small campuses stay unnamed, so their page would only out its members.
  if (!isMine && university._count.users < MIN_MEMBERS_TO_NAME_UNIVERSITY)
    return null;
  return {
    id: university.id,
    slug: university.slug,
    name: university.name,
    countryCode: university.countryCode,
    website: university.website,
    isMine,
    memberCount: university._count.users,
  };
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

export async function getTrending(viewer: Viewer) {
  const rows = await db.post.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - WEEK_MS) },
      AND: [
        discoverableTo(viewer),
        {
          OR: [
            { likes: { some: {} } },
            { comments: { some: { hiddenAt: null } } },
          ],
        },
      ],
    },
    orderBy: [
      { likes: { _count: "desc" } },
      { comments: { _count: "desc" } },
      { createdAt: "desc" },
    ],
    take: 4,
    select: {
      id: true,
      title: true,
      _count: { select: { likes: true, comments: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    likeCount: row._count.likes,
    commentCount: row._count.comments,
  }));
}

export async function getActiveUniversities() {
  const busiest = await db.post.groupBy({
    by: ["universityId"],
    where: {
      hiddenAt: null,
      OR: [{ deadline: null }, { deadline: { gt: new Date() } }],
      audience: "EVERYONE",
      createdAt: { gte: new Date(Date.now() - WEEK_MS) },
    },
    _count: { _all: true },
    orderBy: { _count: { universityId: "desc" } },
    take: 12,
  });
  if (busiest.length === 0) return [];

  const universities = await db.university.findMany({
    where: { id: { in: busiest.map((row) => row.universityId) } },
    select: universitySelect,
  });
  const byId = new Map(universities.map((u) => [u.id, u]));
  return busiest
    .map((row) => ({
      university: byId.get(row.universityId),
      postCount: row._count._all,
    }))
    .filter(
      (row): row is { university: UniversityRow; postCount: number } =>
        !!row.university &&
        row.university._count.users >= MIN_MEMBERS_TO_NAME_UNIVERSITY,
    )
    .slice(0, 4)
    .map(({ university, postCount }) => ({
      slug: university.slug,
      name: university.name,
      postCount,
    }));
}

export type SearchResults = {
  universities: { slug: string; name: string; countryCode: string }[];
  posts: { id: string; title: string; topic: Topic }[];
};

export async function search(
  viewer: Viewer,
  raw: string,
): Promise<SearchResults> {
  const query = raw.trim().slice(0, 80);
  if (query.length < 2) return { universities: [], posts: [] };

  // ponytail: ILIKE scans; add a pg_trgm or full-text index once posts number in the 100k range.
  const [universities, posts] = await Promise.all([
    db.university.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      select: universitySelect,
      orderBy: { users: { _count: "desc" } },
      take: 12,
    }),
    db.post.findMany({
      where: {
        AND: [
          discoverableTo(viewer),
          {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { body: { contains: query, mode: "insensitive" } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, topic: true },
    }),
  ]);

  return {
    universities: universities
      .filter(
        (u) =>
          u.id === viewer.university.id ||
          u._count.users >= MIN_MEMBERS_TO_NAME_UNIVERSITY,
      )
      .slice(0, 5)
      .map((u) => ({ slug: u.slug, name: u.name, countryCode: u.countryCode })),
    posts,
  };
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

/**
 * Team accounts that TEAM_EMAILS still lists. Checked per request, so taking
 * someone off the list removes their access straight away.
 */
export function isModerator(viewer: Viewer) {
  return viewer.university.slug === TEAM.slug && isTeamEmail(viewer.email);
}

/** Reported content as moderators see it: what was said, never who said it. */
export type ModItem = {
  target: "post" | "comment";
  id: string;
  /** The post title, or for a reply, the title of its thread. */
  title: string;
  body: string;
  image: PostSummary["image"];
  alias: Pseudonym;
  university: PublicUniversity;
  createdAt: Date;
  hidden: boolean;
  /** Null when the moderator can't open the thread (hidden or campus-only). */
  threadId: string | null;
  reasons: { reason: ReportReason; count: number }[];
  reportCount: number;
};

const OPEN_REPORTS = { reports: { some: { resolvedAt: null } } };
const openReportsSelect = {
  where: { resolvedAt: null },
  select: { reason: true },
} as const;

function tally(reports: { reason: ReportReason }[]) {
  const counts = new Map<ReportReason, number>();
  for (const { reason } of reports)
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  return [...counts]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getModQueue(viewer: Viewer): Promise<ModItem[]> {
  if (!isModerator(viewer)) return [];
  const openable = (post: {
    hiddenAt: Date | null;
    audience: Audience;
    universityId: string;
  }) =>
    post.hiddenAt === null &&
    (post.audience === "EVERYONE" ||
      post.universityId === viewer.university.id);

  // ponytail: first 100 of each; page the queue once it's ever that long.
  const [posts, comments] = await Promise.all([
    db.post.findMany({
      where: OPEN_REPORTS,
      take: 100,
      select: {
        id: true,
        title: true,
        body: true,
        imageUrl: true,
        imageAlt: true,
        imageWidth: true,
        imageHeight: true,
        audience: true,
        hiddenAt: true,
        createdAt: true,
        authorId: true,
        universityId: true,
        university: { select: universitySelect },
        reports: openReportsSelect,
      },
    }),
    db.comment.findMany({
      where: OPEN_REPORTS,
      take: 100,
      select: {
        id: true,
        body: true,
        hiddenAt: true,
        createdAt: true,
        authorId: true,
        author: { select: { university: { select: universitySelect } } },
        post: {
          select: {
            id: true,
            title: true,
            audience: true,
            hiddenAt: true,
            universityId: true,
          },
        },
        reports: openReportsSelect,
      },
    }),
  ]);

  const items: ModItem[] = [
    ...posts.map((post) => ({
      target: "post" as const,
      id: post.id,
      title: post.title,
      body: post.body,
      image: post.imageUrl
        ? {
            url: `/api/images/${post.id}`,
            alt:
              post.imageAlt ??
              "Image attached to this post; description unavailable.",
            width: post.imageWidth ?? 1200,
            height: post.imageHeight ?? 900,
          }
        : null,
      alias: pseudonym(post.authorId, post.id),
      university: publicUniversity(post.university, viewer),
      createdAt: post.createdAt,
      hidden: post.hiddenAt !== null,
      threadId: openable(post) ? post.id : null,
      reasons: tally(post.reports),
      reportCount: post.reports.length,
    })),
    ...comments.map((comment) => ({
      target: "comment" as const,
      id: comment.id,
      title: comment.post.title,
      body: comment.body,
      image: null,
      alias: pseudonym(comment.authorId, comment.post.id),
      university: publicUniversity(comment.author.university, viewer),
      createdAt: comment.createdAt,
      hidden: comment.hiddenAt !== null,
      threadId: openable(comment.post) ? comment.post.id : null,
      reasons: tally(comment.reports),
      reportCount: comment.reports.length,
    })),
  ];
  // Hidden content first: it's already off the feeds, waiting on a decision.
  return items.sort(
    (a, b) =>
      Number(b.hidden) - Number(a.hidden) ||
      b.reportCount - a.reportCount ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export async function getModQueueSize() {
  const [posts, comments] = await Promise.all([
    db.post.count({ where: OPEN_REPORTS }),
    db.comment.count({ where: OPEN_REPORTS }),
  ]);
  return posts + comments;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationItem = {
  id: string;
  type: NotificationType;
  unread: boolean;
  createdAt: Date;
  revision: number;
  replyId: string | null;
  post: { id: string; title: string };
};

export async function getNotifications(
  viewer: Viewer,
  cursor?: string,
): Promise<NotificationItem[]> {
  const rows = await db.notification.findMany({
    where: {
      userId: viewer.id,
      post: visibleTo(viewer),
      ...afterCursor(cursor),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true,
      type: true,
      readAt: true,
      createdAt: true,
      revision: true,
      replyId: true,
      post: { select: { id: true, title: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    unread: row.readAt === null,
    createdAt: row.createdAt,
    revision: row.revision,
    replyId: row.replyId,
    post: row.post,
  }));
}

export function getUnreadCount(viewer: Viewer) {
  return db.notification.count({
    where: { userId: viewer.id, readAt: null, post: visibleTo(viewer) },
  });
}

export async function getAccountStats(viewer: Viewer) {
  const [posts, comments, likesReceived] = await Promise.all([
    db.post.count({ where: { authorId: viewer.id } }),
    db.comment.count({ where: { authorId: viewer.id } }),
    db.like.count({ where: { post: { authorId: viewer.id } } }),
  ]);
  return { posts, comments, likesReceived };
}

const decisionSelect = {
  id: true,
  decision: true,
  reason: true,
  createdAt: true,
  appealText: true,
  appealedAt: true,
  resolvedAt: true,
  restored: true,
  response: true,
  post: { select: { title: true, body: true } },
  comment: { select: { body: true, post: { select: { title: true } } } },
} satisfies Prisma.ModerationCaseSelect;

export async function getModerationHistory(viewer: Viewer) {
  const rows = await db.moderationCase.findMany({
    where: { authorId: viewer.id },
    select: decisionSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
  });
  return rows.map(({ post, comment, ...item }) => ({
    ...item,
    title: post?.title ?? comment?.post.title ?? "Deleted content",
    body: post?.body ?? comment?.body ?? "",
  }));
}
export type ModerationHistory = Awaited<
  ReturnType<typeof getModerationHistory>
>;

export async function getAppeals(viewer: Viewer) {
  if (!isModerator(viewer)) return [];
  const rows = await db.moderationCase.findMany({
    where: { appealedAt: { not: null }, resolvedAt: null },
    select: decisionSelect,
    orderBy: [{ appealedAt: "asc" }, { id: "asc" }],
    take: 100,
  });
  return rows.map(({ post, comment, ...item }) => ({
    ...item,
    title: post?.title ?? comment?.post.title ?? "Deleted content",
    body: post?.body ?? comment?.body ?? "",
  }));
}
