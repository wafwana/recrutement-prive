# Elite sourcing policy

## Objective

Prioritize high-value international executive, senior specialist and leadership recruitment without creating a high-volume candidate or company database.

## Pipeline

Authorized sources -> detection -> minimal extraction -> elite/budget qualification -> international normalization -> AI matching -> provisional profile -> consultant validation -> contact.

## Candidate qualification

A candidate is prioritized when available evidence indicates seniority, leadership, scarce expertise, meaningful experience, international mobility/languages, or strong alignment with an open high-value role. The system must not infer protected or sensitive characteristics.

## Company qualification

A company is prioritized when an available job posting or authorized source indicates executive/senior recruitment, specialist scarcity, a stated compensation/budget level, or another configurable high-value hiring signal. If budget is unknown, do not invent one: classify as unknown and apply the configured fallback rule.

## International normalization

Store country separately from phone prefix and national number. Normalize phone data using the candidate's selected country/prefix; never guess a country from an ambiguous number. Keep the original value for audit when lawful and necessary.

## Privacy and contact

Only collect the minimum information needed for sourcing and matching. Do not scrape restricted platforms or bypass access controls. No automated outreach: contact requires consultant validation.

## Ranking

Use configurable thresholds for seniority, experience, skills, international fit and company/job value. Ranking is prioritization, not automatic rejection. A consultant can override the ranking.
