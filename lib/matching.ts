type JsonList = unknown;

function list(value: JsonList): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toLowerCase()).filter(Boolean) : [];
}

function words(value: string | null | undefined): string[] {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9+#.]+/).filter((word) => word.length > 2);
}

export function matchCandidateToJob(candidate: { headline: string | null; bio: string | null; skills: JsonList; experienceYears: number | null }, job: { title: string; description: string | null; requiredSkills: JsonList; requiredExperienceYears: number | null }) {
  const required = list(job.requiredSkills);
  const candidateSkills = list(candidate.skills);
  const searchableCandidate = new Set([...candidateSkills, ...words(candidate.headline), ...words(candidate.bio)]);
  const searchableJob = new Set([...required, ...words(job.title), ...words(job.description)]);
  const skillMatches = required.length ? required.filter((skill) => searchableCandidate.has(skill) || words(skill).some((word) => searchableCandidate.has(word))).length : 0;
  const skillScore = required.length ? (skillMatches / required.length) * 60 : (words(job.title).some((word) => searchableCandidate.has(word)) ? 45 : 20);
  const experienceScore = job.requiredExperienceYears == null ? 20 : candidate.experienceYears == null ? 0 : Math.min(candidate.experienceYears / Math.max(job.requiredExperienceYears, 1), 1) * 30;
  const keywordMatches = [...searchableJob].filter((word) => searchableCandidate.has(word)).length;
  const keywordScore = searchableJob.size ? Math.min(keywordMatches / Math.min(searchableJob.size, 8), 1) * 10 : 0;
  const score = Math.min(100, Math.round(skillScore + experienceScore + keywordScore));
  return { score, skillMatches, requiredSkills: required.length, experienceYears: candidate.experienceYears, requiredExperienceYears: job.requiredExperienceYears };
}
