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
