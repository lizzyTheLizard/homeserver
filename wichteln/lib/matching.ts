import type { Group, User } from "./store";

/**
 * Checks whether the remaining (not yet selecting) users can still all be
 * given a remaining wish that isn't their own (bipartite perfect matching).
 */
function canComplete(users: User[], wishOwnerIds: string[]): boolean {
  if (users.length !== wishOwnerIds.length) return false;
  const matchOfWish = new Map<string, string>();

  const tryAssign = (user: User, seen: Set<string>): boolean => {
    for (const owner of wishOwnerIds) {
      if (owner === user.id || seen.has(owner)) continue;
      seen.add(owner);
      const current = matchOfWish.get(owner);
      if (!current || tryAssign(users.find((u) => u.id === current)!, seen)) {
        matchOfWish.set(owner, user.id);
        return true;
      }
    }
    return false;
  };

  return users.every((u) => tryAssign(u, new Set()));
}

/** Owners of wishes that `userId` may pick right now. */
export function selectableWishOwners(group: Group, userId: string): string[] {
  const me = group.users.find((u) => u.id === userId);
  if (!me || me.selectedWishOf || group.phase !== "selection") return [];

  const taken = new Set(group.users.map((u) => u.selectedWishOf).filter(Boolean));
  const openWishOwners = group.users.filter((u) => u.wish && !taken.has(u.id)).map((u) => u.id);
  const otherSelectors = group.users.filter((u) => !u.selectedWishOf && u.id !== userId);

  return openWishOwners.filter(
    (owner) =>
      owner !== userId &&
      canComplete(
        otherSelectors,
        openWishOwners.filter((o) => o !== owner),
      ),
  );
}
