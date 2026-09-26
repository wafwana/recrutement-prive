import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createOwnerCompany } from "./actions";
import OwnerCompanyForm from "./OwnerCompanyForm";

async function submitOwnerCompany(formData: FormData) {\n  "use server";\n  await createOwnerCompany(formData);\n}\n\nexport default async function NewOwnerCompanyPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");

  return (
    <main className="mx-auto w-[min(1000px,calc(100%-40px))] py-12 md:py-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c7a15a]">OWNER · Saisie manuelle</p>
          <h1 className="mt-3 font-serif text-4xl">Rentrer une entreprise</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">Ajoutez une entreprise au référentiel existant. Un contrôle anti-doublon est effectué avant la création.</p>
        </div>
        <Link href="/espace/owner" className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/55">Retour OWNER</Link>
      </div>

      <OwnerCompanyForm action={submitOwnerCompany} />
    </main>
  );
}
