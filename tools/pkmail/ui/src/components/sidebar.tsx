import type { Folder } from "@/lib/types";

const FOLDER_ICONS: Record<string, string> = {
  inbox: "📥",
  sent: "📤",
  drafts: "📝",
  trash: "🗑️",
  archive: "📦",
  spam: "⚠️",
  "[Gmail]/Sent Mail": "📤",
  "[Gmail]/Drafts": "📝",
  "[Gmail]/Trash": "🗑️",
  "[Gmail]/All Mail": "📦",
  "[Gmail]/Spam": "⚠️",
  "[Gmail]/Starred": "⭐",
  "[Gmail]/Important": "❗",
};

function folderIcon(name: string): string {
  return FOLDER_ICONS[name] ?? FOLDER_ICONS[`[Gmail]/${name}`] ?? "📁";
}

export default function Sidebar({
  folders,
  currentFolder,
  account,
}: {
  folders: Folder[];
  currentFolder: string;
  account?: string;
}) {
  return (
    <aside
      className="w-56 shrink-0 flex flex-col h-full overflow-y-auto"
      style={{ background: "var(--color-bg-sidebar)" }}
    >
      {/* Brand */}
      <div className="px-4 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📧</span>
          <span className="text-sm font-bold tracking-wider" style={{ color: "var(--color-text-inverse)" }}>
            PKMAIL
          </span>
        </div>
        {account && (
          <div className="text-xs mt-1" style={{ color: "var(--color-text-faint)" }}>
            {account}
          </div>
        )}
      </div>

      {/* Folder list */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {folders.map((f) => {
          const isActive = f.id === currentFolder || f.name === currentFolder;
          return (
            <a
              key={f.id}
              href={`/?folder=${encodeURIComponent(f.id)}${account ? `&account=${account}` : ""}`}
              className={`sidebar-item ${isActive ? "active" : ""}`}
              style={
                isActive
                  ? { background: "var(--color-bg-active)", color: "var(--color-accent)" }
                  : { color: "var(--color-text-muted)" }
              }
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-sm">{folderIcon(f.name)}</span>
                <span className="truncate text-[13px]">{f.name}</span>
              </span>
              <span className="sidebar-count">{f.total}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t text-xs" style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--color-text-faint)" }}>
        PKMail CLI
      </div>
    </aside>
  );
}
