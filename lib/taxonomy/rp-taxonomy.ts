export type TaxonomyNode = {
  code: string;
  name: Record<string, string>;
  subcategories: Array<{ code: string; name: Record<string, string> }>;
};

export const RP_TAXONOMY: TaxonomyNode[] = [
  { code: "INDUSTRIE", name: { fr: "Industrie", en: "Industry", es: "Industria", de: "Industrie", it: "Industria", ar: "الصناعة" }, subcategories: [
    { code: "PRODUCTION", name: { fr: "Production", en: "Production", es: "Producción", de: "Produktion", it: "Produzione", ar: "الإنتاج" } },
    { code: "MAINTENANCE", name: { fr: "Maintenance", en: "Maintenance", es: "Mantenimiento", de: "Instandhaltung", it: "Manutenzione", ar: "الصيانة" } },
    { code: "QUALITE", name: { fr: "Qualité / QHSE", en: "Quality / HSE", es: "Calidad / HSE", de: "Qualität / HSE", it: "Qualità / HSE", ar: "الجودة / السلامة" } },
    { code: "METHODES_INDUSTRIELLES", name: { fr: "Méthodes / Industrialisation", en: "Industrial Engineering", es: "Métodos / Industrialización", de: "Industrial Engineering", it: "Metodi / Industrializzazione", ar: "الهندسة الصناعية" } },
    { code: "SUPPLY_INDUSTRIELLE", name: { fr: "Supply chain industrielle", en: "Industrial Supply Chain", es: "Cadena de suministro industrial", de: "Industrielle Lieferkette", it: "Supply chain industriale", ar: "سلسلة التوريد الصناعية" } },
  ]},
  { code: "LOGISTIQUE", name: { fr: "Logistique & Supply Chain", en: "Logistics & Supply Chain", es: "Logística y Supply Chain", de: "Logistik & Supply Chain", it: "Logistica e Supply Chain", ar: "اللوجستيات وسلسلة الإمداد" }, subcategories: [
    { code: "LOGISTIQUE_TRANSPORT", name: { fr: "Logistique / Transport", en: "Logistics / Transport", es: "Logística / Transporte", de: "Logistik / Transport", it: "Logistica / Trasporti", ar: "اللوجستيات / النقل" } },
    { code: "ACHATS", name: { fr: "Achats", en: "Procurement", es: "Compras", de: "Einkauf", it: "Acquisti", ar: "المشتريات" } },
    { code: "SUPPLY_CHAIN", name: { fr: "Supply Chain", en: "Supply Chain", es: "Supply Chain", de: "Supply Chain", it: "Supply Chain", ar: "سلسلة الإمداد" } },
    { code: "PLANIFICATION", name: { fr: "Planification / Ordonnancement", en: "Planning / Scheduling", es: "Planificación / Programación", de: "Planung / Disposition", it: "Pianificazione", ar: "التخطيط والجدولة" } },
    { code: "WAREHOUSING", name: { fr: "Entrepôt / Warehouse", en: "Warehousing", es: "Almacén", de: "Lager", it: "Magazzino", ar: "المستودعات" } },
  ]},
  { code: "COMMERCE", name: { fr: "Commerce & Business", en: "Sales & Business", es: "Comercio y Negocio", de: "Vertrieb & Business", it: "Vendite e Business", ar: "التجارة والأعمال" }, subcategories: [
    { code: "VENTE_B2B", name: { fr: "Vente B2B", en: "B2B Sales", es: "Ventas B2B", de: "B2B-Vertrieb", it: "Vendite B2B", ar: "مبيعات B2B" } },
    { code: "GRANDS_COMPTES", name: { fr: "Grands comptes / Key Account", en: "Key Account Management", es: "Grandes cuentas", de: "Key Account Management", it: "Key Account", ar: "إدارة الحسابات الرئيسية" } },
    { code: "BUSINESS_DEV", name: { fr: "Business Development", en: "Business Development", es: "Desarrollo de negocio", de: "Business Development", it: "Business Development", ar: "تطوير الأعمال" } },
    { code: "DIRECTION_COMMERCIALE", name: { fr: "Direction commerciale", en: "Sales Leadership", es: "Dirección comercial", de: "Vertriebsleitung", it: "Direzione commerciale", ar: "الإدارة التجارية" } },
    { code: "VENTE_RETAIL", name: { fr: "Retail / Point de vente", en: "Retail", es: "Retail", de: "Einzelhandel", it: "Retail", ar: "تجارة التجزئة" } },
  ]},
  { code: "SERVICES", name: { fr: "Services", en: "Services", es: "Servicios", de: "Dienstleistungen", it: "Servizi", ar: "الخدمات" }, subcategories: [
    { code: "CONSEIL", name: { fr: "Conseil", en: "Consulting", es: "Consultoría", de: "Beratung", it: "Consulenza", ar: "الاستشارات" } },
    { code: "RELATION_CLIENT", name: { fr: "Relation client / Customer Success", en: "Customer Success", es: "Relación cliente", de: "Kundenbetreuung", it: "Customer Success", ar: "نجاح العملاء" } },
    { code: "OPERATIONS", name: { fr: "Opérations", en: "Operations", es: "Operaciones", de: "Operations", it: "Operations", ar: "العمليات" } },
    { code: "SERVICES_GENERAUX", name: { fr: "Services généraux", en: "General Services", es: "Servicios generales", de: "Allgemeine Dienste", it: "Servizi generali", ar: "الخدمات العامة" } },
  ]},
  { code: "IT", name: { fr: "Informatique & Tech", en: "IT & Technology", es: "Tecnología e IT", de: "IT & Technologie", it: "IT e Tecnologia", ar: "تقنية المعلومات والتكنولوجيا" }, subcategories: [
    { code: "DEV_LOGICIEL", name: { fr: "Développement logiciel", en: "Software Development", es: "Desarrollo de software", de: "Softwareentwicklung", it: "Sviluppo software", ar: "تطوير البرمجيات" } },
    { code: "DATA_IA", name: { fr: "Data / IA / Machine Learning", en: "Data / AI / Machine Learning", es: "Datos / IA / Machine Learning", de: "Data / KI / Machine Learning", it: "Data / IA / Machine Learning", ar: "البيانات والذكاء الاصطناعي" } },
    { code: "CYBERSECURITE", name: { fr: "Cybersécurité", en: "Cybersecurity", es: "Ciberseguridad", de: "Cybersicherheit", it: "Cybersecurity", ar: "الأمن السيبراني" } },
    { code: "CLOUD_DEVOPS", name: { fr: "Cloud / DevOps / SRE", en: "Cloud / DevOps / SRE", es: "Cloud / DevOps / SRE", de: "Cloud / DevOps / SRE", it: "Cloud / DevOps / SRE", ar: "السحابة و DevOps" } },
    { code: "ROBOTIQUE_IOT", name: { fr: "Robotique / IoT", en: "Robotics / IoT", es: "Robótica / IoT", de: "Robotik / IoT", it: "Robotica / IoT", ar: "الروبوتات وإنترنت الأشياء" } },
    { code: "PRODUIT_TECH", name: { fr: "Product Management / UX-UI", en: "Product Management / UX-UI", es: "Product Management / UX-UI", de: "Product Management / UX-UI", it: "Product Management / UX-UI", ar: "إدارة المنتجات وتجربة المستخدم" } },
  ]},
  { code: "BTP", name: { fr: "BTP & Construction", en: "Construction", es: "Construcción", de: "Bau", it: "Edilizia", ar: "البناء والتشييد" }, subcategories: [
    { code: "CONDUITE_TRAVAUX", name: { fr: "Conduite de travaux", en: "Construction Management", es: "Dirección de obra", de: "Bauleitung", it: "Direzione lavori", ar: "إدارة أعمال البناء" } },
    { code: "GENIE_CIVIL", name: { fr: "Génie civil", en: "Civil Engineering", es: "Ingeniería civil", de: "Bauingenieurwesen", it: "Ingegneria civile", ar: "الهندسة المدنية" } },
    { code: "ELECTRICITE_BATIMENT", name: { fr: "Électricité bâtiment", en: "Building Electrical", es: "Electricidad de edificios", de: "Gebäudeelektrik", it: "Elettricità edilizia", ar: "كهرباء المباني" } },
    { code: "CVC_PLOMBERIE", name: { fr: "CVC / Plomberie", en: "HVAC / Plumbing", es: "Climatización / Fontanería", de: "SHK / Gebäudetechnik", it: "HVAC / Idraulica", ar: "التكييف والسباكة" } },
    { code: "INGENIERIE_BATIMENT", name: { fr: "Ingénierie bâtiment", en: "Building Engineering", es: "Ingeniería de edificación", de: "Gebäudetechnik", it: "Ingegneria edilizia", ar: "هندسة المباني" } },
  ]},
  { code: "FINANCE", name: { fr: "Finance", en: "Finance", es: "Finanzas", de: "Finanzen", it: "Finanza", ar: "المالية" }, subcategories: [
    { code: "COMPTABILITE", name: { fr: "Comptabilité", en: "Accounting", es: "Contabilidad", de: "Buchhaltung", it: "Contabilità", ar: "المحاسبة" } },
    { code: "CONTROLE_DE_GESTION", name: { fr: "Contrôle de gestion", en: "Financial Controlling", es: "Control de gestión", de: "Controlling", it: "Controllo di gestione", ar: "الرقابة الإدارية والمالية" } },
    { code: "AUDIT", name: { fr: "Audit", en: "Audit", es: "Auditoría", de: "Audit", it: "Audit", ar: "التدقيق" } },
    { code: "TRESORERIE", name: { fr: "Trésorerie", en: "Treasury", es: "Tesorería", de: "Treasury", it: "Tesoreria", ar: "الخزينة" } },
    { code: "FINTECH", name: { fr: "FinTech", en: "FinTech", es: "FinTech", de: "FinTech", it: "FinTech", ar: "التكنولوجيا المالية" } },
  ]},
  { code: "RH", name: { fr: "Ressources Humaines", en: "Human Resources", es: "Recursos Humanos", de: "Personalwesen", it: "Risorse Umane", ar: "الموارد البشرية" }, subcategories: [
    { code: "RECRUTEMENT", name: { fr: "Recrutement / Talent Acquisition", en: "Recruitment / Talent Acquisition", es: "Selección / Talent Acquisition", de: "Recruiting / Talent Acquisition", it: "Recruiting / Talent Acquisition", ar: "التوظيف واكتساب المواهب" } },
    { code: "FORMATION", name: { fr: "Formation / Développement des talents", en: "Learning & Development", es: "Formación / Desarrollo del talento", de: "Weiterbildung / Talententwicklung", it: "Formazione / Sviluppo talenti", ar: "التدريب وتطوير المواهب" } },
    { code: "PAIE", name: { fr: "Paie / ADP", en: "Payroll / HR Administration", es: "Nómina / Administración", de: "Lohnabrechnung / HR-Administration", it: "Paghe / Amministrazione", ar: "الرواتب وإدارة الموارد البشرية" } },
    { code: "HRBP", name: { fr: "HR Business Partner", en: "HR Business Partner", es: "HR Business Partner", de: "HR Business Partner", it: "HR Business Partner", ar: "شريك أعمال الموارد البشرية" } },
  ]},
  { code: "DIRECTION_EXECUTIVE", name: { fr: "Direction & Haut Management", en: "Executive Leadership", es: "Dirección y Alta Dirección", de: "Geschäftsführung & Top Management", it: "Direzione e Top Management", ar: "الإدارة العليا" }, subcategories: [
    { code: "DIRECTION_GENERALE", name: { fr: "Direction générale / CEO", en: "General Management / CEO", es: "Dirección general / CEO", de: "Geschäftsführung / CEO", it: "Direzione generale / CEO", ar: "الإدارة العامة / الرئيس التنفيذي" } },
    { code: "DIRECTION_FINANCIERE", name: { fr: "Direction financière / CFO", en: "Finance Leadership / CFO", es: "Dirección financiera / CFO", de: "Finanzleitung / CFO", it: "Direzione finanziaria / CFO", ar: "المدير المالي / CFO" } },
    { code: "DIRECTION_RH", name: { fr: "Direction RH / CHRO", en: "HR Leadership / CHRO", es: "Dirección RR. HH. / CHRO", de: "HR-Leitung / CHRO", it: "Direzione HR / CHRO", ar: "مدير الموارد البشرية / CHRO" } },
    { code: "DIRECTION_COMMERCIALE_EXEC", name: { fr: "Direction commerciale / CRO", en: "Sales Leadership / CRO", es: "Dirección comercial / CRO", de: "Vertriebsleitung / CRO", it: "Direzione commerciale / CRO", ar: "المدير التجاري / CRO" } },
    { code: "DIRECTION_OPERATIONS", name: { fr: "Direction des opérations / COO", en: "Operations Leadership / COO", es: "Dirección de operaciones / COO", de: "Operationsleitung / COO", it: "Direzione operations / COO", ar: "مدير العمليات / COO" } },
    { code: "DIRECTION_TECH", name: { fr: "Direction IT / CTO / CIO", en: "Technology Leadership / CTO / CIO", es: "Dirección tecnológica / CTO / CIO", de: "Technologieleitung / CTO / CIO", it: "Direzione tecnologia / CTO / CIO", ar: "المدير التقني / CTO / CIO" } },
    { code: "TRANSFORMATION", name: { fr: "Transformation / Stratégie", en: "Transformation / Strategy", es: "Transformación / Estrategia", de: "Transformation / Strategie", it: "Trasformazione / Strategia", ar: "التحول والاستراتيجية" } },
  ]},
  { code: "INGENIERIE", name: { fr: "Ingénierie & Sciences", en: "Engineering & Science", es: "Ingeniería y Ciencias", de: "Ingenieurwesen & Wissenschaft", it: "Ingegneria e Scienze", ar: "الهندسة والعلوم" }, subcategories: [
    { code: "INGENIERIE_MECANIQUE", name: { fr: "Ingénierie mécanique", en: "Mechanical Engineering", es: "Ingeniería mecánica", de: "Maschinenbau", it: "Ingegneria meccanica", ar: "الهندسة الميكانيكية" } },
    { code: "INGENIERIE_ELECTRIQUE", name: { fr: "Ingénierie électrique", en: "Electrical Engineering", es: "Ingeniería eléctrica", de: "Elektrotechnik", it: "Ingegneria elettrica", ar: "الهندسة الكهربائية" } },
    { code: "INGENIERIE_ELECTRONIQUE", name: { fr: "Électronique / Systèmes embarqués", en: "Electronics / Embedded Systems", es: "Electrónica / Sistemas embebidos", de: "Elektronik / Embedded Systems", it: "Elettronica / Sistemi embedded", ar: "الإلكترونيات والأنظمة المدمجة" } },
    { code: "INGENIERIE_PROCESS", name: { fr: "Process / Industrial Engineering", en: "Process / Industrial Engineering", es: "Procesos / Ingeniería industrial", de: "Prozess- / Wirtschaftsingenieurwesen", it: "Processi / Ingegneria industriale", ar: "هندسة العمليات" } },
    { code: "ROBOTIQUE", name: { fr: "Robotique / Automatisation", en: "Robotics / Automation", es: "Robótica / Automatización", de: "Robotik / Automatisierung", it: "Robotica / Automazione", ar: "الروبوتات والأتمتة" } },
  ]},
  { code: "SANTE", name: { fr: "Santé & Médico-social", en: "Healthcare & Care", es: "Salud y Atención", de: "Gesundheit & Pflege", it: "Sanità e Cura", ar: "الصحة والرعاية" }, subcategories: [
    { code: "MEDECINS", name: { fr: "Médecins", en: "Medical Doctors", es: "Médicos", de: "Ärzte", it: "Medici", ar: "الأطباء" } },
    { code: "INFIRMIERS", name: { fr: "Infirmiers / Soins", en: "Nursing / Care", es: "Enfermería / Cuidados", de: "Pflege / Betreuung", it: "Infermieristica / Assistenza", ar: "التمريض والرعاية" } },
    { code: "PHARMACIE", name: { fr: "Pharmacie", en: "Pharmacy", es: "Farmacia", de: "Pharmazie", it: "Farmacia", ar: "الصيدلة" } },
    { code: "PARAMEDICAL", name: { fr: "Paramédical", en: "Allied Health", es: "Paramédico", de: "Gesundheitsfachberufe", it: "Professioni sanitarie", ar: "المهن الصحية المساندة" } },
    { code: "SANTE_DIRECTION", name: { fr: "Direction / Management santé", en: "Healthcare Management", es: "Gestión sanitaria", de: "Gesundheitsmanagement", it: "Management sanitario", ar: "إدارة الرعاية الصحية" } },
  ]},
  { code: "ENERGIE_ENVIRONNEMENT", name: { fr: "Énergie & Environnement", en: "Energy & Environment", es: "Energía y Medio Ambiente", de: "Energie & Umwelt", it: "Energia e Ambiente", ar: "الطاقة والبيئة" }, subcategories: [
    { code: "ENERGIES_RENOUVELABLES", name: { fr: "Énergies renouvelables", en: "Renewable Energy", es: "Energías renovables", de: "Erneuerbare Energien", it: "Energie rinnovabili", ar: "الطاقة المتجددة" } },
    { code: "TRANSITION_ENERGETIQUE", name: { fr: "Transition énergétique", en: "Energy Transition", es: "Transición energética", de: "Energiewende", it: "Transizione energetica", ar: "التحول في الطاقة" } },
    { code: "ENVIRONNEMENT", name: { fr: "Environnement / ESG", en: "Environment / ESG", es: "Medio ambiente / ESG", de: "Umwelt / ESG", it: "Ambiente / ESG", ar: "البيئة و ESG" } },
    { code: "VEHICULES_ELECTRIQUES", name: { fr: "Mobilité électrique / véhicules autonomes", en: "Electric / Autonomous Vehicles", es: "Movilidad eléctrica / vehículos autónomos", de: "Elektro- / autonome Fahrzeuge", it: "Mobilità elettrica / veicoli autonomi", ar: "المركبات الكهربائية والمستقلة" } },
  ]},
  { code: "BANQUE_ASSURANCE", name: { fr: "Banque & Assurance", en: "Banking & Insurance", es: "Banca y Seguros", de: "Banken & Versicherungen", it: "Banche e Assicurazioni", ar: "البنوك والتأمين" }, subcategories: [
    { code: "BANQUE", name: { fr: "Banque", en: "Banking", es: "Banca", de: "Bankwesen", it: "Banche", ar: "الخدمات المصرفية" } },
    { code: "ASSURANCE", name: { fr: "Assurance", en: "Insurance", es: "Seguros", de: "Versicherung", it: "Assicurazioni", ar: "التأمين" } },
    { code: "RISQUE_CONFORMITE", name: { fr: "Risques / Compliance / KYC", en: "Risk / Compliance / KYC", es: "Riesgo / Compliance / KYC", de: "Risiko / Compliance / KYC", it: "Rischio / Compliance / KYC", ar: "المخاطر والامتثال" } },
  ]},
  { code: "MARKETING_COMMUNICATION", name: { fr: "Marketing & Communication", en: "Marketing & Communications", es: "Marketing y Comunicación", de: "Marketing & Kommunikation", it: "Marketing e Comunicazione", ar: "التسويق والاتصال" }, subcategories: [
    { code: "MARKETING_DIGITAL", name: { fr: "Marketing digital", en: "Digital Marketing", es: "Marketing digital", de: "Digitales Marketing", it: "Marketing digitale", ar: "التسويق الرقمي" } },
    { code: "CRM", name: { fr: "CRM / Customer Marketing", en: "CRM / Customer Marketing", es: "CRM / Marketing cliente", de: "CRM / Kundenmarketing", it: "CRM / Customer Marketing", ar: "إدارة علاقات العملاء" } },
    { code: "COMMUNICATION", name: { fr: "Communication / Relations publiques", en: "Communications / PR", es: "Comunicación / RR. PP.", de: "Kommunikation / PR", it: "Comunicazione / PR", ar: "الاتصال والعلاقات العامة" } },
    { code: "PRODUIT_MARQUE", name: { fr: "Produit / Brand", en: "Product / Brand", es: "Producto / Marca", de: "Produkt / Marke", it: "Prodotto / Brand", ar: "المنتج والعلامة التجارية" } },
  ]},
  { code: "JURIDIQUE", name: { fr: "Juridique & Compliance", en: "Legal & Compliance", es: "Legal y Compliance", de: "Recht & Compliance", it: "Legale e Compliance", ar: "القانون والامتثال" }, subcategories: [
    { code: "DROIT_AFFAIRES", name: { fr: "Droit des affaires", en: "Business Law", es: "Derecho empresarial", de: "Wirtschaftsrecht", it: "Diritto d'impresa", ar: "قانون الأعمال" } },
    { code: "CONTRACTS", name: { fr: "Contrats", en: "Contracts", es: "Contratos", de: "Verträge", it: "Contratti", ar: "العقود" } },
    { code: "CONFORMITE", name: { fr: "Compliance / RGPD", en: "Compliance / GDPR", es: "Compliance / RGPD", de: "Compliance / DSGVO", it: "Compliance / GDPR", ar: "الامتثال وحماية البيانات" } },
  ]},
  { code: "TRANSPORT_MOBILITE", name: { fr: "Transport & Mobilité", en: "Transport & Mobility", es: "Transporte y Movilidad", de: "Transport & Mobilität", it: "Trasporti e Mobilità", ar: "النقل والتنقل" }, subcategories: [
    { code: "TRANSPORT_ROUTIER", name: { fr: "Transport routier", en: "Road Transport", es: "Transporte por carretera", de: "Straßentransport", it: "Trasporto stradale", ar: "النقل البري" } },
    { code: "AERIEN", name: { fr: "Aérien", en: "Aviation", es: "Aviación", de: "Luftfahrt", it: "Aviazione", ar: "الطيران" } },
    { code: "MARITIME", name: { fr: "Maritime", en: "Maritime", es: "Marítimo", de: "Maritim", it: "Marittimo", ar: "النقل البحري" } },
    { code: "FERROVIAIRE", name: { fr: "Ferroviaire", en: "Rail", es: "Ferroviario", de: "Bahn", it: "Ferroviario", ar: "السكك الحديدية" } },
  ]},
  { code: "AGROALIMENTAIRE", name: { fr: "Agroalimentaire & Agriculture", en: "Food & Agriculture", es: "Agroalimentación y Agricultura", de: "Lebensmittel & Landwirtschaft", it: "Agroalimentare e Agricoltura", ar: "الأغذية والزراعة" }, subcategories: [
    { code: "AGRICULTURE", name: { fr: "Agriculture", en: "Agriculture", es: "Agricultura", de: "Landwirtschaft", it: "Agricoltura", ar: "الزراعة" } },
    { code: "AGRO_PRODUCTION", name: { fr: "Production agroalimentaire", en: "Food Production", es: "Producción alimentaria", de: "Lebensmittelproduktion", it: "Produzione alimentare", ar: "إنتاج الأغذية" } },
    { code: "QUALITE_ALIMENTAIRE", name: { fr: "Qualité / Sécurité alimentaire", en: "Food Quality / Safety", es: "Calidad / Seguridad alimentaria", de: "Lebensmittelqualität / Sicherheit", it: "Qualità / Sicurezza alimentare", ar: "جودة وسلامة الغذاء" } },
  ]},
  { code: "IMMOBILIER", name: { fr: "Immobilier & Construction patrimoniale", en: "Real Estate", es: "Inmobiliario", de: "Immobilien", it: "Immobiliare", ar: "العقارات" }, subcategories: [
    { code: "TRANSACTION", name: { fr: "Transaction", en: "Real Estate Sales", es: "Transacción", de: "Transaktion", it: "Intermediazione", ar: "المعاملات العقارية" } },
    { code: "GESTION_IMMOBILIERE", name: { fr: "Gestion immobilière", en: "Property Management", es: "Gestión inmobiliaria", de: "Immobilienverwaltung", it: "Gestione immobiliare", ar: "إدارة العقارات" } },
    { code: "ASSET_MANAGEMENT", name: { fr: "Asset / Property Management", en: "Asset / Property Management", es: "Asset / Property Management", de: "Asset / Property Management", it: "Asset / Property Management", ar: "إدارة الأصول العقارية" } },
  ]},
  { code: "EDUCATION", name: { fr: "Éducation & Formation", en: "Education & Training", es: "Educación y Formación", de: "Bildung & Weiterbildung", it: "Istruzione e Formazione", ar: "التعليم والتدريب" }, subcategories: [
    { code: "ENSEIGNEMENT", name: { fr: "Enseignement", en: "Teaching", es: "Enseñanza", de: "Lehre", it: "Insegnamento", ar: "التدريس" } },
    { code: "PEDAGOGIE", name: { fr: "Pédagogie / Ingénierie pédagogique", en: "Learning Design", es: "Diseño pedagógico", de: "Lernkonzeption", it: "Progettazione didattica", ar: "التصميم التعليمي" } },
    { code: "FORMATION_PRO", name: { fr: "Formation professionnelle", en: "Professional Training", es: "Formación profesional", de: "Berufliche Weiterbildung", it: "Formazione professionale", ar: "التدريب المهني" } },
  ]},
  { code: "PHARMA_BIOTECH", name: { fr: "Pharma, Biotech & Life Sciences", en: "Pharma, Biotech & Life Sciences", es: "Farma, Biotech y Ciencias de la Vida", de: "Pharma, Biotech & Life Sciences", it: "Pharma, Biotech e Life Sciences", ar: "الأدوية والتكنولوجيا الحيوية" }, subcategories: [
    { code: "PHARMA", name: { fr: "Pharmaceutique", en: "Pharmaceutical", es: "Farmacéutico", de: "Pharma", it: "Farmaceutico", ar: "الصناعات الدوائية" } },
    { code: "BIOTECH", name: { fr: "Biotechnologies", en: "Biotechnology", es: "Biotecnología", de: "Biotechnologie", it: "Biotecnologie", ar: "التكنولوجيا الحيوية" } },
    { code: "CLINICAL_RESEARCH", name: { fr: "Recherche clinique", en: "Clinical Research", es: "Investigación clínica", de: "Klinische Forschung", it: "Ricerca clinica", ar: "البحوث السريرية" } },
  ]},
  { code: "LUXE_MODE", name: { fr: "Luxe, Mode & Beauté", en: "Luxury, Fashion & Beauty", es: "Lujo, Moda y Belleza", de: "Luxus, Mode & Beauty", it: "Lusso, Moda e Beauty", ar: "الفخامة والأزياء والجمال" }, subcategories: [
    { code: "LUXE", name: { fr: "Luxe", en: "Luxury", es: "Lujo", de: "Luxus", it: "Lusso", ar: "الفخامة" } },
    { code: "MODE", name: { fr: "Mode", en: "Fashion", es: "Moda", de: "Mode", it: "Moda", ar: "الأزياء" } },
    { code: "BEAUTE", name: { fr: "Beauté / Cosmétique", en: "Beauty / Cosmetics", es: "Belleza / Cosmética", de: "Beauty / Kosmetik", it: "Beauty / Cosmetica", ar: "الجمال ومستحضرات التجميل" } },
  ]},
  { code: "HOTELLERIE_TOURISME", name: { fr: "Hôtellerie, Restauration & Tourisme", en: "Hospitality, Food & Tourism", es: "Hostelería, Restauración y Turismo", de: "Hotellerie, Gastronomie & Tourismus", it: "Ospitalità, Ristorazione e Turismo", ar: "الضيافة والمطاعم والسياحة" }, subcategories: [
    { code: "HOTELLERIE", name: { fr: "Hôtellerie", en: "Hospitality", es: "Hostelería", de: "Hotellerie", it: "Ospitalità", ar: "الضيافة" } },
    { code: "RESTAURATION", name: { fr: "Restauration", en: "Food Service", es: "Restauración", de: "Gastronomie", it: "Ristorazione", ar: "المطاعم" } },
    { code: "TOURISME", name: { fr: "Tourisme / Voyage", en: "Tourism / Travel", es: "Turismo / Viajes", de: "Tourismus / Reisen", it: "Turismo / Viaggi", ar: "السياحة والسفر" } },
  ]},
  { code: "PUBLIC_ASSOCIATIF", name: { fr: "Public, ONG & Associatif", en: "Public, NGO & Nonprofit", es: "Público, ONG y Asociativo", de: "Öffentlicher Sektor, NGO & Nonprofit", it: "Pubblico, ONG e Nonprofit", ar: "القطاع العام والمنظمات غير الربحية" }, subcategories: [
    { code: "ADMINISTRATION_PUBLIQUE", name: { fr: "Administration publique", en: "Public Administration", es: "Administración pública", de: "Öffentliche Verwaltung", it: "Pubblica amministrazione", ar: "الإدارة العامة" } },
    { code: "ONG", name: { fr: "ONG / Humanitaire", en: "NGO / Humanitarian", es: "ONG / Humanitario", de: "NGO / Humanitär", it: "ONG / Umanitario", ar: "المنظمات غير الحكومية والعمل الإنساني" } },
    { code: "ASSOCIATIF", name: { fr: "Associatif", en: "Nonprofit", es: "Asociativo", de: "Gemeinnützig", it: "Nonprofit", ar: "العمل الجمعوي" } },
  ]},
];

export const RP_TOP_SECTORS = RP_TAXONOMY.map(({ code, name }) => ({ code, name }));
