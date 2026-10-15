const names = new Intl.DisplayNames(["en"], { type: "region" });

// Country names that read naturally only with "the" ("in the Netherlands").
const WITH_ARTICLE = new Set([
  "AE",
  "BS",
  "CD",
  "CF",
  "CG",
  "CZ",
  "DO",
  "GB",
  "GM",
  "KM",
  "MH",
  "MV",
  "NL",
  "PH",
  "SB",
  "US",
  "VA",
]);

export function countryName(code: string) {
  try {
    return names.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** "the United States", "India". */
export function inCountry(code: string) {
  const name = countryName(code);
  return WITH_ARTICLE.has(code.toUpperCase()) ? `the ${name}` : name;
}
