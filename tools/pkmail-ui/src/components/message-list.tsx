import type { Envelope } from "@/lib/types";

const AVATAR_COLORS = [
  "#C64A12", "#2E6B4E", "#96662B", "#CC7A3E",
  "#A85E2E", "#1A73E8", "#E753B9", "#28BCA3",
  "#9B6BE8", "#FF8C1A",
];

function avatarColorFor(addr: string): string {
  let hash = 0;
  for (const ch of addr) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function senderInitials(name: string, addr: string): string {
  if (name) {
    const parts = name.split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return addr.slice(0, 2).toUpperCase();
}

export default function MessageList({
  message,
  folder,
  account,
}: {
  message: Envelope;
  folder: string;
  account?: string;
}) {
  const sender = message.from[0];
  const senderName = sender?.name || sender?.addr || "?";
  const senderAddr = sender?.addr || "";
  const unread = !message.flags.includes("\\Seen");
  const starred = message.flags.includes("\\Flagged");
  const color = avatarColorFor(senderAddr);
  const snippetText = message.snippet
    ? (message.snippet.length > 80 ? message.snippet.slice(0, 80) + "…" : message.snippet)
    : "";

  return (
    <a
      href={`/message/${message.id}?folder=${encodeURIComponent(folder)}${account ? `&account=${account}` : ""}`}
      className="msg-row block"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: color, color: "#fff" }}
      >
        {senderInitials(senderName, senderAddr)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={`text-sm truncate ${unread ? "font-bold" : ""}`}
            style={{ color: unread ? "var(--color-text)" : "var(--color-text-muted)" }}
          >
            {senderName}
          </span>
          <span className="text-xs shrink-0 ml-auto" style={{ color: "var(--color-text-faint)" }}>
            {message.date}
          </span>
        </div>
        <div
          className={`text-sm truncate mt-0.5 ${unread ? "font-semibold" : ""}`}
          style={{ color: "var(--color-text)" }}
        >
          {message.subject}
        </div>
        {snippetText && (
          <div className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
            {snippetText}
          </div>
        )}
      </div>

      {/* Indicators */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        {unread && <div className="unread-dot" />}
        {starred && <span className="text-xs">⭐</span>}
        {message.hasAttachment && <span className="text-xs">📎</span>}
      </div>
    </a>
  );
}
