/**
 * Likes Module - Barrel Export
 */

export { InMemoryLikeStore, likeStore } from "./inMemoryLikeStore";
export type { LikeEvent, LikeToggleResult } from "./inMemoryLikeStore";
export { LikeSyncWorker, createLikeSyncWorker } from "./likeSyncWorker";
