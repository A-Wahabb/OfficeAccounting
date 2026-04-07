/**
 * Centralized TanStack Query key factories — colocate by domain.
 */
export const queryKeys = {
  root: ["app"] as const,
  user: () => [...queryKeys.root, "user"] as const,
} as const;
