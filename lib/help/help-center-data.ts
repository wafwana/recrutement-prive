import { RP_TAXONOMY } from "@/lib/taxonomy/rp-taxonomy";

export type HelpGuide = {
  id: string;
  title: string;
  module: "SOURCING" | "MATCHING" | "CV_LIBRARY" | "PARTNERS" | "BILLING" | "JOBS" | "ADMIN" | "METIERS" | "GENERAL";
  categoryCode?: string;
  subCategoryCode?: string;
  summary: string;
  prerequisites: string[];
  requiredPermissions: string[];
  expectedResult: string;
  steps: Array<{ title: string; detail: string }>;
  troubleshooting: Array<{ problem: string; solution: string }>;
  relatedLinks: Array<{ label: string; href: string }>;
  keywords: string[];
};

export const HELP_GUIDES: HelpGuide[] = [
  {
    id: "guide-sourcing-autonome",
    title: "Sourcing autonome de candidats par secteur & métier",
    module: "SOURCING",
    summary: "Comment lancer une recherche proactive de profils qualifiés directement depuis la taxonomie des métiers sans exigence de mandat d'entreprise préalable.",
    prerequisites: ["Compte OWNER, ADMIN ou CONSULTANT actif", "Permission SOURCING ou METIERS_DOSSIERS accordée"],
    requiredPermissions: ["SOURCING", "METIERS_DOSSIERS"],
    expectedResult: "Incrémentation automatique du vivier de candidats qualifiés avec classement dans les dossiers métiers correspondants et notification Owner.",
    steps: [
      { title: "Accéder à la taxonomie", detail: "Rendez-vous dans l'espace 'Métiers & dossiers' (/espace/owner/metiers)." },
      { title: "Sélectionner le nœud métier", detail: "Trouvez le secteur (ex. Casinos & Jeux) ou la spécialité recherchée." },
      { title: "Lancer la recherche", detail: "Cliquez sur 'Lancer une recherche', spécifiez les mots-clés, le pays et les compétences clés." },
      { title: "Valider l'ingestion", detail: "Les candidats sont récupérés, dédupliqués par empreinte et classés dans leur dossier cible." },
    ],
    troubleshooting: [
      { problem: "Aucune source candidats active", solution: "Vérifiez que RP_GLOBAL_CANDIDATE_SOURCES contient des URLs HTTPS valides dans la configuration." },
      { problem: "Accès refusé", solution: "Seuls les utilisateurs dotés de la permission SOURCING peuvent lancer des collectes." },
    ],
    relatedLinks: [
      { label: "Métiers & dossiers", href: "/espace/owner/metiers" },
      { label: "Sourcing global", href: "/espace/owner/sourcing" },
    ],
    keywords: ["sourcing", "candidats", "recherche", "métiers", "taxonomie", "casinos", "croupier", "vivier"],
  },
  {
    id: "guide-cv-intake-analysis",
    title: "Intégration, analyse et déduplication des CVs",
    module: "CV_LIBRARY",
    summary: "Procédure d'importation des CVs réels, empreinte SHA-256 d'immutabilité et analyse locale déterministe ou IA.",
    prerequisites: ["Permission CV_INTAKE", "Fichier au format PDF, DOCX, TXT ou MD (max 5Mo)"],
    requiredPermissions: ["CV_INTAKE"],
    expectedResult: "Extraction des compétences, de l'expérience et du métier principal sans modification du document original verrouillé.",
    steps: [
      { title: "Importer un document", detail: "Sélectionnez le fichier dans le registre des CVs (/espace/owner/cv-intake)." },
      { title: "Vérification d'empreinte", detail: "Le système calcule l'empreinte SHA-256 pour prévenir les doublons." },
      { title: "Lancer ou relancer l'analyse", detail: "Utilisez 'Analyser ce CV' ou 'Relancer l'analyse' pour générer la fiche de compétences." },
    ],
    troubleshooting: [
      { problem: "Ce CV original est déjà répertorié", solution: "Le fichier exact a déjà été intégré. Retrouvez-le par recherche SHA-256." },
    ],
    relatedLinks: [
      { label: "Registre CV Intake", href: "/espace/owner/cv-intake" },
      { label: "CVthèque", href: "/espace/documents/cv-library" },
    ],
    keywords: ["cv", "intake", "analyse", "pdf", "docx", "sha256", "déduplication", "compétences"],
  },
  {
    id: "guide-matching-propositions",
    title: "Matching persistant et propositions aux entreprises",
    module: "MATCHING",
    summary: "Règles d'évaluation des profils candidats par rapport aux besoins des entreprises et règles de déblocage d'identité.",
    prerequisites: ["Mission active côté entreprise", "Accès staff autorisé (OWNER, CONSULTANT, ADMIN)"],
    requiredPermissions: ["CV_MATCHING"],
    expectedResult: "Proposition de profil anonymisé transmis à l'entreprise cliente sous réserve de validation humaine obligatoire.",
    steps: [
      { title: "Consulter les correspondances", detail: "Ouvrez le cockpit de matching (/espace/owner/cv-matching)." },
      { title: "Valider la présentation", detail: "Vérifiez l'adéquation des compétences et validez la présentation du profil." },
      { title: "Déblocage de l'identité", detail: "L'identité du candidat reste masquée jusqu'à la confirmation financière." },
    ],
    troubleshooting: [
      { problem: "Candidat masqué", solution: "Conforme à la règle de confidentialité RP : les coordonnées restent verrouillées jusqu'à déblocage financier." },
    ],
    relatedLinks: [
      { label: "Cockpit Matching", href: "/espace/owner/cv-matching" },
      { label: "Offres & Vivier", href: "/espace/owner/offres-vivier" },
    ],
    keywords: ["matching", "proposition", "entreprise", "score", "déblocage", "anonymisation"],
  },
  {
    id: "guide-partenaires-sources",
    title: "Gestion des partenaires institutionnels et réseaux d'expatriés",
    module: "PARTNERS",
    summary: "Gestion des conventions, des réseaux associatifs et des écoles partenaires avec exclusion stricte des jobboards commerciaux.",
    prerequisites: ["Permission PARTNERS_MANAGE"],
    requiredPermissions: ["PARTNERS_MANAGE"],
    expectedResult: "Validation des partenariats et traçabilité de la provenance des candidats sourcés.",
    steps: [
      { title: "Accéder au module", detail: "Rendez-vous dans la rubrique Partenaires & Sources (/espace/owner/partenaires)." },
      { title: "Créer une fiche partenaire", detail: "Renseignez la catégorie (école, réseau expat, association) et les accords." },
      { title: "Validation par l'Owner", detail: "Seul l'Owner peut valider le statut 'VALIDATED_PARTNER'." },
    ],
    troubleshooting: [
      { problem: "Plateforme commerciale refusée", solution: "Les cabinets de recrutement et jobboards payants sont strictement exclus par les règles du réseau RP." },
    ],
    relatedLinks: [
      { label: "Partenaires & Sources", href: "/espace/owner/partenaires" },
    ],
    keywords: ["partenaires", "écoles", "expatriés", "sources", "conventions", "partenariats"],
  },
  {
    id: "guide-database-offline-recovery",
    title: "Procédure de continuité d'activité en cas de maintenance PostgreSQL / Neon",
    module: "ADMIN",
    summary: "Mode opératoire de secours permettant de maintenir la consultation des guides, des modèles de mailings et le build Next.js lorsque la base de données distante est en cours de maintenance ou hors quota.",
    prerequisites: ["Accès staff OWNER ou ADMIN", "Exécution des builds Vercel avec prisma generate isolée"],
    requiredPermissions: ["ADMIN"],
    expectedResult: "Maintien de la disponibilité des interfaces statiques, du Centre d'Aide et de la compilation sans régression de sécurité.",
    steps: [
      { title: "Isolation de la Build Vercel", detail: "La commande npm run build exécute uniquement 'prisma generate && next build' sans tenter de connexion migrate deploy." },
      { title: "Tests hors-ligne", detail: "Les tests unitaires vérifient la présence de process.env.DATABASE_URL avant toute tentative d'intégration." },
      { title: "Restauration ou Bascule", detail: "En cas de déblocage du quota Neon, rejouer le workflow GitHub Actions manuel 'Verify & Recover Prisma Production Migrations'." },
    ],
    troubleshooting: [
      { problem: "Erreur PrismentClientInitializationError pendant le build", solution: "S'assurer que le script de build ne déclenche aucun appel DB au moment de la génération statique." },
    ],
    relatedLinks: [
      { label: "Centre d'Aide", href: "/espace/help" },
      { label: "Configuration Système", href: "/espace/admin/configuration" },
    ],
    keywords: ["base de données", "neon", "maintenance", "hors-ligne", "postgresql", "restauration", "backup"],
  },
];

