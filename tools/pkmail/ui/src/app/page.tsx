import { listEnvelopes, listFolders } from "@/lib/himalaya";
import Sidebar from "@/components/sidebar";
import MessageList from "@/components/message-list";
import type { Folder, Envelope } from "@/lib/types";

export const dynamic = "force-dynamic";

interface SearchParams {
  folder?: string;
  account?: string;
  q?: string;
  page?: string;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const folder = params.folder ?? "inbox";
  const account = params.account;
  const page = Number(params.page ?? "1");

  let folders: Folder[] = [];
  let messages: Envelope[] = [];
  try {
    folders = listFolders(account);
  } catch {
    folders = [];
  }
  try {
    messages = listEnvelopes(folder, account, page, 50);
  } catch {
    messages = [];
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — devl.dev inbox-rail pattern */}
      <Sidebar folders={folders} currentFolder={folder} account={account} />

      {/* Message list */}
      <div className="flex-1 flex flex-col min-w-0 border-r" style={{ borderColor: "var(--color-border)" }}>
        {/* Top bar */}
        <div
          className="flex items-center gap-3 px-4 h-12 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--color-text-faint)" }}>
            {folder}
          </span>
          <span className="ml-auto text-xs" style={{ color: "var(--color-text-faint)" }}>
            {messages.length} messages
          </span>
          <a href="/compose" className="btn-primary text-xs py-1.5 px-3">
            + Composer
          </a>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-faint)" }}>
              <div className="text-center">
                <div className="text-4xl mb-3">📭</div>
                <div className="text-sm">Aucun message</div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageList key={msg.id} message={msg} folder={folder} account={account} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
