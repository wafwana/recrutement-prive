"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/navigation/BackButton";
import {
  PARTNER_CATEGORIES,
  PARTNER_STATUSES,
  PARTNER_PRIORITIES,
} from "@/lib/partenaires/taxonomy";

export default function NewPartnerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState("UNIVERSITES_ECOLES");
  const [subCategory, setSubCategory] = useState("");
  const [officialName, setOfficialName] = useState("");
  const [usualName, setUsualName] = useState("");
  const [partnerType, setPartnerType] = useState("");
  const [status, setStatus] = useState("IDENTIFIED");
  const [priority, setPriority] = useState("MEDIUM");
  const [country, setCountry] = useState("France");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [institutionalAddress, setInstitutionalAddress] = useState("");
  const [publicContactEmail, setPublicContactEmail] = useState("");
  const [publicContactPhone, setPublicContactPhone] = useState("");
  const [languages, setLanguages] = useState("Français");
  const [sectors, setSectors] = useState("");
  const [professions, setProfessions] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [skills, setSkills] = useState("");
  const [collaborationTypes, setCollaborationTypes] = useState("");
  const [potentialNeed, setPotentialNeed] = useState("");
  const [interest, setInterest] = useState("");
  const [notes, setNotes] = useState("");

  const selectedCategoryObj = PARTNER_CATEGORIES.find((c) => c.code === category);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/owner/partenaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officialName,
          usualName,
          category,
          subCategory,
          partnerType,
          status,
          priority,
          country,
          region,
          city,
          website,
          institutionalAddress,
          publicContactEmail,
          publicContactPhone,
          languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
          sectors: sectors.split(",").map((s) => s.trim()).filter(Boolean),
          professions: professions.split(",").map((s) => s.trim()).filter(Boolean),
          targetAudience: targetAudience.split(",").map((s) => s.trim()).filter(Boolean),
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          collaborationTypes: collaborationTypes.split(",").map((s) => s.trim()).filter(Boolean),
          potentialNeed,
          interest,
          notes,
          source: "MANUAL",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la création du partenaire.");
      }

      router.push(`/espace/owner/partenaires/${data.partner.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-[min(1000px,calc(100%-40px))] py-12 md:w-[min(1000px,calc(100%-72px))] md:py-20">
      <BackButton />

      <div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Création · Partenaire</p>
        <h1 className="mt-3 font-serif text-3xl sm:text-4xl">Ajouter un organisme partenaire</h1>
        <p className="mt-2 text-sm text-white/50">
          Enregistrez un nouvel organisme institutionnel, éducatif, associatif ou réseau d&apos;expatriés.
        </p>
      </div>

      {error && (
        <div className="mt-6 border border-red-500/50 bg-red-500/10 p-4 text-xs text-red-400">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-8 border border-white/10 bg-[#111] p-8">
        {/* Category & Identification */}
        <div className="space-y-4">
          <h2 className="border-b border-white/10 pb-3 font-serif text-xl text-[#c7a15a]">
            1. Classification & Identification
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Catégorie *</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubCategory("");
                }}
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
                required
              >
                {PARTNER_CATEGORIES.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Sous-catégorie</label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              >
                <option value="">Sélectionner une sous-catégorie...</option>
                {selectedCategoryObj?.subcategories.map((sub) => (
                  <option key={sub.code} value={sub.code}>
                    {sub.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Nom officiel *</label>
              <input
                type="text"
                value={officialName}
                onChange={(e) => setOfficialName(e.target.value)}
                placeholder="Ex: Université Paris-Saclay, CCI France UAE..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Nom usuel / Sigle</label>
              <input
                type="text"
                value={usualName}
                onChange={(e) => setUsualName(e.target.value)}
                placeholder="Ex: Paris-Saclay, CCIF_UAE..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Type d&apos;organisme</label>
              <input
                type="text"
                value={partnerType}
                onChange={(e) => setPartnerType(e.target.value)}
                placeholder="Ex: Établissement public, Association Loi 1901..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Statut initial</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              >
                {PARTNER_STATUSES.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Priorité</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              >
                {PARTNER_PRIORITIES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Localisation & Coordonnées institutionnelles */}
        <div className="space-y-4">
          <h2 className="border-b border-white/10 pb-3 font-serif text-xl text-[#c7a15a]">
            2. Localisation & Coordonnées Publiques
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Pays</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Ex: France, Émirats Arabes Unis..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Région / État</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Ex: Île-de-France, Dubaï..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Ville</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Paris, Abu Dhabi..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Site Web</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">E-mail public</label>
              <input
                type="email"
                value={publicContactEmail}
                onChange={(e) => setPublicContactEmail(e.target.value)}
                placeholder="contact@organisme.org"
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Téléphone public</label>
              <input
                type="text"
                value={publicContactPhone}
                onChange={(e) => setPublicContactPhone(e.target.value)}
                placeholder="+33 1..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Adresse institutionnelle</label>
            <input
              type="text"
              value={institutionalAddress}
              onChange={(e) => setInstitutionalAddress(e.target.value)}
              placeholder="Adresse du siège ou établissement"
              className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
            />
          </div>
        </div>

        {/* Qualification & Domaines */}
        <div className="space-y-4">
          <h2 className="border-b border-white/10 pb-3 font-serif text-xl text-[#c7a15a]">
            3. Qualification & Périmètre
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Langues (séparées par virgule)</label>
              <input
                type="text"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="Français, Anglais, Espagnol..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Secteurs (séparés par virgule)</label>
              <input
                type="text"
                value={sectors}
                onChange={(e) => setSectors(e.target.value)}
                placeholder="Technologies, Finance, Industrie..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Publics / Profils concernés</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Étudiants, Jeunes diplômés, Cadres expatriés..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Types de collaboration</label>
              <input
                type="text"
                value={collaborationTypes}
                onChange={(e) => setCollaborationTypes(e.target.value)}
                placeholder="Diffusion d'offres, Parrainage, Relais réseau..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 px-3 py-2.5 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Besoin potentiel de l&apos;organisme</label>
              <textarea
                value={potentialNeed}
                onChange={(e) => setPotentialNeed(e.target.value)}
                rows={2}
                placeholder="Accompagnement de leurs membres, insertion professionnelle..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 p-3 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Intérêt stratégique pour RP</label>
              <textarea
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                rows={2}
                placeholder="Vivier de talents qualifiés, visibilité institutionnelle..."
                className="mt-1.5 w-full border border-white/15 bg-black/60 p-3 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-white/50">Notes internes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes et observations confidentielles sur l'organisme..."
              className="mt-1.5 w-full border border-white/15 bg-black/60 p-3 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-6">
          <Link
            href="/espace/owner/partenaires"
            className="border border-white/20 px-4 py-3 text-xs uppercase tracking-[0.14em] text-white/60 hover:text-white"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="border border-[#c7a15a] bg-[#c7a15a] px-6 py-3 text-xs uppercase tracking-[0.18em] text-black font-semibold hover:bg-[#b08b46] disabled:opacity-50"
          >
            {loading ? "Création en cours..." : "Créer la fiche partenaire"}
          </button>
        </div>
      </form>
    </section>
  );
}