// Generate dynamic help entries for taxonomy categories
export function getTaxonomyHelpGuides(): HelpGuide[] {
  return RP_TAXONOMY.map((sector) => ({
    id: `help-taxonomy-${sector.code.toLowerCase()}`,
    title: `Guide métier & recrutement : ${sector.name.fr}`,
    module: "METIERS",
    categoryCode: sector.code,
    summary: `Procédure de recherche, de classification et de qualification des profils pour le secteur ${sector.name.fr}.`,
    prerequisites: ["Permission METIERS_DOSSIERS ou SOURCING"],
    requiredPermissions: ["METIERS_DOSSIERS"],
    expectedResult: `Accès direct aux dossiers métiers et aux profils forts demandés pour ${sector.name.fr}.`,
    steps: [
      { title: "Ouvrir le dossier secteur", detail: `Consultez les dossiers ${sector.name.fr} dans /espace/owner/metiers.` },
      { title: "Lancer le sourcing", detail: `Utilisez le bouton 'Lancer une recherche secteur' pour acquérir des profils.` },
    ],
    troubleshooting: [
      { problem: "Dossier vide", solution: "Le dossier reste conservé et disponible pour de futures réceptions ou recherches." },
    ],
    relatedLinks: [
      { label: `Dossier ${sector.name.fr}`, href: `/espace/owner/metiers?sector=${sector.code}` },
    ],
    keywords: [sector.name.fr.toLowerCase(), sector.code.toLowerCase(), ...sector.subcategories.map((s) => s.name.fr.toLowerCase())],
  }));
}
