export const SECURE_CONTACT_CONTRACT_TEMPLATES = [
  {
    key: "ENTREPRISE_CONTACT",
    audience: "ENTREPRISE",
    title: "Conditions du contact sécurisé — entreprise",
    version: "1.0",
    body: "Objet : accès à un entretien de 30 minutes via Recrutement Privé. Tarif : 99 € TTC par contact (82,50 € HT à 20 % de TVA). Les échanges doivent rester dans la plateforme. Toute tentative de transmission de coordonnées peut entraîner la suspension du canal.",
  },
  {
    key: "CANDIDAT_CONTACT",
    audience: "CANDIDAT",
    title: "Conditions du contact sécurisé — candidat",
    version: "1.0",
    body: "Objet : participation à un entretien sécurisé. Le candidat utilise uniquement les canaux fournis par Recrutement Privé et s'engage à ne pas transmettre de coordonnées ou liens externes pendant l'entretien.",
  },
  {
    key: "INTERVIEW_SECURE",
    audience: "BOTH",
    title: "Convention d'entretien sécurisé",
    version: "1.0",
    body: "Entretien de 30 minutes, par messagerie ou visioconférence interne, avec contrôle des coordonnées et journalisation de sécurité.",
  },
  {
    key: "ANTI_CIRCUMVENTION",
    audience: "BOTH",
    title: "Confidentialité et interdiction de contournement",
    version: "1.0",
    body: "Les parties s'engagent à utiliser le dispositif de mise en relation de Recrutement Privé et à ne pas contourner le dispositif pour établir directement une relation à partir des informations obtenues dans le cadre de l'entretien.",
  },
  {
    key: "RECORDING_CONSENT",
    audience: "BOTH",
    title: "Notice et consentement à l'enregistrement",
    version: "1.0",
    body: "L'entretien peut être enregistré ou analysé à des fins de sécurité et d'amélioration du service uniquement après information claire et consentement explicite des participants. Le refus doit empêcher l'enregistrement.",
  },
  {
    key: "SECURE_CHANNEL_POLICY",
    audience: "BOTH",
    title: "Politique messagerie et visioconférence sécurisées",
    version: "1.0",
    body: "Les identités affichées sont des alias lorsque le mode de confiance est actif. Les emails, téléphones, URLs, réseaux sociaux et autres coordonnées sont bloqués dans la messagerie sécurisée.",
  },
] as const;
