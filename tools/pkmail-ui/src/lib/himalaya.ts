import { execSync } from "child_process";
import path from "path";
import type { Envelope, Message, Folder } from "./types";

const HIMALAYA_CONFIG = path.resolve(
  process.cwd(),
  "../.himalaya/config.toml"
);

interface RawAddress {
  name?: string;
  addr?: string;
  address?: string;
  display?: string;
}

interface RawEnvelope {
  id?: string | number;
  subject?: string;
  from?: RawAddress[];
  date?: string;
  flags?: string[];
  hasAttachment?: boolean;
  snippet?: string;
}

interface RawEnvelopeList {
  envelopes?: RawEnvelope[];
}

interface RawMessage extends RawEnvelope {
  to?: RawAddress[];
  text?: string;
  html?: string;
  attachments?: RawAttachment[];
}

interface RawAttachment {
  id?: string | number;
  filename?: string;
  name?: string;
  size?: number;
  mime?: string;
}

interface RawFolder {
  id?: string;
  name?: string;
  total?: number;
  unseen?: number;
}

function run(args: string[], account?: string): string {
  const cmd = ["himalaya", "-c", HIMALAYA_CONFIG];
  if (account) cmd.push("-a", account);
  cmd.push("--json", ...args);
  return execSync(cmd.join(" "), {
    encoding: "utf-8",
    timeout: 30_000,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function runJson<T>(args: string[], account?: string): T {
  const raw = run(args, account);
  return JSON.parse(raw) as T;
}

function mapAddress(a: RawAddress): { name: string; addr: string } {
  return {
    name: a.name || a.display || "",
    addr: a.addr || a.address || "",
  };
}

function mapEnvelope(e: RawEnvelope): Envelope {
  return {
    id: String(e.id ?? ""),
    subject: e.subject || "(sans objet)",
    from: (e.from ?? []).map(mapAddress),
    date: e.date || "",
    flags: e.flags ?? [],
    hasAttachment: e.hasAttachment ?? false,
    snippet: e.snippet || "",
  };
}

export function listEnvelopes(
  folder = "inbox",
  account?: string,
  page = 1,
  pageSize = 50
): Envelope[] {
  const data = runJson<RawEnvelopeList>(
    ["envelope", "list", "-m", folder, "--page", String(page), "--page-size", String(pageSize)],
    account
  );
  return (data.envelopes ?? []).map(mapEnvelope);
}

export function getMessage(
  id: string,
  folder = "inbox",
  account?: string
): Message {
  const data = runJson<RawMessage>(
    ["message", "read", id, "-m", folder],
    account
  );
  return {
    id: String(data.id ?? id),
    subject: data.subject || "(sans objet)",
    from: (data.from ?? []).map(mapAddress),
    to: (data.to ?? []).map(mapAddress),
    date: data.date || "",
    flags: data.flags ?? [],
    text: data.text || "",
    html: data.html || "",
    attachments: (data.attachments ?? []).map((a) => ({
      id: String(a.id),
      filename: a.filename || a.name || "",
      size: a.size ?? 0,
      mime: a.mime || "",
    })),
  };
}

export function listFolders(account?: string): Folder[] {
  const data = runJson<RawFolder[]>(["mailbox", "list"], account);
  return (Array.isArray(data) ? data : []).map((f) => ({
    id: String(f.id || f.name || ""),
    name: f.name || f.id || "",
    total: f.total ?? 0,
    unseen: f.unseen ?? 0,
  }));
}

export function searchEnvelopes(
  query: string,
  folder = "inbox",
  account?: string
): Envelope[] {
  const data = runJson<RawEnvelopeList>(
    ["envelope", "search", query, "-m", folder],
    account
  );
  return (data.envelopes ?? []).map(mapEnvelope);
}

export function sendMessage(
  to: string,
  subject: string,
  body: string,
  account?: string
): void {
  run(
    ["message", "compose", "--to", to, "--subject", subject, "--body", body, "--send"],
    account
  );
}

export function moveMessage(
  id: string,
  from: string,
  to: string,
  account?: string
): void {
  run(["message", "move", id, "--from", from, "--to", to], account);
}

export function deleteMessage(
  id: string,
  folder = "inbox",
  account?: string
): void {
  run(["message", "delete", "-m", folder, id], account);
}

export function flagMessage(
  id: string,
  folder = "inbox",
  account?: string
): void {
  run(["flag", "add", "-m", folder, "--flag", "flagged", id], account);
}

export function unflagMessage(
  id: string,
  folder = "inbox",
  account?: string
): void {
  run(["flag", "remove", "-m", folder, "--flag", "flagged", id], account);
}
