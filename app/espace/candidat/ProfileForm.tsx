"use client";

import { useActionState } from "react";
import { saveCandidateProfile } from "./actions";

type Profile = {
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  cvUrl: string | null;
  preferences: unknown;
};

export default function ProfileForm({ profile }: { profile: Profile | null }) {
  const [message, formAction, pending] = useActionState(async (_prev: string, formData: FormData) => {
    try {
      await saveCandidateProfile(formData);
      return "Profil enregistré.";
    } catch (error) {
      return error instanceof Error ? error.message : "Impossible d'enregistrer le profil.";
    }
  }, "");

  const preferences = Array.isArray(profile?.preferences)
    ? profile.preferences.filter((item): item is string => typeof item === "string").join(", ")
    : "";

  return (
    <form action={formAction} className="border border-white/10 bg-[#111] p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Profil professionnel</p>
          <h2 className="mt-3 font-serif text-2xl">Présentez votre expertise.</h2>
        </div>
        {message ? <p aria-live="polite" className="text-xs text-white/55">{message}</p> : null}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <label className="text-xs uppercase tracking-[0.18em] text-white/40">
          Intitulé professionnel
          <input name="headline" defaultValue={profile?.headline ?? ""} maxLength={160} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
        </label>
        <label className="text-xs uppercase tracking-[0.18em] text-white/40">
          Localisation
          <input name="location" defaultValue={profile?.location ?? ""} maxLength={120} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
        </label>
        <label className="text-xs uppercase tracking-[0.18em] text-white/40">
          Téléphone
          <input name="phone" defaultValue={profile?.phone ?? ""} maxLength={40} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
        </label>
        <label className="text-xs uppercase tracking-[0.18em] text-white/40">
          URL du CV
          <input name="cvUrl" type="url" defaultValue={profile?.cvUrl ?? ""} placeholder="https://..." className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
        </label>
      </div>

      <label className="mt-5 block text-xs uppercase tracking-[0.18em] text-white/40">
        Présentation
        <textarea name="bio" defaultValue={profile?.bio ?? ""} rows={6} maxLength={2000} className="mt-2 w-full resize-none border border-white/10 bg-transparent px-4 py-3 text-sm leading-6 text-white outline-none" />
      </label>

      <label className="mt-5 block text-xs uppercase tracking-[0.18em] text-white/40">
        Préférences de recherche
        <input name="preferences" defaultValue={preferences} placeholder="Direction, Finance, Paris" maxLength={1000} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
      </label>

      <button disabled={pending} className="mt-7 border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black disabled:opacity-50">
        {pending ? "Enregistrement…" : "Enregistrer le profil"}
      </button>
    </form>
  );
}
