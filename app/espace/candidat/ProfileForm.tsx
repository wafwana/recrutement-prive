"use client";

import { useActionState } from "react";
import { saveCandidateProfile } from "./actions";
import { PHONE_COUNTRIES } from "@/lib/phone-countries";

type Profile = { headline: string | null; bio: string | null; location: string | null; country: string | null; phonePrefix: string | null; phone: string | null; preferences: unknown; skills: unknown; experienceYears: number | null };

export default function ProfileForm({ profile }: { profile: Profile | null }) {
  const [message, formAction, pending] = useActionState(async (_prev: string, formData: FormData) => {
    try { await saveCandidateProfile(formData); return "Profil enregistré."; }
    catch (error) { return error instanceof Error ? error.message : "Impossible d'enregistrer le profil."; }
  }, "");
  const preferences = Array.isArray(profile?.preferences) ? profile.preferences.filter((item): item is string => typeof item === "string").join(", ") : "";
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter((item): item is string => typeof item === "string").join(", ") : "";
  const defaultPhonePrefix = profile?.phonePrefix || "+33";

  return (
    <form action={formAction} className="border border-white/10 bg-[#111] p-8">
      <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Profil professionnel</p><h2 className="mt-3 font-serif text-2xl">Présentez votre expertise.</h2></div>{message ? <p aria-live="polite" className="text-xs text-white/55">{message}</p> : null}</div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <label className="text-xs uppercase tracking-[0.18em] text-white/40">Intitulé professionnel<input name="headline" defaultValue={profile?.headline ?? ""} maxLength={160} placeholder="ex: Directeur Financier" className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" /></label>
        <label className="text-xs uppercase tracking-[0.18em] text-white/40">Ville / Région<input name="location" defaultValue={profile?.location ?? ""} maxLength={120} placeholder="ex: Paris / Île-de-France" className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" /></label>
        <label className="text-xs uppercase tracking-[0.18em] text-white/40">Pays<input name="country" defaultValue={profile?.country ?? "France"} maxLength={120} placeholder="ex: France" className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" /></label>
        <label className="text-xs uppercase tracking-[0.18em] text-white/40">Années d'expérience<input name="experienceYears" type="number" min="0" max="60" defaultValue={profile?.experienceYears ?? ""} placeholder="ex: 10" className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" /></label>
        <div className="text-xs uppercase tracking-[0.18em] text-white/40 md:col-span-2"><span>Téléphone</span><div className="mt-2 grid gap-2 sm:grid-cols-[1fr_2fr]"><select name="phonePrefix" defaultValue={defaultPhonePrefix} aria-label="Préfixe téléphonique" className="border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none">{PHONE_COUNTRIES.map(([country, prefix]) => <option key={`${country}-${prefix}`} value={prefix}>{prefix} · {country}</option>)}</select><input name="phone" defaultValue={profile?.phone ?? ""} maxLength={40} placeholder="Numéro de téléphone" className="w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" /></div></div>
        <label className="text-xs uppercase tracking-[0.18em] text-white/40 md:col-span-2">Compétences clés<input name="skills" defaultValue={skills} placeholder="Management, Excel, SAP, Recrutement" maxLength={1500} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" /></label>
      </div>
      <label className="mt-5 block text-xs uppercase tracking-[0.18em] text-white/40">Présentation synthétique<textarea name="bio" defaultValue={profile?.bio ?? ""} rows={5} maxLength={2000} placeholder="Résumé de vos accomplissements clés et de vos ambitions..." className="mt-2 w-full resize-none border border-white/10 bg-transparent px-4 py-3 text-sm leading-6 text-white outline-none" /></label>
      <label className="mt-5 block text-xs uppercase tracking-[0.18em] text-white/40">Préférences de recherche<input name="preferences" defaultValue={preferences} placeholder="Direction générale, hybride, mobilité international" maxLength={1000} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" /></label>
      <button disabled={pending} className="mt-7 border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black disabled:opacity-50">{pending ? "Enregistrement…" : "Enregistrer le profil"}</button>
    </form>
  );
}
