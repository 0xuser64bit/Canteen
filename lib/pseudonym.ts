import "server-only";
import { createHmac } from "node:crypto";

const ADJECTIVES = [
  "Brave",
  "Breezy",
  "Calm",
  "Cheery",
  "Clever",
  "Cosmic",
  "Curious",
  "Dapper",
  "Daring",
  "Eager",
  "Fuzzy",
  "Gentle",
  "Golden",
  "Happy",
  "Hazy",
  "Honest",
  "Humble",
  "Jolly",
  "Keen",
  "Kind",
  "Lively",
  "Lucky",
  "Mellow",
  "Merry",
  "Mighty",
  "Misty",
  "Nimble",
  "Noble",
  "Patient",
  "Plucky",
  "Polite",
  "Proud",
  "Quick",
  "Quiet",
  "Rapid",
  "Rustic",
  "Sage",
  "Snowy",
  "Spry",
  "Sunny",
  "Swift",
  "Tidy",
  "Tiny",
  "Upbeat",
  "Velvet",
  "Vivid",
  "Witty",
  "Zesty",
];

const ANIMALS = [
  "Badger",
  "Beaver",
  "Bison",
  "Camel",
  "Cheetah",
  "Crane",
  "Deer",
  "Dolphin",
  "Eagle",
  "Falcon",
  "Ferret",
  "Fox",
  "Gecko",
  "Giraffe",
  "Hare",
  "Hedgehog",
  "Heron",
  "Ibis",
  "Jaguar",
  "Kiwi",
  "Koala",
  "Lemur",
  "Llama",
  "Lynx",
  "Marten",
  "Moose",
  "Narwhal",
  "Ocelot",
  "Orca",
  "Otter",
  "Owl",
  "Panda",
  "Parrot",
  "Penguin",
  "Puffin",
  "Quokka",
  "Raccoon",
  "Raven",
  "Seal",
  "Sloth",
  "Swan",
  "Tapir",
  "Tiger",
  "Toucan",
  "Walrus",
  "Wombat",
  "Yak",
  "Zebra",
];

export type Pseudonym = { name: string; hue: number };

function secret() {
  const value = process.env.BETTER_AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
  return "canteen-development-secret";
}

/** A keyed one-way hash for server-side records that must not hold the raw value. */
export function keyedHash(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

/**
 * A stable alias for `userId` inside one thread, like "Quiet Otter".
 * The same student keeps one alias per post (so conversations stay readable)
 * but gets unrelated aliases on different posts, so nobody can link their
 * activity across threads. Keyed with a server secret: aliases can't be
 * reversed or precomputed from user ids.
 */
export function pseudonym(userId: string, threadId: string): Pseudonym {
  const digest = createHmac("sha256", secret())
    .update(`pseudonym:${threadId}:${userId}`)
    .digest();
  return {
    name: `${ADJECTIVES[digest.readUInt16BE(0) % ADJECTIVES.length]} ${ANIMALS[digest.readUInt16BE(2) % ANIMALS.length]}`,
    hue: digest.readUInt16BE(4) % 360,
  };
}
