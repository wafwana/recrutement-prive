export type PricingType = "FIXED" | "PERCENTAGE" | "QUOTE";

export type RecruitmentService = {
  id: string;
  name: string;
  description: string;
  pricingType: PricingType;
  amount: number | null;
  currency: string;
  active: boolean;
  visibility: "INTERNAL" | "COMPANY";
  conditions?: string;
};

/**
 * Catalogue de prestations : structure prête à recevoir les tarifs définitifs
 * depuis l'espace Owner/Admin. Les montants ne sont volontairement pas fixés ici.
 */
export type PricingCatalog = {
  services: RecruitmentService[];
  defaultCurrency: string;
};
