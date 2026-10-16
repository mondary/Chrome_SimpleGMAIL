import { getMessage, listFolders } from "@/lib/himalaya";
import Sidebar from "@/components/sidebar";
import type { Folder, Message } from "@/lib/types";

export const dynamic = "force-dynamic";

interface MessageParams {
  id: string;
}

interface SearchParams {
  folder?: string;
  account?: string;
}

function senderInitials(name: string): string {
  const parts = name.split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default async function MessagePage({
  params,
  searchParams,
}: {
  params: Promise<MessageParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const folder = sp.folder ?? "inbox";
  const account = sp.account;

  let folders: Folder[] = [];
  let message: Message | null = null;
  try {
    folders = listFolders(account);
  } catch {
    folders = [];
  }
  try {
    message = getMessage(id, folder, account);
  } catch {
    message = null;
  }

  const sender = message?.from?.[0];
  const senderName = sender?.name || sender?.addr || "?";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar folders={folders} currentFolder={folder} account={account} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 h-14 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <a
            href={`/?folder=${encodeURIComponent(folder)}${account ? `&account=${account}` : ""}`}
            className="btn-ghost text-xs"
          >
            ← Retour
          </a>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate">
              {message?.subject ?? "Message introuvable"}
            </h1>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs">↩ Répondre</button>
            <button className="btn-ghost text-xs">↪ Transférer</button>
            <button className="btn-ghost text-xs">📦 Archiver</button>
          </div>
        </div>

        {/* Message body */}
        <div className="flex-1 overflow-y-auto">
          {message ? (
            <div className="max-w-3xl mx-auto px-6 py-6">
              {/* Meta */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                  {senderInitials(senderName)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{senderName}</div>
                  <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {sender?.addr} · {message.date}
                  </div>
                </div>
                {message.flags.includes("\\Flagged") && (
                  <span className="ml-2">⭐</span>
                )}
              </div>

              {/* Labels */}
              {message.flags.length > 0 && (
                <div className="flex gap-1 mb-4">
                  {message.flags
                    .filter((f) => !f.startsWith("\\"))
                    .map((f) => (
                      <span
                        key={f}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--color-bg-hover)",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {f}
                      </span>
                    ))}
                </div>
              )}

              {/* Body */}
              {message.html ? (
                <iframe
                  srcDoc={message.html}
                  className="w-full border rounded-lg"
                  style={{
                    borderColor: "var(--color-border)",
                    minHeight: "60vh",
                    background: "#fff",
                  }}
                  sandbox="allow-same-origin"
                  title="Message body"
                />
              ) : (
                <pre
                  className="text-sm whitespace-pre-wrap leading-relaxed"
                  style={{ color: "var(--color-text)" }}
                >
                  {message.text || "(corps vide)"}
                </pre>
              )}

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>
                    Pièces jointes ({message.attachments.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {message.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                        style={{
                          background: "var(--color-bg-hover)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        📎 {att.filename}
                        <span style={{ color: "var(--color-text-faint)" }}>
                          ({Math.round(att.size / 1024)}KB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-faint)" }}>
              <div className="text-center">
                <div className="text-4xl mb-3">❌</div>
                <div className="text-sm">Message introuvable</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
