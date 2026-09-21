"use client";
import { signOut } from "next-auth/react";

export default function OwnerLogoutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/connexion" })}
      className="border border-red-400/30 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-red-300 transition hover:border-red-300 hover:text-white"
    >
      Déconnecter
    </button>
  );
}
