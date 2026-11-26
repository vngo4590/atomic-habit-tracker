import "server-only";

/**
 * Pet feature — server-only public API.
 *
 * Database access for the pet ecosystem: listing/adopting/feeding/burying/
 * releasing pets and the shared daily food pool. Server code only; guarded by
 * `server-only`.
 */

export * from "./server/food.repository";
export * from "./server/pets.repository";
