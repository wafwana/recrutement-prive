"use client";

import { useActionState, useState } from "react";
import { saveCandidateProfile } from "./actions";
import { PHONE_COUNTRIES } from "@/lib/phone-countries";

export type CategoryOption = {
  id: string;
  code: string;
  name: unknown;
  parentId?: string | null;
};

type Profile = {
  headline: string | null;
  bio: string | null;
  location: string | null;
  country: string | null;
  phonePrefix: string | null;
  phone: string | null;
  primaryCategoryId?: string | null;
  subCategoryIds?: unknown;
  preferences: unknown;
  skills: unknown;
  experienceYears: number | null;
};

function formatCategoryName(name: unknown): string {
  if (typeof name === "string") return name;
  if (name && typeof name === "object") {
    const obj = name as Record<string, string>;
    return obj.fr || obj.en || Object.values(obj)[0] || "Secteur";
  }
  return "Secteur";
}

export default function ProfileForm({
  profile,
  categories = [],
}: {
  profile: Profile | null;
  categories?: CategoryOption[];
}) {
  const [selectedPrimaryCategory, setSelectedPrimaryCategory] = useState<string>(
    profile?.primaryCategoryId ?? ""
  );

  const initialSubCategories = Array.isArray(profile?.subCategoryIds)
    ? (profile.subCategoryIds as string[])
    : [];
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>(initialSubCategories);

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
  const skills = Array.isArray(profile?.skills)
    ? profile.skills.filter((item): item is string => typeof item === "string").join(", ")
    : "";
  const defaultPhonePrefix = profile?.phonePrefix || "+33";

  const parentCategories = categories.filter((c) => !c.parentId);
  const availableSubCategories = categories.filter(
    (c) => c.parentId && c.parentId === selectedPrimaryCategory
  );

  const toggleSubCategory = (subId: string) => {
    setSelectedSubCategories((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

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
          <input
            name="headline"
            defaultValue={profile?.headline ?? ""}
            maxLength={160}
            placeholder="ex: Directeur Financier"
            className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <label className="text-xs uppercase tracking-[0.18em] text-white/40">
          Métier principal / Secteur
          <select
            name="primaryCategoryId"
            value={selectedPrimaryCategory}
            onChange={(e) => {
              setSelectedPrimaryCategory(e.target.value);
              setSelectedSubCategories([]);
            }}
            className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="">-- Sélectionner un métier principal --</option>
            {parentCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {formatCategoryName(cat.name)} ({cat.code})
              </option>
            ))}
          </select>
        </label>

        {availableSubCategories.length > 0 && (
          <div className="md:col-span-2 border border-white/10 p-4 bg-black/20">
            <p className="text-xs uppercase tracking-[0.18em] text-[#c7a15a]">
              Sous-catégories & Spécialités
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {availableSubCategories.map((sub) => {
                const isSelected = selectedSubCategories.includes(sub.id);
                return (
                  <label
                    key={sub.id}
                    className={`cursor-pointer border px-3 py-2 text-xs transition ${
                      isSelected
                        ? "border-[#c7a15a] bg-[#c7a15a]/20 text-white"
                        : "border-white/10 bg-transparent text-white/60 hover:border-white/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="subCategoryIds"
                      value={sub.id}
                      checked={isSelected}
                      onChange={() => toggleSubCategory(sub.id)}
                      className="sr-only"
                    />
                    {isSelected ? "✓ " : "+ "}{formatCategoryName(sub.name)}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <label className="text-xs uppercase tracking-[0.18em] text-white/40">
          Ville / Région
          <input
            name="location"
            defaultValue={profile?.location ?? ""}
            maxLength={120}
            placeholder="ex: Paris / Île-de-France"
            className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <label className="text-xs uppercase tracking-[0.18em] text-white/40">
          Pays
          <input
            name="country"
            defaultValue={profile?.country ?? "France"}
            maxLength={120}
            placeholder="ex: France"
            className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <label className="text-xs uppercase tracking-[0.18em] text-white/40">
          Années d'expérience
          <input
            name="experienceYears"
            type="number"
            min="0"
            max="60"
            defaultValue={profile?.experienceYears ?? ""}
            placeholder="ex: 10"
            className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <div className="text-xs uppercase tracking-[0.18em] text-white/40 md:col-span-2">
          <span>Téléphone</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_2fr]">
            <select
              name="phonePrefix"
              defaultValue={defaultPhonePrefix}
              aria-label="Préfixe téléphonique"
              className="border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none"
            >
              {PHONE_COUNTRIES.map(([country, prefix]) => (
                <option key={`${country}-${prefix}`} value={prefix}>
                  {prefix} · {country}
                </option>
              ))}
            </select>
            <input
              name="phone"
              defaultValue={profile?.phone ?? ""}
              maxLength={40}
              placeholder="Numéro de téléphone"
              className="w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
            />
          </div>
        </div>

        <label className="text-xs uppercase tracking-[0.18em] text-white/40 md:col-span-2">
          Compétences clés
          <input
            name="skills"
            defaultValue={skills}
            placeholder="Management, Excel, SAP, Recrutement"
            maxLength={1500}
            className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
          />
        </label>
      </div>

      <label className="mt-5 block text-xs uppercase tracking-[0.18em] text-white/40">
        Présentation synthétique
        <textarea
          name="bio"
          defaultValue={profile?.bio ?? ""}
          rows={5}
          maxLength={2000}
          placeholder="Résumé de vos accomplissements clés et de vos ambitions..."
          className="mt-2 w-full resize-none border border-white/10 bg-transparent px-4 py-3 text-sm leading-6 text-white outline-none"
        />
      </label>

      <label className="mt-5 block text-xs uppercase tracking-[0.18em] text-white/40">
        Préférences de recherche
        <input
          name="preferences"
          defaultValue={preferences}
          placeholder="Direction générale, hybride, mobilité international"
          maxLength={1000}
          className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
        />
      </label>

      <button
        disabled={pending}
        className="mt-7 border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Enregistrer le profil"}
      </button>
    </form>
  );
}
