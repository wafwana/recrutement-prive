"use client";

import BackButton from "@/components/navigation/BackButton";
import { useEffect, useMemo, useState } from "react";

type Company = { id: string; name: string; country: string | null };
type Job = { id: string; title: string; companyId: string; missionType: string | null };
type Presentation = { id: string; missionId: string; companyId: string; candidateId: string; presentedAt: string; state: string; financialConditionStatus: string; mission: { title: string }; company: { name: string }; candidate: { headline: string | null; user: { name: string | null; email: string } } };
type Invoice = {
  id: string; invoiceNumber: string; description: string; status: string; amountHt: number; amountTva: number; amountTtc: number; currency: string; issuedAt: string | null; dueAt: string | null; paidAt: string | null;
  company: { id: string; name: string; country: string | null }; job: { id: string; title: string } | null;
  presentation: { id: string; presentedAt: string; candidate: { id: string; headline: string | null; user: { name: string | null; email: string } } } | null;
  payments: { id: string; amount: number; paidAt: string; method: string; reference: string | null }[];
};

const eur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export default function FacturationPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [jobId, setJobId] = useState("");
  const [presentationId, setPresentationId] = useState("");
  const [amountHt, setAmountHt] = useState("");
  const [vatRate, setVatRate] = useState("20");
  const [description, setDescription] = useState("Honoraires de recrutement");
  const [paymentDays, setPaymentDays] = useState("30");
  const [issueNow, setIssueNow] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/owner/facturation", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCompanies(data.companies || []);
      setJobs(data.jobs || []);
      setPresentations(data.presentations || []);
      setInvoices(data.invoices || []);
    } else setMessage(data.error || "Accès refusé.");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const companyJobs = useMemo(() => jobs.filter((j) => !companyId || j.companyId === companyId), [jobs, companyId]);
  const companyPresentations = useMemo(() => presentations.filter((p) => !companyId || p.companyId === companyId), [presentations, companyId]);
  const selectedPresentation = presentations.find((p) => p.id === presentationId);
  const totalTtc = (Number(amountHt) || 0) * (1 + (Number(vatRate) || 0) / 100);

  async function createInvoice() {
    setSaving(true); setMessage("");
    const res = await fetch("/api/owner/facturation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CREATE_INVOICE", companyId, jobId: jobId || null, presentationId: presentationId || null,
        amountHt: Number(amountHt), vatRate: Number(vatRate), description, paymentDays: Number(paymentDays), issueNow,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setMessage(data.error || "Création impossible."); return; }
    setMessage(`Facture ${data.invoice.invoiceNumber} créée.`);
    setAmountHt(""); setPresentationId(""); void load();
  }

  async function recordPayment(invoice: Invoice) {
    const remaining = Math.max(0, invoice.amountTtc - invoice.payments.reduce((s, p) => s + p.amount, 0));
    const raw = window.prompt(`Montant encaissé (solde : ${eur(remaining)})`);
    if (!raw) return;
    const amount = Number(raw.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) return;
    const res = await fetch("/api/owner/facturation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "RECORD_PAYMENT", invoiceId: invoice.id, amount, method: "VIREMENT" }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? `Encaissement enregistré sur ${invoice.invoiceNumber}.` : (data.error || "Paiement impossible."));
    if (res.ok) void load();
  }

  const totals = invoices.reduce((a, i) => {
    const paid = i.payments.reduce((s, p) => s + p.amount, 0);
    a.ht += i.amountHt; a.ttc += i.amountTtc; a.paid += paid; return a;
  }, { ht: 0, ttc: 0, paid: 0 });

  if (loading) return <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-20"><BackButton /><p className="mt-8 text-white/50">Chargement de la facturation…</p></section>;

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:w-[min(1280px,calc(100%-72px))] md:py-20">
      <BackButton />
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Owner · Honoraires & facturation</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Les honoraires dus par les entreprises.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">Chaque facture peut être rattachée à une mission et à une présentation de candidat. Les encaissements sont tracés et préparés pour la pré-comptabilité.</p>
        </div>
      </div>

      {message && <p className="mt-6 border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">{message}</p>}

      <div className="mt-8 grid gap-px bg-white/10 sm:grid-cols-3">
        {[["Honoraires HT", eur(totals.ht)], ["Facturé TTC", eur(totals.ttc)], ["Encaissé", eur(totals.paid)]].map(([label, value]) =>
          <div key={label} className="bg-[#111] p-6"><span className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</span><p className="mt-3 font-serif text-2xl text-[#c7a15a]">{value}</p></div>
        )}
      </div>

      <div className="mt-8 border border-white/10 bg-[#111] p-6">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Nouvelle facture</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-white/45">Entreprise
            <select value={companyId} onChange={(e) => { setCompanyId(e.target.value); setJobId(""); setPresentationId(""); }} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white">
              <option value="">Sélectionner</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/45">Mission / offre
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white">
              <option value="">Aucune</option>{companyJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/45">Candidat présenté
            <select value={presentationId} onChange={(e) => setPresentationId(e.target.value)} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white">
              <option value="">Aucune présentation</option>{companyPresentations.map(p => <option key={p.id} value={p.id}>{p.candidate.user.name || p.candidate.user.email} · {p.mission.title}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/45">Montant HT
            <input type="number" min="0" step="0.01" value={amountHt} onChange={(e) => setAmountHt(e.target.value)} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white" />
          </label>
          <label className="text-xs text-white/45">TVA (%)
            <input type="number" min="0" max="100" step="0.1" value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white" />
          </label>
          <label className="text-xs text-white/45">Échéance (jours)
            <input type="number" min="0" value={paymentDays} onChange={(e) => setPaymentDays(e.target.value)} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white" />
          </label>
          <label className="text-xs text-white/45 lg:col-span-2">Libellé
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white" />
          </label>
        </div>
        {selectedPresentation && <p className="mt-4 text-xs text-white/40">Présentation : {selectedPresentation.candidate.user.name || selectedPresentation.candidate.user.email} · {selectedPresentation.mission.title} · {new Date(selectedPresentation.presentedAt).toLocaleDateString("fr-FR")}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-white/55"><input type="checkbox" checked={issueNow} onChange={(e) => setIssueNow(e.target.checked)} /> Émettre immédiatement</label>
          <span className="text-xs text-white/40">TTC calculé : <strong className="text-white/70">{eur(totalTtc)}</strong></span>
          <button onClick={() => void createInvoice()} disabled={saving || !companyId || !amountHt} className="bg-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.18em] text-black disabled:opacity-40">{saving ? "Création…" : "Créer la facture"}</button>
        </div>
      </div>

      <div className="mt-10 border border-white/10">
        <div className="border-b border-white/10 bg-[#111] px-5 py-4 text-[10px] uppercase tracking-[0.18em] text-white/35">Suivi des honoraires</div>
        <div className="divide-y divide-white/10">
          {invoices.map(i => {
            const paid = i.payments.reduce((s, p) => s + p.amount, 0);
            const remaining = Math.max(0, i.amountTtc - paid);
            return <article key={i.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm text-white/85">{i.invoiceNumber} · {i.company.name}</p>
                  <p className="mt-1 text-xs text-white/40">{i.description}{i.job ? ` · ${i.job.title}` : ""}{i.presentation ? ` · ${i.presentation.candidate.user.name || i.presentation.candidate.user.email}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-5 text-xs">
                  <span className="text-white/55">HT {eur(i.amountHt)}</span>
                  <span className="text-white/75">TTC {eur(i.amountTtc)}</span>
                  <span className={remaining > 0 ? "text-amber-300" : "text-emerald-300"}>{remaining > 0 ? `Reste ${eur(remaining)}` : "PAYÉ"}</span>
                  <span className="text-white/35">{i.status}</span>
                  {remaining > 0 && <button onClick={() => void recordPayment(i)} className="border border-[#c7a15a]/50 px-3 py-2 text-[10px] uppercase tracking-wider text-[#c7a15a]">Enregistrer un encaissement</button>}
                </div>
              </div>
              {i.dueAt && <p className="mt-3 text-[10px] uppercase tracking-wider text-white/25">Échéance : {new Date(i.dueAt).toLocaleDateString("fr-FR")}</p>}
            </article>;
          })}
          {!invoices.length && <p className="px-5 py-12 text-center text-sm text-white/35">Aucune facture enregistrée.</p>}
        </div>
      </div>
    </section>
  );
}
