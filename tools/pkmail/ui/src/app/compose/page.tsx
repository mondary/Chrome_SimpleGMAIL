import { sendMessage } from "@/lib/himalaya";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ComposePage() {
  async function handleSend(formData: FormData) {
    "use server";
    const to = String(formData.get("to") ?? "");
    const subject = String(formData.get("subject") ?? "");
    const body = String(formData.get("body") ?? "");
    const account = String(formData.get("account") ?? "");
    if (!to) return;
    sendMessage(to, subject, body, account || undefined);
    redirect("/");
  }

  return (
    <div className="flex h-screen items-center justify-center" style={{ background: "var(--color-bg)" }}>
      <div
        className="w-full max-w-2xl rounded-xl p-8"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold">Nouveau message</h1>
          <a href="/" className="btn-ghost text-xs">✕ Annuler</a>
        </div>

        <form action={handleSend} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>
              À
            </label>
            <input
              name="to"
              type="email"
              required
              placeholder="destinataire@example.com"
              className="compose-input"
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>
              Objet
            </label>
            <input
              name="subject"
              type="text"
              placeholder="Sujet du message"
              className="compose-input"
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>
              Compte
            </label>
            <select name="account" className="compose-input">
              <option value="">Par défaut</option>
              <option value="mondary">Mondary Design</option>
              <option value="pouark">Pouark</option>
              <option value="gmail">Gmail</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>
              Message
            </label>
            <textarea
              name="body"
              rows={12}
              placeholder="Votre message…"
              className="compose-input"
              style={{ fontFamily: "var(--font-mono)", resize: "vertical" }}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <a href="/" className="btn-ghost">Annuler</a>
            <button type="submit" className="btn-primary">Envoyer</button>
          </div>
        </form>
      </div>
    </div>
  );
}
