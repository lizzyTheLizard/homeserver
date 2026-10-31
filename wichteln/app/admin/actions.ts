"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { generatePassword, newId, updateDb, type User } from "@/lib/store";
import type { FormState } from "../actions";

function parseNames(raw: string) {
  return raw
    .split(/[\n,;]/)
    .map((n) => n.trim())
    .filter(Boolean);
}

function newUser(name: string): User {
  return { id: newId(), name, password: generatePassword(), wish: null, selectedWishOf: null };
}

function findDuplicate(names: string[]) {
  const seen = new Set<string>();
  for (const n of names) {
    const key = n.toLowerCase();
    if (seen.has(key)) return n;
    seen.add(key);
  }
  return null;
}

export async function createGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const names = parseNames(String(formData.get("names") ?? ""));
  if (!name) return { error: "Bitte einen Gruppennamen eingeben." };
  if (names.length < 2) return { error: "Bitte mindestens zwei Teilnehmende eingeben." };
  const dup = findDuplicate(names);
  if (dup) return { error: `Der Name „${dup}“ kommt mehrfach vor.` };

  const id = newId();
  await updateDb((db) => {
    db.groups.push({
      id,
      name,
      phase: "wishes",
      createdAt: new Date().toISOString(),
      users: names.map(newUser),
    });
  });
  revalidatePath("/admin");
  redirect(`/admin/${id}`);
}

export async function addParticipants(groupId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const names = parseNames(String(formData.get("names") ?? ""));
  if (names.length === 0) return { error: "Bitte mindestens einen Namen eingeben." };

  const result = await updateDb((db): FormState => {
    const group = db.groups.find((g) => g.id === groupId);
    if (!group) return { error: "Gruppe nicht gefunden." };
    if (group.phase !== "wishes") return { error: "In Phase 2 können keine Teilnehmenden mehr hinzugefügt werden." };
    const dup = findDuplicate([...group.users.map((u) => u.name), ...names]);
    if (dup) return { error: `Der Name „${dup}“ ist bereits vorhanden.` };
    group.users.push(...names.map(newUser));
    return { ok: `${names.length} Teilnehmende hinzugefügt.` };
  });
  revalidatePath(`/admin/${groupId}`);
  return result;
}

export async function removeParticipant(groupId: string, userId: string) {
  await requireAdmin();
  await updateDb((db) => {
    const group = db.groups.find((g) => g.id === groupId);
    if (!group || group.phase !== "wishes") return;
    group.users = group.users.filter((u) => u.id !== userId);
  });
  revalidatePath(`/admin/${groupId}`);
}

export async function startSelection(groupId: string) {
  await requireAdmin();
  await updateDb((db) => {
    const group = db.groups.find((g) => g.id === groupId);
    if (!group || group.phase !== "wishes") return;
    if (group.users.length < 2 || group.users.some((u) => !u.wish)) return;
    group.phase = "selection";
  });
  revalidatePath(`/admin/${groupId}`);
}

export async function deleteGroup(groupId: string) {
  await requireAdmin();
  await updateDb((db) => {
    db.groups = db.groups.filter((g) => g.id !== groupId);
  });
  revalidatePath("/admin");
  redirect("/admin");
}
