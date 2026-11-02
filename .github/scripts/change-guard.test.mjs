import assert from "node:assert/strict";
import test from "node:test";
import { resolveChangeForBranch } from "./change-guard.mjs";

test("unarchived change fails", () => {
  const result = resolveChangeForBranch("branch-per-change", ["openspec/changes/branch-per-change/proposal.md"]);

  assert.equal(result.ok, false);
  assert.match(result.reason, /not archived; archive it before opening the pull request/);
});

test("archived change with synced specs passes", () => {
  const result = resolveChangeForBranch("branch-per-change", [
    "openspec/changes/archive/2026-11-01-branch-per-change/specs/ci/change-guard/spec.md",
    "openspec/specs/ci/change-guard/spec.md",
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.change, "branch-per-change");
});

test("mismatched branch fails and names the expected branch", () => {
  const result = resolveChangeForBranch("fix-stuff", ["openspec/changes/archive/2026-11-01-branch-per-change/proposal.md"]);

  assert.equal(result.ok, false);
  assert.equal(result.change, "branch-per-change");
  assert.match(result.reason, /expected branch 'branch-per-change'/);
});

test("archived change without synced specs fails", () => {
  const result = resolveChangeForBranch("branch-per-change", [
    "openspec/changes/archive/2026-11-01-branch-per-change/specs/ci/change-guard/spec.md",
  ]);

  assert.equal(result.ok, false);
  assert.match(result.reason, /main specs were not synced/);
});

test("a delta synced into a different capability fails and names the missing main spec", () => {
  const result = resolveChangeForBranch("branch-per-change", [
    "openspec/changes/archive/2026-11-01-branch-per-change/specs/pipeline/spec.md",
    "openspec/changes/archive/2026-11-01-branch-per-change/specs/ci/change-guard/spec.md",
    "openspec/specs/pipeline/spec.md",
  ]);

  assert.equal(result.ok, false);
  assert.match(result.reason, /openspec\/specs\/ci\/change-guard\/spec\.md/);
  assert.doesNotMatch(result.reason, /openspec\/specs\/pipeline\/spec\.md/);
});

test("a deleted main spec counts as synced for a removed capability", () => {
  const result = resolveChangeForBranch(
    "drop-it",
    ["openspec/changes/archive/2026-11-01-drop-it/specs/old/spec.md", "openspec/specs/old/spec.md"],
    { deleted: ["openspec/specs/old/spec.md"] },
  );

  assert.equal(result.ok, true);
});

test("archived change without deltas passes without spec changes", () => {
  const result = resolveChangeForBranch("quick-fix", ["openspec/changes/archive/2026-11-01-quick-fix/proposal.md"]);

  assert.equal(result.ok, true);
  assert.equal(result.change, "quick-fix");
});

test("pull request without a change folder is out of scope", () => {
  const result = resolveChangeForBranch("dependabot/npm_and_yarn/vite-8.3.3", ["services/web/package.json", "pnpm-lock.yaml"]);

  assert.equal(result.ok, true);
  assert.equal(result.change, null);
  assert.match(result.reason, /out of scope/);
});

test("two archived changes fail", () => {
  const result = resolveChangeForBranch("branch-per-change", [
    "openspec/changes/archive/2026-11-01-branch-per-change/proposal.md",
    "openspec/changes/archive/2026-11-01-other-change/proposal.md",
  ]);

  assert.equal(result.ok, false);
  assert.match(result.reason, /more than one archived change/);
});

test("in-flight and archived changes together fail", () => {
  const result = resolveChangeForBranch("branch-per-change", [
    "openspec/changes/branch-per-change/proposal.md",
    "openspec/changes/archive/2026-11-01-branch-per-change/proposal.md",
  ]);

  assert.equal(result.ok, false);
  assert.match(result.reason, /not archived/);
});

test("deleting a stale in-flight change folder is not an in-flight change", () => {
  const result = resolveChangeForBranch(
    "cleanup",
    ["openspec/changes/archive/2026-11-01-cleanup/proposal.md", "openspec/changes/stale/proposal.md"],
    { deleted: ["openspec/changes/stale/proposal.md"] },
  );

  assert.equal(result.ok, true);
});
