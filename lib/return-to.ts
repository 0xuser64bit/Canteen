/** Only known local product destinations may survive an authentication redirect. */
export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return "/campus";
  try {
    const url = new URL(value, "https://canteen.invalid");
    if (
      url.origin !== "https://canteen.invalid" ||
      !/^\/(?:campus|home|new|me|settings|notifications|mod|launch|host|account-status|p\/[a-zA-Z0-9_-]+|u\/[a-z0-9-]+)\/?$/.test(
        url.pathname,
      )
    )
      return "/campus";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/campus";
  }
}

/** A thread's return action goes to a reading surface, never another thread. */
export function threadReturnTo(value: unknown): string {
  const safe = safeReturnTo(value);
  return /^\/(?:campus|home|me|notifications|host|u\/[a-z0-9-]+)\/?(?:[?#]|$)/.test(
    safe,
  )
    ? safe
    : "/campus";
}

export function threadHref(href: `/p/${string}`, from: string): `/p/${string}` {
  const url = new URL(href, "https://canteen.invalid");
  url.searchParams.set("from", threadReturnTo(from));
  return `${url.pathname}${url.search}${url.hash}` as `/p/${string}`;
}
