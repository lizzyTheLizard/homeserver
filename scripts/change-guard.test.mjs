import assert from "node:assert/strict";
import test from "node:test";
import { resolveChangeForBranch } from "./change-guard.mjs";

test("unarchived change fails", () => {
  const result = resolveChangeForBranch("branch-per-change", ["openspec/changes/branch-per-change/proposal.md"]);

  assert.equal(result.ok, false);
  assert.match(result.reason, /not archived/);
});

test("archived change with synced specs passes", () => {
  const result = resolveChangeForBranch("branch-per-change", [
    "openspec/changes/archive/2026-11-01-branch-per-change/specs/ci/change-guard/spec.md",
    "openspec/specs/ci/change-guard/spec.md",
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.change, "branch-per-change");
});

test("mismatched branch fails", () => {
  const result = resolveChangeForBranch("fix-stuff", [
    "openspec/changes/archive/2026-11-01-branch-per-change/specs/ci/change-guard/spec.md",
    "openspec/specs/ci/change-guard/spec.md",
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.change, "branch-per-change");
  assert.match(result.reason, /does not match/);
});

test("archived change without synced specs fails", () => {
  const result = resolveChangeForBranch("branch-per-change", [
    "openspec/changes/archive/2026-11-01-branch-per-change/specs/ci/change-guard/spec.md",
  ]);

  assert.equal(result.ok, false);
  assert.match(result.reason, /not synced/);
});

test("archived change without deltas passes without spec changes", () => {
  const result = resolveChangeForBranch("quick-fix", ["openspec/changes/archive/2026-11-01-quick-fix/proposal.md"]);

  assert.equal(result.ok, true);
  assert.equal(result.change, "quick-fix");
});

test("pull request without a change folder is out of scope", () => {
  const result = resolveChangeForBranch("dependabot/npm_and_yarn/vite-8.3.3", ["web/package.json", "pnpm-lock.yaml"]);

  assert.equal(result.ok, true);
  assert.equal(result.change, null);
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
