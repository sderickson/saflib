// convenience function for xstate
export function allChildrenSettled(snapshot: any) {
  return Object.values(snapshot.children).every(
    (child: any) => child && child.getSnapshot().status !== "active",
  );
}
