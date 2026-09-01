const IDENTIFYING_FIELDS = ["name", "email", "phone", "phonePrefix", "cvUrl", "documents"] as const;

export type MissionPresentationView = {
  id: string;
  missionId: string;
  applicationId: string;
  state: string;
  financialConditionStatus: string;
  presentedAt: Date;
  candidate: {
    headline: string | null;
    bio: string | null;
    location: string | null;
    country: string | null;
    skills: unknown;
    experienceYears: number | null;
  };
  unlocked: boolean;
  identifyingFields: typeof IDENTIFYING_FIELDS | null;
};

export function isIdentityUnlocked(state: string, financialConditionStatus: string) {
  return state === "IDENTITE_DEBLOQUEE" && financialConditionStatus === "CONFIRMED";
}
