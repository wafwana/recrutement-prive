/**
 * Analyseur fonctionnel et technique déterministe pour le Pôle 2
 * Décompose les besoins du cahier des charges, identifie les composants réutilisables
 * de Recrutement Privé et estime les charges de développement spécifiques.
 */

export interface RequirementAnalysisResult {
  functionalCategories: {
    name: string;
    description: string;
    reusabilityScore: number; // 0 to 100%
    reusableModules: string[];
    customDevelopmentNeeded: string[];
  }[];
  globalReusabilityPercentage: number;
  technicalDependencies: string[];
  riskAssessment: {
    level: "FAIBLE" | "MOYEN" | "ELEVE";
    factors: string[];
  };
  estimatedEffortDays: {
    reusedIntegration: number;
    customDev: number;
    testingAndDeployment: number;
    totalDays: number;
  };
  pricingRecommendation: {
    currency: string;
    setupMin: number;
    setupMax: number;
    monthlySubscriptionMin: number;
    monthlySubscriptionMax: number;
  };
}

export function analyzeRequirementsLocally(
  title: string,
  description: string
): RequirementAnalysisResult {
  const content = `${title} ${description}`.toLowerCase();

  const categories: RequirementAnalysisResult["functionalCategories"] = [];
  const dependencies: string[] = ["Next.js (App Router)", "TypeScript", "TailwindCSS", "Prisma ORM", "PostgreSQL"];

  // 1. Authentification & Rôles
  const hasAuth = /auth|connexion|inscription|mot de passe|rôle|admin|collaborateur|permission|session/i.test(content);
  if (hasAuth) {
    categories.push({
      name: "Authentification & Gestion des Rôles",
      description: "Système de connexion sécurisé, gestion des sessions et permissions RBAC.",
      reusabilityScore: 90,
      reusableModules: ["NextAuth/AuthJS", "lib/auth/permissions", "Sessions sécurisées", "RBAC OWNER/ADMIN"],
      customDevelopmentNeeded: ["Personnalisation des écrans de connexion spécifiques"],
    });
  }

  // 2. Gestion de Profils & Annonces / CRUD Métier
  const hasProfiles = /profil|candidat|entreprise|annonce|offre|catalogue|dossier|document|upload/i.test(content);
  if (hasProfiles) {
    categories.push({
      name: "Gestion des Entités Métier & Documents",
      description: "CRUD complet, formulaires de saisie, stockage et indexation des fichiers.",
      reusabilityScore: 85,
      reusableModules: ["Formulaires Next.js", "Téléversement de fichiers sécurisé", "Modélisation Prisma"],
      customDevelopmentNeeded: ["Champs métiers spécifiques au client"],
    });
  }

  // 3. Moteur de Rapprochement / Algorithme
  const hasMatching = /matching|rapprochement|filtre|recherche avancée|score|recommandation|compatibilité/i.test(content);
  if (hasMatching) {
    categories.push({
      name: "Moteur de Rapprochement & Filtres Avancés",
      description: "Scoring pondéré, filtrage multicritères déterministe et recherche dynamique.",
      reusabilityScore: 80,
      reusableModules: ["Moteur de scoring multicritère", "Algorithmes de pondération", "Filtres temps réel"],
      customDevelopmentNeeded: ["Règles de scoring sur mesure selon le secteur client"],
    });
  }

  // 4. Paiement, Monétisation & Facturation
  const hasPayment = /paiement|facture|abonnement|carte|stripe|monétisation|prix|virement/i.test(content);
  if (hasPayment) {
    categories.push({
      name: "Paiement & Abonnements",
      description: "Intégration bancaire, gestion des abonnements récurrents et factures.",
      reusabilityScore: 75,
      reusableModules: ["Intégration Stripe", "Webhooks de facturation", "Historique de transactions"],
      customDevelopmentNeeded: ["Grille tarifaire et logique de souscription personnalisée"],
    });
    dependencies.push("Stripe API");
  }

  // 5. Messagerie & Notifications
  const hasMessaging = /message|chat|discussion|email|notification|contact|sms/i.test(content);
  if (hasMessaging) {
    categories.push({
      name: "Messagerie & Notifications",
      description: "Canal de communication interne ou emails transactionnels.",
      reusabilityScore: 85,
      reusableModules: ["Service d'emailing transactionnel (Resend)", "Notifications internes in-app"],
      customDevelopmentNeeded: ["Gabarits d'emails personnalisés à l'identité du client"],
    });
    dependencies.push("Resend / SMTP");
  }

  // Si aucun mot clé détecté, catégorie par défaut
  if (categories.length === 0) {
    categories.push({
      name: "Socle Applicatif & Gestion Standard",
      description: "Structure web moderne avec tableau de bord et gestion administrative.",
      reusabilityScore: 70,
      reusableModules: ["Socle Next.js", "Design System Tailwind", "Architecture d'API sécurisée"],
      customDevelopmentNeeded: ["Modélisation et développement des modules sur mesure"],
    });
  }

  // Calcul du score global de réutilisabilité
  const globalScore = Math.round(
    categories.reduce((acc, c) => acc + c.reusabilityScore, 0) / categories.length
  );

  // Estimation de charge
  const baseCustomDays = categories.length * 3.5;
  const reusedDays = categories.length * 1.5;
  const testDays = Math.round((baseCustomDays + reusedDays) * 0.25);
  const totalDays = Math.round(baseCustomDays + reusedDays + testDays);

  // Évaluation des risques
  let riskLevel: "FAIBLE" | "MOYEN" | "ELEVE" = "FAIBLE";
  const factors: string[] = ["Architecture basée sur des briques déjà éprouvées en production."];

  if (hasPayment) {
    factors.push("Gestion des flux financiers et conformité bancaire à valider.");
    riskLevel = "MOYEN";
  }
  if (totalDays > 25) {
    factors.push("Volume fonctionnel important nécessitant un découpage en plusieurs phases.");
    riskLevel = "ELEVE";
  }

  // Tarification indicative
  const setupMin = Math.round(totalDays * 450);
  const setupMax = Math.round(totalDays * 650);
  const monthlyMin = Math.round(setupMin * 0.05);
  const monthlyMax = Math.round(setupMax * 0.08);

  return {
    functionalCategories: categories,
    globalReusabilityPercentage: globalScore,
    technicalDependencies: dependencies,
    riskAssessment: {
      level: riskLevel,
      factors,
    },
    estimatedEffortDays: {
      reusedIntegration: Math.round(reusedDays),
      customDev: Math.round(baseCustomDays),
      testingAndDeployment: testDays,
      totalDays,
    },
    pricingRecommendation: {
      currency: "EUR",
      setupMin,
      setupMax,
      monthlySubscriptionMin: monthlyMin,
      monthlySubscriptionMax: monthlyMax,
    },
  };
}
