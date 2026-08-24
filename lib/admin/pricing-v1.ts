export const RECRUTEMENT_PRIVE_PRICING_V1 = {
  version: "V1 — 2026",
  status: "VALIDATED",
  defaultCurrency: "EUR",
  services: [
    { name: "Cadre / recrutement spécialisé", rate: 19, pricingType: "PERCENTAGE" },
    { name: "Expert rare / métier en tension", rate: 21, pricingType: "PERCENTAGE" },
    { name: "Cadre supérieur", rate: 22, pricingType: "PERCENTAGE" },
    { name: "Profil international", rate: 24, pricingType: "PERCENTAGE" },
    { name: "Direction / C-level", rate: 27, pricingType: "PERCENTAGE" },
    { name: "Executive Search confidentiel", rate: 30, pricingType: "PERCENTAGE" },
    { name: "Mandat exceptionnel très complexe", rate: 33, pricingType: "PERCENTAGE", maximum: true },
  ],
  billingModels: ["SUCCESS_FEE", "RETAINED", "FORFAIT", "CONTRAT_CADRE", "PERSONNALISE"],
  averageMissionReferenceHT: 21000,
  strategicMarkets: ["France", "Europe", "UAE / Dubaï"],
  negotiationPolicies: ["CATALOGUE", "COMPTE_STRATEGIQUE", "VOLUME", "EXCLUSIVITE", "PRIX_PLANCHER_INTERNE"],
} as const;
