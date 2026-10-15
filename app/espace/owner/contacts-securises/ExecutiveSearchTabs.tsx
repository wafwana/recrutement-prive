"use client";

import Link from "next/link";
import { useState } from "react";
import AuthorizationQueue from "./AuthorizationQueue";

type TabId = "overview" | "presentations" | "meetings" | "authorizations" | "decisions" | "outreach";

type PresentationRow = {
  id: string;
  candidateAlias: string | null;
  companyAlias: string | null;
  missionTitle: string;
  state: string;
  presentedAt: string;
  totalContacts: number;
  completedContacts: number;
  decisionRequired: boolean;
};

type MeetingRow = {
  id: string;
  candidateAlias: string | null;
  companyAlias: string | null;
  missionTitle: string;
  status: string;
  channel: string;
  createdAt: string;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number;
  priceTtc: number;
  paymentStatus: string;
  decisionRequired: boolean;
  decisionStatus: string;
};

type OutreachRow = {
  id: string;
  recipientType: string;
  status: string;
  source: string | null;
  campaignKey: string;
  createdAt: string;
  sentAt: string | null;
  repliedAt: string | null;
};

type Props = {
  counts: {
    pendingOutreach: number;
    sentOutreach: number;
    openMeetings: number;
    completedMeetings: number;
    decisionsRequired: number;
  };
  authorizations: { id: string; alias: string | null; channel: string; createdAt: string }[];
  presentations: PresentationRow[];
  meetings: MeetingRow[];
  outreach: OutreachRow[];
};

const tabs: { id: TabId; label: string; count?: (props: Props) => number }[] = [
  { id: "overview", label: "Vue d’ensemble" },
  { id: "presentations", label: "Présentations", count: (props) => props.presentations.length },
  { id: "meetings", label: "Entretiens sécurisés", count: (props) => props.meetings.length },
  { id: "authorizations", label: "Autorisations", count: (props) => props.authorizations.length },
  { id: "decisions", label: "Décisions", count: (props) => props.counts.decisionsRequired },
  { id: "outreach", label: "Prospection", count: (props) => props.outreach.length },
];

const stages = [
  ["01", "Identification", "Le cabinet repère et qualifie les profils pertinents."],
  ["02", "Présentation", "L’entreprise reçoit une présentation exécutive anonymisée et argumentée."],
  ["03", "Autorisation", "Le cabinet contrôle l’accès au candidat et ouvre le contact."],
  ["04", "Contact sécurisé", "30 minutes dans la plateforme, par messagerie ou visioconférence."],
  ["05", "Évaluation", "Compte rendu, éléments de suivi et historique de mission."],
  ["06", "Décision", "Après trois contacts réalisés, l’entreprise doit se positionner."],
] as const;

