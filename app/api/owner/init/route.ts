import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password-crypto";
import { validatePassword } from "@/lib/password-policy";

export async function POST(request: Request) {
  try {
    let body: Record<string, string> = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional if relying on environment variables
    }

    const authHeader = request.headers.get("authorization") || "";
    const bearerSecret = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : "";
    const secretInBody = String(body.secret || "").trim();
    const providedSecret = bearerSecret || secretInBody;

    const expectedSecret = process.env.OWNER_INIT_SECRET?.trim();

    if (!expectedSecret) {
      return NextResponse.json(
        { error: "Le secret d'initialisation de l'OWNER n'est pas configuré sur le serveur (OWNER_INIT_SECRET)." },
        { status: 503 }
      );
    }

    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Secret d'initialisation invalide ou non fourni." }, { status: 401 });
    }

    const email = (body.email || process.env.OWNER_EMAIL || "").trim().toLowerCase();
    const password = body.password || process.env.OWNER_PASSWORD || "";
    const name = (body.name || process.env.OWNER_NAME || "Owner Recrutement Privé").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Veuillez fournir un email et un mot de passe pour le compte OWNER." },
        { status: 400 }
      );
    }

    const passVal = validatePassword(password);
    if (!passVal.isValid) {
      return NextResponse.json(
        { error: `Mot de passe invalide : ${passVal.errors.join(" ")}` },
        { status: 400 }
      );
    }

    const existingOwner = await prisma.user.findFirst({
      where: { role: "OWNER" },
      select: { id: true, email: true },
    });

    if (existingOwner) {
      return NextResponse.json(
        { error: `Un compte OWNER existe déjà dans le système (${existingOwner.email}). Création refusée.` },
        { status: 409 }
      );
    }

    const existingEmailUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });

    const passwordHash = await hashPassword(password);

    if (existingEmailUser) {
      // Upgrade user if they were created with another role before
      const updatedUser = await prisma.user.update({
        where: { id: existingEmailUser.id },
        data: {
          role: "OWNER",
          name,
          passwordHash,
        },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: updatedUser.id,
          actorRole: "OWNER",
          action: "INITIALIZE_FIRST_OWNER_PROMOTED",
          targetType: "User",
          targetId: updatedUser.id,
          details: { email: updatedUser.email, previousRole: existingEmailUser.role },
        },
      });

      return NextResponse.json(
        { message: "Compte OWNER initialisé avec succès (compte existant promu).", owner: updatedUser },
        { status: 200 }
      );
    }

    const newOwner = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "OWNER",
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: newOwner.id,
        actorRole: "OWNER",
        action: "INITIALIZE_FIRST_OWNER_CREATED",
        targetType: "User",
        targetId: newOwner.id,
        details: { email: newOwner.email },
      },
    });

    return NextResponse.json(
      { message: "Compte OWNER créé et initialisé avec succès.", owner: newOwner },
      { status: 201 }
    );
  } catch (error) {
    console.error("[OWNER Init] Error initializing first owner:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'initialisation du premier compte OWNER." },
      { status: 500 }
    );
  }
}
