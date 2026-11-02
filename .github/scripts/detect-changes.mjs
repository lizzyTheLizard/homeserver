import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const SERVICES = ["web", "assistant", "whatsapp", "wichteln", "dev-machine"];
export const TARGETS = [...SERVICES, "infrastructure"];

const SHARED_WORKSPACE_FILES = new Set(["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".nvmrc"]);
const PIPELINE_FILES = new Set([".github/workflows/pipeline.yml", ".github/workflows/service.yml"]);
const PIPELINE_FOLDERS = [".github/actions/", ".github/scripts/"];
const ZERO_SHA = /^0+$/;

export function detectChanges(paths) {
  const changed = everything(false);

  for (const raw of paths) {
    const path = String(raw).replace(/^\.\//, "");

    if (PIPELINE_FILES.has(path) || PIPELINE_FOLDERS.some((folder) => path.startsWith(folder))) {
      return everything(true);
    }

    if (SHARED_WORKSPACE_FILES.has(path)) {
      for (const service of SERVICES) {
        changed[service] = true;
      }
      continue;
    }

    if (path.startsWith("infrastructure/")) {
      changed.infrastructure = true;
      continue;
    }

    const [root, service] = path.split("/");
    if (root === "services" && SERVICES.includes(service)) {
      changed[service] = true;
    }
  }

  return changed;
}

export function everything(value) {
  return Object.fromEntries(TARGETS.map((target) => [target, value]));
}

function main() {
  const changed = resolveFromEvent(process.env);

  for (const target of TARGETS) {
    console.log(`detect-changes: ${target}=${changed[target]}`);
  }

  if (process.env.GITHUB_OUTPUT) {
    const lines = TARGETS.map((target) => `${target}=${changed[target]}`);
    appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
  }
}

function resolveFromEvent(env) {
  const event = env.GITHUB_EVENT_NAME;

  if (event === "pull_request") {
    if (!env.BASE_REF) {
      throw new Error("detect-changes: BASE_REF is required for a pull request");
    }
    return detectChanges(changedPaths(`${env.BASE_REF}...HEAD`));
  }

  if (event === "push") {
    const before = env.BEFORE_SHA ?? "";
    if (!before || ZERO_SHA.test(before) || !commitExists(before)) {
      console.log("detect-changes: no comparable previous commit, reporting everything as changed");
      return everything(true);
    }
    return detectChanges(changedPaths(`${before}..${env.GITHUB_SHA ?? "HEAD"}`));
  }

  console.log(`detect-changes: event '${event}' reports everything as changed`);
  return everything(true);
}

function changedPaths(range) {
  const output = execFileSync("git", ["diff", "--name-only", range], { encoding: "utf8" });
  return output.split("\n").filter(Boolean);
}

function commitExists(sha) {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
