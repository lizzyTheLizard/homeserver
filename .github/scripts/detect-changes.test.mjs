import assert from "node:assert/strict";
import test from "node:test";
import { detectChanges, everything } from "./detect-changes.mjs";

test("a change inside a service folder reports only that service", () => {
  const changed = detectChanges(["services/web/app/page.tsx", "services/web/package.json"]);

  assert.deepEqual(changed, { ...everything(false), web: true });
});

test("every service folder maps to its own service", () => {
  for (const service of ["web", "assistant", "whatsapp", "wichteln", "dev-machine"]) {
    assert.deepEqual(detectChanges([`services/${service}/Dockerfile`]), { ...everything(false), [service]: true });
  }
});

test("shared workspace files report every service but not the infrastructure", () => {
  for (const path of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".nvmrc"]) {
    assert.deepEqual(detectChanges([path]), { ...everything(true), infrastructure: false }, path);
  }
});

test("the pipeline definition reports everything", () => {
  for (const path of [
    ".github/workflows/pipeline.yml",
    ".github/workflows/service.yml",
    ".github/actions/setup/action.yml",
    ".github/actions/deploy-service/action.yml",
    ".github/scripts/detect-changes.mjs",
  ]) {
    assert.deepEqual(detectChanges([path]), everything(true), path);
  }
});

test("a change to the stack definition reports the infrastructure", () => {
  const changed = detectChanges(["infrastructure/docker-compose.yml"]);

  assert.deepEqual(changed, { ...everything(false), infrastructure: true });
});

test("changes outside services, infrastructure, workspace files and the pipeline report nothing", () => {
  const changed = detectChanges([
    "openspec/specs/pipeline/spec.md",
    "CLAUDE.md",
    ".github/workflows/dependabot-auto-merge.yml",
    ".github/dependabot.yml",
    "services/README.md",
  ]);

  assert.deepEqual(changed, everything(false));
});

test("several changes combine", () => {
  const changed = detectChanges(["./services/assistant/src/index.ts", "infrastructure/nginx/nginx.conf"]);

  assert.deepEqual(changed, { ...everything(false), assistant: true, infrastructure: true });
});
