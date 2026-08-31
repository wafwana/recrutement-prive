const IDENTIFYING_FIELDS = ["name", "email", "phone", "phonePrefix", "cvUrl", "documents"] as const;

export { IDENTIFYING_FIELDS };

export function isIdentityUnlocked(state: string, financialConditionStatus: string) {
  return state === "IDENTITE_DEBLOQUEE" && financialConditionStatus === "CONFIRMED";
}
