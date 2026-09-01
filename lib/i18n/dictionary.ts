import type { Locale } from "./config";

export const dictionary = {
  fr: {
    nav: { home: "Accueil", companies: "Entreprises", candidates: "Candidats", contact: "Contact", account: "Espace connecté" },
    common: { language: "Langue", loading: "Chargement…", save: "Enregistrer", cancel: "Annuler", continue: "Continuer" },
    home: { title: "Recrutement Privé", subtitle: "Cabinet de recrutement haut de gamme pour talents et entreprises." },
    roles: { candidate: "Candidat", company: "Entreprise", consultant: "Consultant", owner: "Owner", admin: "Administrateur" },
  },
  en: {
    nav: { home: "Home", companies: "Companies", candidates: "Candidates", contact: "Contact", account: "Sign in" },
    common: { language: "Language", loading: "Loading…", save: "Save", cancel: "Cancel", continue: "Continue" },
    home: { title: "Private Recruitment", subtitle: "Premium recruitment firm for talents and companies." },
    roles: { candidate: "Candidate", company: "Company", consultant: "Consultant", owner: "Owner", admin: "Administrator" },
  },
  es: {
    nav: { home: "Inicio", companies: "Empresas", candidates: "Candidatos", contact: "Contacto", account: "Espacio conectado" },
    common: { language: "Idioma", loading: "Cargando…", save: "Guardar", cancel: "Cancelar", continue: "Continuar" },
    home: { title: "Reclutamiento Privado", subtitle: "Firma de selección de alto nivel para talentos y empresas." },
    roles: { candidate: "Candidato", company: "Empresa", consultant: "Consultor", owner: "Owner", admin: "Administrador" },
  },
  de: {
    nav: { home: "Startseite", companies: "Unternehmen", candidates: "Kandidaten", contact: "Kontakt", account: "Anmeldung" },
    common: { language: "Sprache", loading: "Wird geladen…", save: "Speichern", cancel: "Abbrechen", continue: "Weiter" },
    home: { title: "Private Personalvermittlung", subtitle: "Hochwertige Personalberatung für Talente und Unternehmen." },
    roles: { candidate: "Kandidat", company: "Unternehmen", consultant: "Berater", owner: "Owner", admin: "Administrator" },
  },
  it: {
    nav: { home: "Home", companies: "Aziende", candidates: "Candidati", contact: "Contatti", account: "Area riservata" },
    common: { language: "Lingua", loading: "Caricamento…", save: "Salva", cancel: "Annulla", continue: "Continua" },
    home: { title: "Reclutamento Privato", subtitle: "Società di selezione di alto livello per talenti e aziende." },
    roles: { candidate: "Candidato", company: "Azienda", consultant: "Consulente", owner: "Owner", admin: "Amministratore" },
  },
  ar: {
    nav: { home: "الرئيسية", companies: "الشركات", candidates: "المرشحون", contact: "اتصل بنا", account: "المساحة الخاصة" },
    common: { language: "اللغة", loading: "جارٍ التحميل…", save: "حفظ", cancel: "إلغاء", continue: "متابعة" },
    home: { title: "التوظيف الخاص", subtitle: "شركة توظيف رفيعة المستوى للمواهب والشركات." },
    roles: { candidate: "مرشح", company: "شركة", consultant: "مستشار", owner: "المالك", admin: "مسؤول" },
  },
} as const satisfies Record<Locale, unknown>;

export type Dictionary = (typeof dictionary)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return dictionary[locale];
}
