export function isIdentityUnlocked(state: string, financialConditionStatus: string) {
  return state === "IDENTITE_DEBLOQUEE" && financialConditionStatus === "CONFIRMED";
}
