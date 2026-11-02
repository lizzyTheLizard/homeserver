import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const CHANGE_ROOT = "openspec/changes/";
const ARCHIVE_ROOT = "openspec/changes/archive/";
const SPECS_ROOT = "openspec/specs/";
const DATED_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

export function resolveChangeForBranch(branch, paths, { deleted = [] } = {}) {
  const deletedPaths = new Set(deleted.map(normalize));
  const changedPaths = new Set(paths.map(normalize));
  const live = new Set();
  const archived = new Set();
  const deltaSpecs = new Map();

  for (const path of changedPaths) {
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
      if (rest[0] === "specs" && rest.length > 2 && rest.at(-1) === "spec.md") {
        const capability = rest.slice(1, -1).join("/");
        deltaSpecs.set(name, [...(deltaSpecs.get(name) ?? []), capability]);
      }
      continue;
    }

    if (deletedPaths.has(path)) {
      continue;
    }

    const [name] = path.slice(CHANGE_ROOT.length).split("/");
    if (name && name !== "archive") {
      live.add(name);
    }
  }

  if (live.size > 0) {
    const names = [...live].sort();
    return {
      ok: false,
      change: names[0],
      reason: `change '${names.join(", ")}' is not archived; archive it before opening the pull request`,
    };
  }

  if (archived.size === 0) {
    return { ok: true, change: null, reason: "out of scope: no change folder in this pull request" };
  }

  if (archived.size > 1) {
    const names = [...archived].sort().join(", ");
    return { ok: false, change: null, reason: `branch '${branch}' names more than one archived change: ${names}` };
  }

  const [change] = archived;

  if (branch !== change) {
    return {
      ok: false,
      change,
      reason: `branch '${branch}' does not match archived change '${change}'; expected branch '${change}'`,
    };
  }

  const unsynced = [...new Set(deltaSpecs.get(change) ?? [])]
    .sort()
    .map((capability) => `${SPECS_ROOT}${capability}/spec.md`)
    .filter((mainSpec) => !changedPaths.has(mainSpec));

  if (unsynced.length > 0) {
    return {
      ok: false,
      change,
      reason: `main specs were not synced for archived change '${change}': ${unsynced.join(", ")} not changed`,
    };
  }

  return { ok: true, change, reason: `archived change '${change}' matches the branch and its specs are synced` };
}

function main() {
  const headRef = process.env.HEAD_REF;
  const baseRef = process.env.BASE_REF;

  if (!headRef || !baseRef) {
    console.error("change-guard: HEAD_REF and BASE_REF are required");
    process.exitCode = 2;
    return;
  }

  const result = resolveChangeForBranch(headRef, readPaths(baseRef), { deleted: readPaths(baseRef, ["--diff-filter=D"]) });

  if (result.ok) {
    console.log(`change-guard: ok — ${result.reason}`);
    return;
  }

  console.error(`change-guard: ${result.reason}`);
  process.exitCode = 1;
}

function readPaths(baseRef, extraArgs = []) {
  const output = execFileSync("git", ["diff", "--name-only", ...extraArgs, `${baseRef}...HEAD`], { encoding: "utf8" });
  return output.split("\n").filter(Boolean);
}

function normalize(path) {
  return String(path).replace(/^\.\//, "");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
