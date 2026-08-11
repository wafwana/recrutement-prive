import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const spaces = [
  { href: "/espace/candidat", role: "CANDIDAT", eyebrow: "Espace candidat", title: "Pilotez votre parcours.", text: "Profil, candidatures, documents et échanges réunis dans un espace confidentiel." },
  { href: "/espace/entreprise", role: "ENTREPRISE", eyebrow: "Espace entreprise", title: "Pilotez vos recrutements.", text: "Offres, profils proposés et suivi des missions dans une interface simple et claire." },
  { href: "/espace/consultant", role: "CONSULTANT", eyebrow: "Espace consultant", title: "Centralisez votre activité.", text: "Pipeline, candidats, entreprises, rendez-vous et reporting au même endroit." },
];

export default async function EspacePage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const allowed = spaces.filter((space) => session.user.role === space.role || session.user.role === "ADMIN");

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-20 md:w-[min(1180px,calc(100%-72px))] md:py-28">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Accès métiers</p>
      <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-tight sm:text-6xl">Un espace pensé pour chaque acteur du recrutement.</h1>
      <p className="mt-7 max-w-2xl text-base leading-8 text-white/55">Bienvenue{session.user.name ? ` ${session.user.name}` : ""}. Choisissez votre environnement.</p>

      <div className="mt-14 grid gap-px bg-white/10 md:grid-cols-3">
        {allowed.map((space) => (
          <Link key={space.href} href={space.href} className="group bg-[#111] p-8 transition hover:bg-[#151515]">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">{space.eyebrow}</span>
            <h2 className="mt-10 font-serif text-3xl leading-tight">{space.title}</h2>
            <p className="mt-5 text-sm leading-7 text-white/50">{space.text}</p>
            <span className="mt-10 inline-block text-[10px] uppercase tracking-[0.22em] text-white/70 transition group-hover:text-[#c7a15a]">Accéder →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
