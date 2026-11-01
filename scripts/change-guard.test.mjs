import assert from "node:assert/strict";
import test from "node:test";
import { resolveChangeForBranch } from "./change-guard.mjs";

test("matching branch passes", () => {
  const result = resolveChangeForBranch("branch-per-change", ["openspec/changes/branch-per-change/proposal.md"]);

  assert.equal(result.ok, true);
  assert.equal(result.change, "branch-per-change");
});

test("mismatched branch fails and names the expected branch", () => {
  const result = resolveChangeForBranch("fix-stuff", ["openspec/changes/branch-per-change/specs/ci/change-guard/spec.md"]);

  assert.equal(result.ok, false);
  assert.equal(result.change, "branch-per-change");
  assert.match(result.reason, /expected|does not match/);
});

test("archived change still passes", () => {
  const result = resolveChangeForBranch("branch-per-change", ["openspec/changes/archive/2026-11-01-branch-per-change/proposal.md"]);

  assert.equal(result.ok, true);
  assert.equal(result.change, "branch-per-change");
});

test("pull request without a change folder is out of scope", () => {
  const result = resolveChangeForBranch("dependabot/npm_and_yarn/vite-8.3.3", ["web/package.json", "pnpm-lock.yaml"]);

  assert.equal(result.ok, true);
  assert.equal(result.change, null);
});

test("two changes in one pull request fail", () => {
  const result = resolveChangeForBranch("branch-per-change", [
    "openspec/changes/branch-per-change/proposal.md",
    "openspec/changes/other-change/tasks.md",
  ]);

  assert.equal(result.ok, false);
  assert.match(result.reason, /more than one change: branch-per-change, other-change/);
});

test("archive path does not count as a second change", () => {
  const result = resolveChangeForBranch("branch-per-change", [
    "openspec/changes/branch-per-change/proposal.md",
    "openspec/changes/archive/2026-11-01-branch-per-change/proposal.md",
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.change, "branch-per-change");
});
