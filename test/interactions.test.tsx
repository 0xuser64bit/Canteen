// @vitest-environment happy-dom
import { act, type ComponentProps, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DeleteAccountButton, SignOutButton } from "@/components/account";
import { Composer } from "@/components/composer";
import { PollView } from "@/components/poll";
import { SignIn } from "@/components/sign-in";
import { ThreadView } from "@/components/thread";
import {
  activateDraftOwner,
  DRAFT_OWNER_KEY,
  readDraft,
  writeDraft,
} from "@/lib/draft-storage";
import type { Thread } from "@/server/queries";

const mocks = vi.hoisted(() => {
  const request = () => vi.fn<(...args: unknown[]) => Promise<unknown>>();
  return {
    search: "",
    router: {
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
    },
    create: request(),
    vote: request(),
    like: request(),
    reply: request(),
    helpful: request(),
    hint: request(),
    sendCode: request(),
    signIn: request(),
    social: request(),
    signOut: request(),
    deleteAccount: request(),
    toast: vi.fn(),
  };
});
vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => new URLSearchParams(mocks.search),
  usePathname: () => "/p/thread-test",
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/server/actions", () => ({
  createPost: mocks.create,
  votePoll: mocks.vote,
  setLike: mocks.like,
  addComment: mocks.reply,
  recordView: vi.fn(),
  markHelpful: mocks.helpful,
  lookupUniversity: mocks.hint,
  deleteAccount: mocks.deleteAccount,
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    emailOtp: { sendVerificationOtp: mocks.sendCode },
    signIn: { emailOtp: mocks.signIn, social: mocks.social },
    signOut: mocks.signOut,
  },
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toast } }));
vi.mock("@/components/post-menu", () => ({
  PostMenu: () => null,
  CommentMenu: ({ onReply }: { onReply?: () => void }) => (
    <button type="button" onClick={onReply}>
      Reply to this
    </button>
  ),
}));
vi.mock("@/components/post", () => ({
  LikeButton: () => null,
  PostImage: () => null,
  UniversityLabel: ({ university }: { university: { name: string } }) => (
    <span>{university.name}</span>
  ),
}));
vi.mock("@/components/time", () => ({
  TimeAgo: () => null,
  DateTime: () => null,
  Deadline: () => null,
}));
vi.mock("@/components/preferences", () => ({ reducedMotion: () => true }));
vi.mock("@/components/ui/datetime-field", () => ({
  DateTimeField: ({
    id,
    value,
    onChange,
  }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.search = "";
  localStorage.clear();
  activateDraftOwner("session-a");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  mocks.hint.mockResolvedValue(null);
  mocks.sendCode.mockResolvedValue({});
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
const render = async (element: ReactNode) =>
  act(async () => root.render(element));
function field(selector: string) {
  const node = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    selector,
  );
  if (!node) throw new Error(`Missing field: ${selector}`);
  return node;
}
async function change(selector: string, value: string) {
  await act(async () => {
    const node = field(selector);
    const prototype =
      node instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit(selector = "form") {
  await act(async () => {
    container
      .querySelector(selector)!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}
function deferred<T = unknown>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const composer = (emailEnabled = false) => (
  <Composer
    draftOwner="session-a"
    university="Stanford"
    initialTopic="GENERAL"
    imagesEnabled={false}
    emailEnabled={emailEnabled}
  />
);

const replyEmail = () =>
  document.querySelector<HTMLInputElement>("input[type=checkbox]");

it("offers a question's one reply email only when email is configured", async () => {
  mocks.create.mockResolvedValue({ postedId: "published-post" });
  await render(composer());
  expect(replyEmail()).toBeNull();
  await render(composer(true));
  await act(async () => replyEmail()!.click());
  await change("#title", "A useful question");
  await change("#body", "Some context");
  await submit();
  const form = mocks.create.mock.calls[0]![1] as FormData;
  expect(form.get("kind")).toBe("QUESTION");
  expect(form.get("emailOnReply")).toBe("on");
});

it("drops the reply email when a question becomes a conversation", async () => {
  mocks.create.mockResolvedValue({ postedId: "published-post" });
  await render(composer(true));
  await act(async () => replyEmail()!.click());
  const conversation = [
    ...container.querySelectorAll<HTMLButtonElement>("button[role=radio]"),
  ].find((button) => button.textContent === "Conversation")!;
  await act(async () => conversation.click());
  expect(replyEmail()).toBeNull();
  await change("#title", "Let's talk");
  await change("#body", "Some context");
  await submit();
  expect(
    (mocks.create.mock.calls[0]![1] as FormData).get("emailOnReply"),
  ).toBeNull();
});

it("recovers the same session after remount without adopting legacy text", async () => {
  localStorage.setItem(
    "canteen:draft",
    JSON.stringify({ title: "Unowned secret", body: "Someone else's draft" }),
  );
  await render(composer());
  expect(field("#title").value).toBe("");
  await change("#title", "My own question");
  await change("#body", "My own draft");
  await render(null);
  await render(composer());
  expect(field("#title").value).toBe("My own question");
  expect(field("#body").value).toBe("My own draft");
});

it("can publish when browser storage is blocked", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Storage blocked");
  });
  mocks.create.mockResolvedValue({ postedId: "published-post" });
  await render(composer());
  await change("#title", "A useful question");
  await change("#body", "Some context");
  await submit();
  expect(mocks.create).toHaveBeenCalled();
  expect(mocks.router.push).toHaveBeenCalledWith("/p/published-post");
});

it.each(["success", "returned failure", "network failure"])(
  "clears drafts and invalidates an open composer only after sign-out %s",
  async (outcome) => {
    const request = deferred();
    mocks.signOut.mockReturnValue(request.promise);
    await render(
      <>
        {composer()}
        <SignOutButton />
      </>,
    );
    await change("#title", "Private question");
    await change("#body", "Private context");
    const button = [...container.querySelectorAll("button")].find(
      (item) => item.textContent?.trim() === "Sign out",
    )!;
    await act(async () => button.click());
    expect(readDraft("session-a").body).toBe("Private context");
    await act(async () => {
      if (outcome === "network failure") request.reject(new Error("Offline"));
      else request.resolve(outcome === "success" ? {} : { error: "Failed" });
    });
    if (outcome === "success") {
      expect(field("#body").value).toBe("");
      expect(readDraft("session-a").body).toBe("");
      expect(mocks.router.replace).toHaveBeenCalledWith("/");
      await submit();
      expect(mocks.create).not.toHaveBeenCalled();
    } else {
      expect(field("#body").value).toBe("Private context");
      expect(readDraft("session-a").body).toBe("Private context");
      expect(mocks.router.replace).not.toHaveBeenCalled();
    }
  },
);

it.each([true, false])(
  "clears drafts only after account deletion is confirmed: %s",
  async (succeeded) => {
    const request = deferred();
    mocks.deleteAccount.mockReturnValue(request.promise);
    writeDraft("session-a", { title: "Private", body: "Sensitive text" });
    await render(<DeleteAccountButton />);
    await act(async () => container.querySelector("button")!.click());
    await change("#confirm-delete", "delete my account");
    await act(async () => {
      document
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(readDraft("session-a").body).toBe("Sensitive text");
    await act(async () =>
      request.resolve(
        succeeded ? { ok: true } : { ok: false, error: "Failed" },
      ),
    );
    expect(readDraft("session-a").body).toBe(succeeded ? "" : "Sensitive text");
    if (succeeded)
      expect(mocks.router.replace).toHaveBeenCalledWith("/?deleted=1");
    else expect(mocks.router.replace).not.toHaveBeenCalled();
  },
);

it("restores complete opportunity context and clears every field on an account switch", async () => {
  writeDraft("session-a", {
    title: "Private opportunity",
    body: "A draft",
    topic: "OPPORTUNITIES",
    kind: "DISCUSSION",
    audience: "EVERYONE",
    applicationUrl: "https://example.org/apply",
    deadline: "2027-01-01T12:00",
    poll: ["Yes", "No"],
    imageAlt: "Private image details",
    submissionId: crypto.randomUUID(),
  });
  await render(composer());
  expect(field("#title").value).toBe("Private opportunity");
  expect(field("#application-url").value).toBe("https://example.org/apply");
  expect(field('[aria-label="Choice 1"]').value).toBe("Yes");
  await act(async () => {
    localStorage.setItem(DRAFT_OWNER_KEY, "session-b");
    window.dispatchEvent(new StorageEvent("storage", { key: DRAFT_OWNER_KEY }));
  });
  expect(field("#title").value).toBe("");
  expect(field("#body").value).toBe("");
  expect(container.querySelector("#application-url")).toBeNull();
  expect(container.querySelector('[aria-label="Choice 1"]')).toBeNull();
  expect(container.textContent).not.toContain("Private image details");
  await submit();
  expect(mocks.create).not.toHaveBeenCalled();
});

it("keeps a submitted draft through failure and clears it only after confirmed publication", async () => {
  const request = deferred();
  mocks.create.mockReturnValue(request.promise);
  await render(composer());
  await change("#title", "A useful question");
  await change("#body", "Private draft content");
  await submit();
  expect(readDraft("session-a").body).toBe("Private draft content");
  await act(async () => request.resolve({ error: "Try again" }));
  expect(readDraft("session-a").body).toBe("Private draft content");
  mocks.create.mockResolvedValue({ postedId: "published-post" });
  await submit();
  expect(readDraft("session-a").body).toBe("");
  expect(mocks.router.push).toHaveBeenCalledWith("/p/published-post");
});

it("recovers a rejected publication without losing its draft or retry identity", async () => {
  const request = deferred();
  mocks.create.mockReturnValue(request.promise);
  await render(composer());
  await change("#title", "A useful question");
  await change("#body", "Private draft content");
  await submit();
  expect(field("#body").closest("fieldset")!.disabled).toBe(true);
  const first = mocks.create.mock.calls[0]![1] as FormData;
  await act(async () => request.reject(new Error("Offline")));
  expect(container.querySelector('[role="alert"]')!.textContent).toContain(
    "Couldn't confirm your post",
  );
  expect(field("#body").closest("fieldset")!.disabled).toBe(false);
  expect(readDraft("session-a").body).toBe("Private draft content");
  expect(mocks.router.push).not.toHaveBeenCalled();
  mocks.create.mockResolvedValue({ postedId: "published-post" });
  await submit();
  const retry = mocks.create.mock.calls[1]![1] as FormData;
  expect(retry.get("id")).toBe(first.get("id"));
  expect(retry.get("body")).toBe("Private draft content");
  expect(readDraft("session-a").body).toBe("");
});

it("updates mounted poll totals and rolls back a failed pending choice", async () => {
  const base = {
    options: [
      { id: "a", label: "Yes", votes: 1 },
      { id: "b", label: "No", votes: 0 },
    ],
    choice: "a",
    total: 1,
  };
  await render(<PollView postId="post" poll={base} />);
  const refreshed = {
    ...base,
    total: 2,
    options: base.options.map((option) => ({ ...option, votes: 1 })),
  };
  await render(<PollView postId="post" poll={refreshed} />);
  expect(container.textContent).toContain("2 votes");
  expect(container.textContent).toContain("50%");
  const request = deferred();
  mocks.vote.mockReturnValue(request.promise);
  await act(async () => container.querySelectorAll("button")[1]!.click());
  expect(
    container.querySelectorAll("button")[1]!.getAttribute("aria-pressed"),
  ).toBe("true");
  await act(async () => request.resolve({ ok: false, error: "Unavailable" }));
  expect(
    container.querySelectorAll("button")[0]!.getAttribute("aria-pressed"),
  ).toBe("true");
});

it("reconciles refreshed like counts and recovers from a failed optimistic like", async () => {
  const { LikeButton } =
    await vi.importActual<typeof import("@/components/post")>(
      "@/components/post",
    );
  await render(<LikeButton postId="post" liked={false} count={1} />);
  await render(<LikeButton postId="post" liked={false} count={2} />);
  expect(container.textContent).toBe("2");
  const request = deferred();
  mocks.like.mockReturnValue(request.promise);
  await act(async () => container.querySelector("button")!.click());
  expect(container.textContent).toBe("3");
  await act(async () => request.reject(new Error("Offline")));
  expect(container.textContent).toBe("2");
  expect(container.querySelector("button")!.getAttribute("aria-pressed")).toBe(
    "false",
  );
});

const alias = { name: "Quiet Otter", hue: 120 };
const thread: Thread = {
  id: "post",
  title: "A question",
  body: "Some context",
  excerpt: "Some context",
  image: null,
  applicationUrl: null,
  deadline: null,
  closed: false,
  kind: "QUESTION",
  helpfulCommentId: null,
  topic: "GENERAL",
  audience: "EVERYONE",
  createdAt: new Date(),
  university: { name: "Stanford", slug: null },
  alias,
  viewerAlias: alias,
  isMine: false,
  liked: false,
  likeCount: 0,
  commentCount: 0,
  viewCount: 0,
  hidden: false,
  revision: 0,
  saved: false,
  following: false,
  staff: false,
  poll: null,
  participantCount: 2,
  comments: [],
  earlierCursor: null,
  historical: false,
  helpfulReply: null,
};
it.each(["returned", "thrown"])(
  "preserves newly typed text after a %s reply failure",
  async (mode) => {
    const request = deferred();
    mocks.reply.mockReturnValue(request.promise);
    await render(<ThreadView thread={thread} />);
    await change("textarea", "First reply");
    await submit("#reply-bar");
    const sending = [...container.querySelectorAll("span")].find(
      (span) => span.textContent === "Sending…",
    );
    expect(sending).toBeDefined();
    expect(sending!.closest(".opacity-80")).toBeNull();
    await change("textarea", "Newer draft");
    await act(async () => {
      if (mode === "returned") request.resolve({ ok: false, error: "Failed" });
      else request.reject(new Error("Offline"));
    });
    expect(field("textarea").value).toBe("Newer draft");
    expect(container.querySelector("details")!.textContent).toContain(
      "First reply",
    );
  },
);

it("allows authorized staff OTP requests after an unrecognized university hint", async () => {
  mocks.signIn.mockResolvedValue({});
  await render(
    <SignIn emailEnabled googleEnabled={false} returnTo="/p/shared-thread" />,
  );
  await change("input[type=email]", "staff@example.com");
  await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
  expect(mocks.hint).toHaveBeenCalled();
  await submit();
  expect(mocks.sendCode).toHaveBeenCalledWith({
    email: "staff@example.com",
    type: "sign-in",
  });
  expect(container.textContent).toContain("staff@example.com");
  await change("#code", "12345678");
  expect(mocks.signIn).toHaveBeenCalledWith({
    email: "staff@example.com",
    otp: "12345678",
  });
  expect(mocks.router.replace).toHaveBeenCalledWith("/p/shared-thread");
});

it("reuses a reply publication ID after a lost acknowledgement", async () => {
  mocks.reply.mockRejectedValueOnce(new Error("Acknowledgement lost"));
  mocks.reply.mockResolvedValue({ ok: true, data: null });
  await render(<ThreadView thread={thread} />);
  await change("textarea", "A helpful reply");
  await submit("#reply-bar");
  expect(field("textarea").value).toBe("A helpful reply");
  await submit("#reply-bar");
  expect(field("textarea").value).toBe("");
  expect(mocks.reply.mock.calls[1]![2]).toBe(mocks.reply.mock.calls[0]![2]);
  await change("textarea", "A helpful reply");
  await submit("#reply-bar");
  expect(mocks.reply.mock.calls[2]![2]).not.toBe(mocks.reply.mock.calls[0]![2]);
});

it("confirms an uncertain reply separately without merging or losing newer text", async () => {
  const request = deferred();
  mocks.reply.mockReturnValueOnce(request.promise);
  await render(<ThreadView thread={thread} />);
  await change("textarea", "First reply");
  await submit("#reply-bar");
  await change("textarea", "Newer draft");
  await act(async () => request.reject(new Error("Lost acknowledgement")));
  const retry = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "Retry this reply",
  )!;
  mocks.reply.mockRejectedValueOnce(new Error("Still offline"));
  await act(async () => retry.click());
  expect(field("textarea").value).toBe("Newer draft");
  expect(container.querySelector("details")!.textContent).toContain(
    "First reply",
  );
  mocks.reply.mockResolvedValue({ ok: true, data: null });
  await act(async () => retry.click());
  expect(container.querySelector("details")).toBeNull();
  expect(field("textarea").value).toBe("Newer draft");
  expect(mocks.reply.mock.calls.map((call) => call[1])).toEqual([
    "First reply",
    "First reply",
    "First reply",
  ]);
  expect(new Set(mocks.reply.mock.calls.map((call) => call[2])).size).toBe(1);
  await submit("#reply-bar");
  expect(mocks.reply.mock.calls[3]![1]).toBe("Newer draft");
  expect(mocks.reply.mock.calls[3]![2]).not.toBe(mocks.reply.mock.calls[0]![2]);
});

it("recovers from a helpful-answer connection failure without leaving the conversation", async () => {
  mocks.helpful.mockRejectedValueOnce(new Error("Offline"));
  mocks.helpful.mockResolvedValue({ ok: true, data: null });
  await render(
    <ThreadView
      thread={{
        ...thread,
        isMine: true,
        comments: [
          {
            id: "answer",
            body: "Helpful context",
            createdAt: new Date(),
            alias,
            university: thread.university,
            isMine: false,
            isAuthor: false,
            hidden: false,
            replyTo: null,
          },
        ],
      }}
    />,
  );
  const helpful = [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "Mark helpful",
  )!;
  await act(async () => helpful.click());
  expect(mocks.toast).toHaveBeenCalledWith(
    "Couldn't confirm that helpful answer. Check your connection and try again.",
  );
  expect(container.textContent).toContain("Helpful context");
  expect(helpful.disabled).toBe(false);
  await act(async () => helpful.click());
  expect(mocks.helpful).toHaveBeenCalledTimes(2);
  expect(mocks.helpful).toHaveBeenLastCalledWith("post", "answer");
});

it("answers a specific message and keeps that target through a failed send", async () => {
  mocks.reply
    .mockResolvedValueOnce({ ok: false, error: "Failed" })
    .mockResolvedValue({ ok: true, data: null });
  await render(
    <ThreadView
      thread={{
        ...thread,
        comments: [
          {
            id: "earlier",
            body: "Office hours on Mondays are quiet",
            createdAt: new Date(),
            alias,
            university: thread.university,
            isMine: false,
            isAuthor: false,
            hidden: false,
            replyTo: null,
          },
        ],
      }}
    />,
  );
  const bar = () => container.querySelector("#reply-bar")!.textContent!;
  const answer = () =>
    [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Reply to this",
    )!;
  await act(async () => answer().click());
  expect(bar()).toContain(
    "Replying to Quiet Otter: Office hours on Mondays are quiet",
  );
  expect(document.activeElement).toBe(field("textarea"));

  await change("textarea", "Which room?");
  await submit("#reply-bar");
  expect(mocks.reply).toHaveBeenLastCalledWith(
    "post",
    "Which room?",
    expect.any(String),
    "earlier",
  );
  // A failed send restores the text and the message it answers.
  expect(field("textarea").value).toBe("Which room?");
  expect(bar()).toContain("Replying to Quiet Otter");
  await submit("#reply-bar");
  expect(mocks.reply).toHaveBeenLastCalledWith(
    "post",
    "Which room?",
    expect.any(String),
    "earlier",
  );
  expect(bar()).not.toContain("Replying to");

  // Escape lets go of the target without touching the draft.
  await act(async () => answer().click());
  await change("textarea", "Unrelated thought");
  await act(async () => {
    field("textarea").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });
  expect(bar()).not.toContain("Replying to");
  expect(field("textarea").value).toBe("Unrelated thought");
});

it("returns from a thread to the original private collection", async () => {
  mocks.search = new URLSearchParams({
    from: "/me?collection=saved",
  }).toString();
  await render(<ThreadView thread={thread} />);
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[aria-label="Back"]')!.click(),
  );
  expect(mocks.router.replace).toHaveBeenCalledWith("/me?collection=saved");
});

it("keeps the requested email fixed while sending a code", async () => {
  const request = deferred();
  mocks.sendCode.mockReturnValue(request.promise);
  await render(<SignIn emailEnabled googleEnabled={false} />);
  await change("#email", "first@stanford.edu");
  await submit();
  await submit();
  expect(mocks.sendCode).toHaveBeenCalledOnce();
  expect(field("#email").disabled).toBe(true);
  await act(async () => request.resolve({}));
  expect(container.textContent).toContain("first@stanford.edu");
  expect(field("#code").disabled).toBe(false);
});

it("verifies autofilled codes once and prevents address switching until it finishes", async () => {
  const request = deferred();
  mocks.signIn.mockReturnValue(request.promise);
  await render(<SignIn emailEnabled googleEnabled={false} />);
  await change("#email", "first@stanford.edu");
  await submit();
  await change("#code", "12345678");
  await submit();
  expect(mocks.signIn).toHaveBeenCalledOnce();
  expect(field("#code").disabled).toBe(true);
  const switchEmail = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "Use a different email",
  )!;
  expect(switchEmail.disabled).toBe(true);
  await act(async () => request.reject(new Error("Offline")));
  expect(container.querySelector('[role="alert"]')!.textContent).toContain(
    "Check your connection",
  );
  expect(field("#code").value).toBe("12345678");
  expect(field("#code").disabled).toBe(false);
  expect(switchEmail.disabled).toBe(false);
  mocks.signIn.mockResolvedValue({});
  await submit();
  expect(mocks.router.replace).toHaveBeenCalledWith("/campus");
});

it("recovers from an offline code request without losing the address", async () => {
  mocks.sendCode.mockRejectedValue(new Error("Offline"));
  await render(<SignIn emailEnabled googleEnabled={false} />);
  await change("#email", "student@mit.edu");
  await submit();
  expect(field("#email").value).toBe("student@mit.edu");
  expect(field("#email").disabled).toBe(false);
  expect(container.querySelector('[role="alert"]')!.textContent).toContain(
    "Check your connection",
  );
  mocks.sendCode.mockResolvedValue({});
  await submit();
  expect(field("#code")).toBeDefined();
});

it.each(["returned", "thrown"])(
  "shows recoverable Google sign-in errors (%s)",
  async (mode) => {
    if (mode === "returned")
      mocks.social.mockResolvedValue({
        error: { message: "Google unavailable" },
      });
    else mocks.social.mockRejectedValue(new Error("Offline"));
    await render(<SignIn emailEnabled={false} googleEnabled />);
    const button = Array.from(container.querySelectorAll("button")).find(
      (item) => item.textContent?.includes("Continue with Google"),
    )!;
    await act(async () => button.click());
    expect(container.querySelector('[role="alert"]')!.textContent).toContain(
      mode === "returned" ? "Google unavailable" : "Check your connection",
    );
    expect(button.disabled).toBe(false);
  },
);
