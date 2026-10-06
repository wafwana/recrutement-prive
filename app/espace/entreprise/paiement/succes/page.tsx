import Link from "next/link";

export default function SecurePaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-[#081625] px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl border border-white/10 bg-white/[0.03] p-10">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#c7a15a]">Recrutement Privé · Paiement</p>
        <h1 className="mt-4 font-serif text-4xl">Règlement transmis</h1>
        <p className="mt-5 text-sm leading-7 text-white/55">Le prestataire de paiement transmet la confirmation à Recrutement Privé. La salle d'entretien ne sera ouverte qu'après confirmation effective du paiement et vérification des conditions de sécurité.</p>
        <Link href="/espace/entreprise" className="mt-8 inline-block border border-[#c7a15a] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c7a15a]">Retour à mon espace</Link>
      </div>
    </main>
  );
}
