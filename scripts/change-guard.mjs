import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const CHANGE_ROOT = "openspec/changes/";
const ARCHIVE_ROOT = "openspec/changes/archive/";
const DATED_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

export function resolveChangeForBranch(branch, paths) {
  const changes = new Set();

  for (const path of paths) {
    const normalized = String(path).replace(/^\.\//, "");
    if (!normalized.startsWith(CHANGE_ROOT)) {
      continue;
    }
    if (normalized.startsWith(ARCHIVE_ROOT)) {
      const archived = normalized.slice(ARCHIVE_ROOT.length).split("/")[0];
      if (archived) {
        changes.add(archived.replace(DATED_PREFIX, ""));
      }
      continue;
    }
    const name = normalized.slice(CHANGE_ROOT.length).split("/")[0];
    if (name && name !== "archive") {
      changes.add(name);
    }
  }

  if (changes.size === 0) {
    return { ok: true, change: null, reason: "no change folder in this pull request" };
  }

  if (changes.size > 1) {
    const names = [...changes].sort().join(", ");
    return { ok: false, change: null, reason: `branch '${branch}' names more than one change: ${names}` };
  }

  const [change] = changes;
  if (branch === change) {
    return { ok: true, change, reason: `branch matches change '${change}'` };
  }

  return { ok: false, change, reason: `branch '${branch}' does not match change '${change}'` };
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
  if (result.change) {
    console.error(`change-guard: expected branch '${result.change}'`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
