export type SectorVisual = {
  src: string;
  alt: string;
  sourcePage: string;
};

type PhotoFamily =
  | "industry"
  | "logistics"
  | "business"
  | "finance"
  | "technology"
  | "agriculture"
  | "construction"
  | "laboratory"
  | "energy"
  | "hospitality"
  | "casino";

type PhotoSource = {
  imageId: string;
  sourcePage: string;
  alt: string;
};

const PHOTO_FAMILIES: Record<PhotoFamily, PhotoSource> = {
  industry: {
    imageId: "photo-1779517226309-6a053d0a5f96",
    sourcePage: "https://unsplash.com/photos/industrial-worker-spraying-a-conveyor-belt-with-water-QEY5zccAxZ0",
    alt: "Équipement et environnement de production industrielle",
  },
  logistics: {
    imageId: "photo-1627309366653-2dedc084cdf1",
    sourcePage: "https://unsplash.com/photos/warehouse-shelving-with-cardboard-boxes-jcav1COVvOc",
    alt: "Rayonnages et organisation d'un entrepôt logistique",
  },
  business: {
    imageId: "photo-1758518727077-ffb66ffccced",
    sourcePage: "https://unsplash.com/photos/three-people-in-a-business-meeting-discussing-documents-1uf2JCPFAkU",
    alt: "Réunion professionnelle autour de documents de travail",
  },
  finance: {
    imageId: "photo-1762427907123-c7ab022a5de7",
    sourcePage: "https://unsplash.com/photos/desk-with-papers-glasses-calculator-and-office-supplies-sW02MHv37yk",
    alt: "Documents financiers, calculatrice et fournitures de bureau",
  },
  technology: {
    imageId: "photo-1727434032773-af3cd98375ba",
    sourcePage: "https://unsplash.com/photos/a-close-up-of-a-computer-circuit-board-tBvF46kmwBw",
    alt: "Circuit électronique et composants informatiques",
  },
  agriculture: {
    imageId: "photo-1781332151189-f83497615d7d",
    sourcePage: "https://unsplash.com/photos/aerial-view-of-rows-of-greenhouses-covering-crops-9Ku3OY82Zeo",
    alt: "Serres agricoles et cultures vues du ciel",
  },
  construction: {
    imageId: "photo-1780145769345-de98a1a6a982",
    sourcePage: "https://unsplash.com/photos/modern-high-rise-building-under-construction-with-cranes-at-sunset-8bpVaLJ1mLY",
    alt: "Bâtiment contemporain en construction et grues",
  },
  laboratory: {
    imageId: "photo-1748182447909-dfd52d869cd1",
    sourcePage: "https://unsplash.com/photos/scientist-is-conducting-an-experiment-in-a-laboratory-MzIfSkcXj7Q",
    alt: "Équipement et manipulation en laboratoire scientifique",
  },
  energy: {
    imageId: "photo-1768839727824-28d6f0dcd1d1",
    sourcePage: "https://unsplash.com/photos/solar-panels-in-a-field-under-a-cloudy-sky-PRJDZIHKNzU",
    alt: "Panneaux solaires dans un champ",
  },
  hospitality: {
    imageId: "photo-1776245228843-7fc058aa19a7",
    sourcePage: "https://unsplash.com/photos/a-stylish-lounge-area-with-comfortable-seating-and-tables-lBR6E4rVK6s",
    alt: "Salon élégant d'un hôtel contemporain",
  },
  casino: {
    imageId: "photo-1674168462193-f53fd703c912",
    sourcePage: "https://unsplash.com/photos/a-casino-rouleet-with-lots-of-chips-on-top-of-it-Q13xZFdpzXg",
    alt: "Table de roulette et jetons de casino",
  },
};

// Each taxonomy sector reuses one coherent parent-family image for its professions.
// This avoids a photo-per-specialty gallery, excessive requests and visual inconsistency.
export const SECTOR_VISUAL_FAMILIES: Record<string, PhotoFamily> = {
  INDUSTRIE: "industry",
  LOGISTIQUE: "logistics",
  COMMERCE: "business",
  SERVICES: "business",
  IT: "technology",
  BTP: "construction",
  FINANCE: "finance",
  RH: "business",
  DIRECTION_EXECUTIVE: "business",
  INGENIERIE: "industry",
  SANTE: "laboratory",
  ENERGIE_ENVIRONNEMENT: "energy",
  BANQUE_ASSURANCE: "finance",
  MARKETING_COMMUNICATION: "business",
  JURIDIQUE: "finance",
  TRANSPORT_MOBILITE: "logistics",
  AGROALIMENTAIRE: "agriculture",
  IMMOBILIER: "construction",
  EDUCATION: "business",
  PHARMA_BIOTECH: "laboratory",
  LUXE_MODE: "hospitality",
  HOTELLERIE_TOURISME: "hospitality",
  PUBLIC_ASSOCIATIF: "business",
  CASINOS_JEUX: "casino",
  // Public landing-page category; its taxonomy equivalent is AGROALIMENTAIRE.
  AGRICULTURE: "agriculture",
};

export function isSectorVisualMapped(sectorCode: string): boolean {
  return Object.prototype.hasOwnProperty.call(SECTOR_VISUAL_FAMILIES, sectorCode);
}

export function getSectorVisual(sectorCode: string, sectorLabel?: string): SectorVisual {
  const family = SECTOR_VISUAL_FAMILIES[sectorCode] ?? "business";
  const photo = PHOTO_FAMILIES[family];
  const src = `https://images.unsplash.com/${photo.imageId}?auto=format&fit=crop&fm=jpg&q=78&w=960`;

  return {
    src,
    alt: sectorLabel ? `${photo.alt} — secteur ${sectorLabel}` : photo.alt,
    sourcePage: photo.sourcePage,
  };
}
