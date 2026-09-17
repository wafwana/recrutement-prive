import { signOut } from "@/auth";

export function SignOutButton() {
  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/connexion" });
  }

  return (
    <form action={handleSignOut}>
      <button
        type="submit"
        className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-white/60 transition hover:border-[#c7a15a] hover:text-[#c7a15a]"
      >
        Se déconnecter
      </button>
    </form>
  );
}