function formatDate(value: string | null) {
  if (!value) return "Non renseigné";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Non renseigné"
    : date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function readableStatus(value: string) {
  const labels: Record<string, string> = {
    MISSION_ACTIVE: "Mission active",
    CANDIDAT_ANONYME: "Candidat anonymisé",
    CONDITION_FINANCIERE_EN_ATTENTE: "Condition financière en attente",
    PAIEMENT_OU_CONDITION_CONFIRME: "Condition confirmée",
    IDENTITE_DEBLOQUEE: "Identité débloquée",
    MISSION_TERMINEE: "Mission terminée",
    REQUESTED: "À valider",
    CONFIRMED: "Autorisé",
    REJECTED: "Refusé",
    ACTIVE: "En cours",
    COMPLETED: "Terminé",
    PENDING: "En attente",
    QUEUED: "En file",
    SENT: "Envoyé",
    DELIVERED: "Délivré",
    REPLIED: "Réponse reçue",
    PAID: "Réglé",
    FAILED: "Échec",
    EXPIRED: "Expiré",
    RECRUIT: "Recruter",
    CONTINUE: "Poursuivre",
    CLOSE: "Clôturer",
  };
  return labels[value] || value.replaceAll("_", " ").toLocaleLowerCase("fr-FR");
}

function StatusPill({ value }: { value: string }) {
  return <span className="inline-flex border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-slate-300">{readableStatus(value)}</span>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="border border-white/10 bg-black/10 p-5 text-sm leading-6 text-slate-400">{children}</p>;
}

export default function ExecutiveSearchTabs(props: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [presentationSearch, setPresentationSearch] = useState("");
  const [presentationState, setPresentationState] = useState("ALL");
  const [meetingSearch, setMeetingSearch] = useState("");
  const [meetingStatus, setMeetingStatus] = useState("ALL");
  const [outreachStatus, setOutreachStatus] = useState("ALL");

  const filteredPresentations = props.presentations.filter((item) => {
    const query = presentationSearch.trim().toLocaleLowerCase("fr-FR");
    const text = [item.candidateAlias, item.companyAlias, item.missionTitle, item.state].filter(Boolean).join(" ").toLocaleLowerCase("fr-FR");
    return (!query || text.includes(query)) && (presentationState === "ALL" || item.state === presentationState);
  });

  const filteredMeetings = props.meetings.filter((item) => {
    const query = meetingSearch.trim().toLocaleLowerCase("fr-FR");
    const text = [item.candidateAlias, item.companyAlias, item.missionTitle, item.channel, item.status, item.paymentStatus].filter(Boolean).join(" ").toLocaleLowerCase("fr-FR");
    return (!query || text.includes(query)) && (meetingStatus === "ALL" || item.status === meetingStatus);
  });

  const filteredOutreach = props.outreach.filter((item) => outreachStatus === "ALL" || item.status === outreachStatus);
  const decisionItems = props.meetings.filter((item) => item.decisionRequired || (item.status === "COMPLETED" && item.decisionStatus === "PENDING"));

  return (
    <div className="mt-8">
      <div role="tablist" aria-label="Pilotage Executive Search" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          const count = tab.count?.(props);
          return (
            <button
              key={tab.id}
              id={`executive-search-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="executive-search-tab-panel"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] transition focus:outline-none focus:ring-2 focus:ring-orange-400 ${selected ? "border-orange-400 bg-orange-400 text-[#081625]" : "border-white/15 bg-white/[0.03] text-slate-300 hover:border-white/30 hover:bg-white/[0.07]"}`}
            >
              {tab.label}{typeof count === "number" ? <span className={`ml-2 ${selected ? "text-[#081625]/70" : "text-slate-500"}`}>{count}</span> : null}
            </button>
          );
        })}
      </div>

      <section id="executive-search-tab-panel" role="tabpanel" aria-labelledby={`executive-search-tab-${activeTab}`} tabIndex={0} className="mt-4 min-w-0 outline-none">
        {activeTab === "overview" && (
          <div className="space-y-8">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Prospections à traiter", props.counts.pendingOutreach],
                ["Prospections envoyées", props.counts.sentOutreach],
                ["Contacts ouverts", props.counts.openMeetings],
                ["Contacts réalisés", props.counts.completedMeetings],
                ["Décisions attendues", props.counts.decisionsRequired],
              ].map(([label, value]) => (
                <article key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
                </article>
              ))}
            </section>

            <section>
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-400">Méthode propriétaire</p>
                <h2 className="mt-2 text-3xl font-semibold">Une expérience de chasse de tête de bout en bout</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Les vues Présentations, Entretiens, Autorisations, Décisions et Prospection ci-dessus affichent les données enregistrées dans le système, et non des exemples statiques.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stages.map(([num, title, desc]) => (
                  <article key={num} className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
                    <span className="text-sm font-semibold text-orange-400">{num}</span>
                    <h3 className="mt-3 text-xl font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-white/[0.05] p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Présentation exécutive</p>
                <h2 className="mt-2 text-2xl font-semibold">L’identité reste protégée</h2>
                <p className="mt-3 leading-7 text-slate-400">Les présentations affichent les alias, la mission et l’état du processus. Les coordonnées et les identités réelles ne sont pas envoyées à ces listes.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/espace/owner/cv-matching" className="border border-orange-400/50 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-300 hover:bg-orange-400/10">Ouvrir le matching</Link>
                  <Link href="/espace/owner/metiers" className="border border-white/15 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-slate-300 hover:bg-white/[0.05]">Métiers & dossiers</Link>
                  <Link href="/espace/owner/sourcing" className="border border-white/15 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-slate-300 hover:bg-white/[0.05]">Sourcing automatique</Link>
                </div>
              </article>
              <article className="rounded-2xl border border-orange-400/20 bg-orange-400/[0.04] p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Secure Interview</p>
                <h2 className="mt-2 text-2xl font-semibold">Les règles de protection restent actives</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <li>Alias et identité contrôlée selon le niveau d’autorisation.</li>
                  <li>Contacts de 30 minutes dans la plateforme.</li>
                  <li>Les identités ne sont pas révélées par les vues de pilotage.</li>
                  <li>Enregistrement uniquement après consentement explicite des deux participants.</li>
                  <li>Après trois contacts réalisés, une décision de l’entreprise est attendue.</li>
                </ul>
              </article>
            </section>
          </div>
        )}

        {activeTab === "presentations" && (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Mise en relation anonymisée</p>
                <h2 className="mt-2 text-2xl font-semibold">Présentations confidentielles</h2>
                <p className="mt-2 text-sm text-slate-400">{props.presentations.length} présentation(s) chargée(s) depuis la base.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input aria-label="Rechercher une présentation" value={presentationSearch} onChange={(event) => setPresentationSearch(event.target.value)} placeholder="Alias, mission, état…" className="min-w-0 border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-orange-400" />
                <select aria-label="Filtrer les présentations par état" value={presentationState} onChange={(event) => setPresentationState(event.target.value)} className="border border-white/15 bg-[#10283e] px-4 py-3 text-sm text-white outline-none focus:border-orange-400">
                  <option value="ALL">Tous les états</option>
                  {Array.from(new Set(props.presentations.map((item) => item.state))).map((state) => <option value={state} key={state}>{readableStatus(state)}</option>)}
                </select>
              </div>
            </div>
            {filteredPresentations.length === 0 ? <EmptyState>Aucune présentation ne correspond aux filtres. Une présentation apparaît ici lorsqu’elle existe déjà dans le processus de mise en relation.</EmptyState> : (
              <div className="space-y-3">
                {filteredPresentations.map((item) => (
                  <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-300">{item.candidateAlias || "Profil candidat anonymisé"} ↔ {item.companyAlias || "Entreprise anonymisée"}</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{item.missionTitle || "Mission sans intitulé"}</h3>
                        <p className="mt-2 text-xs text-slate-500">Présenté le {formatDate(item.presentedAt)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusPill value={item.state} />
                        <span className="text-xs text-slate-400">{item.completedContacts}/3 contacts réalisés</span>
                        {item.decisionRequired ? <StatusPill value="DECISION_REQUIRED" /> : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "meetings" && (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Canaux contrôlés</p>
                <h2 className="mt-2 text-2xl font-semibold">Entretiens et contacts sécurisés</h2>
                <p className="mt-2 text-sm text-slate-400">{props.meetings.length} contact(s) récent(s). Les coordonnées ne sont pas incluses dans cette vue.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input aria-label="Rechercher un contact sécurisé" value={meetingSearch} onChange={(event) => setMeetingSearch(event.target.value)} placeholder="Alias, mission, canal…" className="min-w-0 border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-orange-400" />
                <select aria-label="Filtrer les contacts par statut" value={meetingStatus} onChange={(event) => setMeetingStatus(event.target.value)} className="border border-white/15 bg-[#10283e] px-4 py-3 text-sm text-white outline-none focus:border-orange-400">
                  <option value="ALL">Tous les statuts</option>
                  {Array.from(new Set(props.meetings.map((item) => item.status))).map((status) => <option value={status} key={status}>{readableStatus(status)}</option>)}
                </select>
              </div>
            </div>
            {filteredMeetings.length === 0 ? <EmptyState>Aucun contact sécurisé ne correspond aux filtres.</EmptyState> : (
              <div className="space-y-3">
                {filteredMeetings.map((item) => (
                  <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-300">{item.candidateAlias || "Profil candidat anonymisé"} ↔ {item.companyAlias || "Entreprise anonymisée"}</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{item.missionTitle || "Mission sans intitulé"}</h3>
                        <p className="mt-2 text-xs leading-5 text-slate-400">{item.channel === "VIDEO" ? "Visioconférence" : "Messagerie"} · {item.durationMinutes} min · demandé le {formatDate(item.createdAt)}</p>
                        <p className="mt-1 text-xs text-slate-500">Créneau : {formatDate(item.scheduledAt)} · Réalisé : {formatDate(item.startedAt)} → {formatDate(item.endedAt)}</p>
                      </div>
                      <div className="flex flex-col items-start gap-2 lg:items-end">
                        <StatusPill value={item.status} />
                        <span className="text-xs text-slate-400">{item.priceTtc.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} TTC</span>
                        <span className="text-xs text-slate-400">Règlement : {readableStatus(item.paymentStatus)}</span>
                        {item.decisionRequired ? <StatusPill value="DECISION_REQUIRED" /> : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "authorizations" && (
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Contrôle du cabinet</p>
              <h2 className="mt-2 text-2xl font-semibold">Demandes d’entretien à examiner</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Les boutons Autoriser et Refuser utilisent le flux existant de contrôle côté serveur et laissent une trace d’audit.</p>
            </div>
            <AuthorizationQueue meetings={props.authorizations} />
          </section>
        )}

        {activeTab === "decisions" && (
          <section className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Suivi des suites</p>
              <h2 className="mt-2 text-2xl font-semibold">Décisions attendues de l’entreprise</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">La décision appartient à l’entreprise. Cette vue permet au cabinet de repérer les dossiers à relancer sans décider à sa place.</p>
            </div>
            {decisionItems.length === 0 ? <EmptyState>Aucune décision n’est actuellement en attente.</EmptyState> : (
              <div className="space-y-3">
                {decisionItems.map((item) => (
                  <article key={item.id} className="rounded-xl border border-orange-400/20 bg-orange-400/[0.04] p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-300">{item.candidateAlias || "Profil candidat anonymisé"} ↔ {item.companyAlias || "Entreprise anonymisée"}</p>
                        <h3 className="mt-2 text-lg font-semibold">{item.missionTitle || "Mission sans intitulé"}</h3>
                        <p className="mt-2 text-xs text-slate-400">{item.status === "COMPLETED" ? "Contact terminé" : readableStatus(item.status)} · {item.durationMinutes} min par contact · {formatDate(item.updatedAt || item.createdAt)}</p>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <StatusPill value={item.decisionRequired ? "DECISION_REQUIRED" : item.decisionStatus} />
                        <span className="text-xs text-slate-400">Décision entreprise : {readableStatus(item.decisionStatus)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "outreach" && (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Provenance et suivi</p>
                <h2 className="mt-2 text-2xl font-semibold">Prospection et contacts sortants</h2>
                <p className="mt-2 text-sm text-slate-400">Les 100 événements les plus récents sont affichés sans exposer ici les adresses directes des destinataires.</p>
              </div>
              <select aria-label="Filtrer la prospection par statut" value={outreachStatus} onChange={(event) => setOutreachStatus(event.target.value)} className="border border-white/15 bg-[#10283e] px-4 py-3 text-sm text-white outline-none focus:border-orange-400">
                <option value="ALL">Tous les statuts</option>
                {Array.from(new Set(props.outreach.map((item) => item.status))).map((status) => <option value={status} key={status}>{readableStatus(status)}</option>)}
              </select>
            </div>
            {filteredOutreach.length === 0 ? <EmptyState>Aucun événement de prospection ne correspond aux filtres.</EmptyState> : (
              <div className="space-y-3">
                {filteredOutreach.map((item) => (
                  <article key={item.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.recipientType === "COMPANY" ? "Entreprise ciblée" : item.recipientType === "CANDIDATE" ? "Candidat ciblé" : "Contact sortant"}</p>
                      <p className="mt-1 text-xs text-slate-400">Campagne : {item.campaignKey}</p>
                      <p className="mt-1 text-xs text-slate-500">Source : {item.source || "Non renseignée"} · créé le {formatDate(item.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <StatusPill value={item.status} />
                      <span className="text-xs text-slate-400">Envoi : {formatDate(item.sentAt)} · Réponse : {formatDate(item.repliedAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </div>
  );
}
