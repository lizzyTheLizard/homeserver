import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const CHANGE_ROOT = "openspec/changes/";
const ARCHIVE_ROOT = "openspec/changes/archive/";
const SPECS_ROOT = "openspec/specs/";
const DATED_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

export function resolveChangeForBranch(branch, paths) {
  const live = new Set();
  const archived = new Set();
  const archivedWithDeltas = new Set();
  let specsTouched = false;

  for (const raw of paths) {
    const path = String(raw).replace(/^\.\//, "");

    if (path.startsWith(SPECS_ROOT)) {
      specsTouched = true;
    }

    if (!path.startsWith(CHANGE_ROOT)) {
      continue;
    }

    if (path.startsWith(ARCHIVE_ROOT)) {
      const [folder, ...rest] = path.slice(ARCHIVE_ROOT.length).split("/");
      const name = folder ? folder.replace(DATED_PREFIX, "") : "";
      if (!name) {
        continue;
      }
      archived.add(name);
      if (rest[0] === "specs" && rest.length > 1) {
        archivedWithDeltas.add(name);
      }
      continue;
    }

    const [name] = path.slice(CHANGE_ROOT.length).split("/");
    if (name && name !== "archive") {
      live.add(name);
    }
  }

  if (live.size > 0) {
    const names = [...live].sort().join(", ");
    return {
      ok: false,
      change: [...live].sort()[0],
      reason: `change '${names}' is not archived; archive it before opening the pull request`,
    };
  }

  if (archived.size === 0) {
    return { ok: true, change: null, reason: "no change folder in this pull request" };
  }

  if (archived.size > 1) {
    const names = [...archived].sort().join(", ");
    return { ok: false, change: null, reason: `branch '${branch}' names more than one archived change: ${names}` };
  }

  const [change] = archived;

  if (branch !== change) {
    return { ok: false, change, reason: `branch '${branch}' does not match archived change '${change}'` };
  }

  if (archivedWithDeltas.has(change) && !specsTouched) {
    return {
      ok: false,
      change,
      reason: `main specs were not synced: archived change '${change}' carries spec deltas but nothing under '${SPECS_ROOT}' changed`,
    };
  }

  return { ok: true, change, reason: `archived change '${change}' matches the branch and its specs are synced` };
}

function readChangedPaths(baseRef) {
  const output = execFileSync("git", ["diff", "--name-only", `${baseRef}...HEAD`], { encoding: "utf8" });
  return output.split("\n").filter(Boolean);
}

function main() {
  const headRef = process.env.HEAD_REF;
  const baseRef = process.env.BASE_REF;

  if (!headRef || !baseRef) {
    console.error("change-guard: HEAD_REF and BASE_REF are required");
    process.exitCode = 2;
    return;
  }

  const result = resolveChangeForBranch(headRef, readChangedPaths(baseRef));

  if (result.ok) {
    console.log(`change-guard: ok — ${result.reason}`);
    return;
  }

  console.error(`change-guard: ${result.reason}`);
  if (result.change && result.change !== headRef) {
    console.error(`change-guard: expected branch '${result.change}'`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
