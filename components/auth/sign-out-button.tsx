"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/connexion" })}
      className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-white/60 transition hover:border-[#c7a15a] hover:text-[#c7a15a]"
    >
      Se déconnecter
    </button>
  );
}
