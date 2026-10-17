import { parseDraft, type Draft } from "@/lib/draft";

const PREFIX = "canteen:draft:";
export const DRAFT_OWNER_KEY = `${PREFIX}owner`;
export const DRAFT_CHANGE = "canteen:draft-change";

export function ownsDraft(owner: string) {
  try {
    return localStorage.getItem(DRAFT_OWNER_KEY) === owner;
  } catch {
    return false;
  }
}

export function clearDrafts() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key === "canteen:draft" || key.startsWith(PREFIX))
        localStorage.removeItem(key);
    }
  } catch {
    // Unavailable storage cannot persist a draft.
  }
  window.dispatchEvent(new Event(DRAFT_CHANGE));
}

export function activateDraftOwner(owner: string) {
  if (ownsDraft(owner)) return;
  clearDrafts();
  try {
    localStorage.setItem(DRAFT_OWNER_KEY, owner);
  } catch {
    // Composing still works when persistence is unavailable.
  }
}

export function readDraft(owner: string, context = ""): Draft {
  try {
    return parseDraft(
      ownsDraft(owner)
        ? localStorage.getItem(`${PREFIX}${owner}:${context}`)
        : null,
    );
  } catch {
    return parseDraft(null);
  }
}

export function writeDraft(owner: string, draft: Draft | null, context = "") {
  try {
    if (!ownsDraft(owner)) return;
    const key = `${PREFIX}${owner}:${context}`;
    if (draft && (draft.title || draft.body))
      localStorage.setItem(key, JSON.stringify(draft));
    else localStorage.removeItem(key);
  } catch {
    // Draft persistence must never prevent posting.
  }
}
