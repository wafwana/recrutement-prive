"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Recipient = { id: string; name: string | null; email: string; role: string };
type Message = { id: string; body: string; createdAt: string; sender: { id: string; name: string | null; email: string } };
type Conversation = { id: string; subject: string; participants: { user: Recipient }[]; messages: Message[] };

export default function MessageCenter({ currentUserId, recipients }: { currentUserId: string; recipients: Recipient[] }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadConversations = async () => {
    const response = await fetch("/api/messages", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setConversations(data.conversations ?? []);
    setLoading(false);
  };

  const loadConversation = async (id: string) => {
    setSelectedId(id);
    const response = await fetch(`/api/messages?conversationId=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setMessages(data.conversation?.messages ?? []);
      await fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: id }) });
    }
  };

  useEffect(() => { void loadConversations(); }, []);

  const selected = useMemo(() => conversations.find((conversation) => conversation.id === selectedId), [conversations, selectedId]);
  const selectedOther = selected?.participants.find((participant) => participant.user.id !== currentUserId)?.user;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId: selectedId ? undefined : recipientId,
        conversationId: selectedId,
        subject: subject || undefined,
        body,
      }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Impossible d'envoyer le message."); return; }
    setBody("");
    setSubject("");
    if (!selectedId) setRecipientId("");
    await loadConversations();
    if (data.message?.conversationId) await loadConversation(data.message.conversationId);
  };

  return (
    <section className="mx-auto w-[min(1200px,calc(100%-40px))] py-12 md:w-[min(1200px,calc(100%-72px))] md:py-20">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Communication interne</p>
      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><h1 className="font-serif text-5xl">Messagerie.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">Échangez directement avec les candidats, entreprises, consultants et administrateurs autorisés.</p></div>
        <span className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/40">Privée & sécurisée</span>
      </div>

      <div className="mt-10 grid min-h-[620px] gap-px bg-white/10 lg:grid-cols-[360px_1fr]">
        <aside className="bg-[#111] p-6">
          <div className="mb-6"><p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Nouveau message</p>
            <select value={selectedId ? "" : recipientId} onChange={(event) => { setSelectedId(undefined); setRecipientId(event.target.value); }} className="mt-3 w-full border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none">
              <option value="">Choisir un destinataire</option>
              {recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name || recipient.email} — {recipient.role}</option>)}
            </select>
          </div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Conversations</p>
          <div className="mt-3 space-y-2">
            {loading && <p className="py-4 text-sm text-white/35">Chargement…</p>}
            {!loading && conversations.length === 0 && <p className="py-4 text-sm text-white/35">Aucune conversation.</p>}
            {conversations.map((conversation) => {
              const other = conversation.participants.find((participant) => participant.user.id !== currentUserId)?.user;
              const last = conversation.messages[0];
              return <button key={conversation.id} type="button" onClick={() => void loadConversation(conversation.id)} className={`w-full border p-4 text-left transition ${selectedId === conversation.id ? "border-[#c7a15a]/60 bg-white/[0.04]" : "border-white/10 hover:border-white/20"}`}>
                <p className="font-serif text-lg">{other?.name || other?.email || conversation.subject}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">{other?.role}</p>
                <p className="mt-3 truncate text-xs text-white/40">{last?.body || "Nouvelle conversation"}</p>
              </button>;
            })}
          </div>
        </aside>

        <main className="flex flex-col bg-[#0d0d0d] p-6 md:p-8">
          <div className="border-b border-white/10 pb-5"><p className="text-[10px] uppercase tracking-[0.22em] text-[#c7a15a]">{selectedOther ? selectedOther.role : "Nouveau message"}</p><h2 className="mt-2 font-serif text-2xl">{selectedOther?.name || selectedOther?.email || "Choisissez un destinataire"}</h2></div>
          <div className="flex-1 space-y-4 overflow-y-auto py-6">
            {messages.map((message) => <div key={message.id} className={`max-w-[80%] border border-white/10 p-4 ${message.sender.id === currentUserId ? "ml-auto bg-white/[0.04]" : ""}`}><p className="text-sm leading-6 text-white/75">{message.body}</p><p className="mt-2 text-[10px] text-white/30">{new Date(message.createdAt).toLocaleString("fr-FR")}</p></div>)}
            {!selectedId && <p className="py-20 text-center text-sm text-white/30">Sélectionnez une conversation ou choisissez un destinataire pour commencer.</p>}
          </div>
          <form onSubmit={submit} className="border-t border-white/10 pt-5">
            {!selectedId && <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Objet" maxLength={160} className="mb-3 w-full border border-white/10 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-white/25" />}
            <div className="flex gap-3"><textarea value={body} onChange={(event) => setBody(event.target.value)} required maxLength={5000} rows={3} placeholder="Votre message…" className="min-w-0 flex-1 resize-none border border-white/10 bg-transparent px-4 py-3 text-sm leading-6 outline-none placeholder:text-white/25" /><button type="submit" disabled={!selectedId && !recipientId} className="self-end border border-[#c7a15a]/60 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black disabled:cursor-not-allowed disabled:opacity-30">Envoyer</button></div>
            {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
          </form>
        </main>
      </div>
    </section>
  );
}
