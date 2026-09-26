import OpenAI from "openai";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { lookupCompanyBySiret } from "@/lib/company/public-registry";
import { sendEmail } from "@/lib/email/service";

export type RawOfferAnalysis = {
  title:string; companyName:string|null; companySiret:string|null; country:string|null; city:string|null;
  location:string|null; skills:string[]; experienceYears:number|null; language:string|null; missionType:string|null;
  categoryCode:string|null; subCategoryCode:string|null; summary:string; companyActivitySummary:string;
  companyNeedSummary:string; difficultRoles:{title:string;skills:string[];why:string;basis:"OFFER_FACT"|"COMPANY_HYPOTHESIS"}[];
  contactEmail:string|null; website:string|null; inPlatformScope:boolean; scopeReason:string; confidence:number;
  outreachSubject:string; outreachBody:string;
};
const schema={type:"object",additionalProperties:false,properties:{
 title:{type:"string"},companyName:{type:["string","null"]},companySiret:{type:["string","null"]},
 country:{type:["string","null"]},city:{type:["string","null"]},location:{type:["string","null"]},
 skills:{type:"array",items:{type:"string"}},experienceYears:{type:["number","null"]},language:{type:["string","null"]},
 missionType:{type:["string","null"]},categoryCode:{type:["string","null"]},subCategoryCode:{type:["string","null"]},
 summary:{type:"string"},companyActivitySummary:{type:"string"},companyNeedSummary:{type:"string"},
 difficultRoles:{type:"array",items:{type:"object",additionalProperties:false,properties:{
   title:{type:"string"},skills:{type:"array",items:{type:"string"}},why:{type:"string"},
   basis:{type:"string",enum:["OFFER_FACT","COMPANY_HYPOTHESIS"]}},required:["title","skills","why","basis"]}},
 contactEmail:{type:["string","null"]},website:{type:["string","null"]},inPlatformScope:{type:"boolean"},
 scopeReason:{type:"string"},confidence:{type:"number"},outreachSubject:{type:"string"},outreachBody:{type:"string"}
},required:["title","companyName","companySiret","country","city","location","skills","experienceYears","language",
"missionType","categoryCode","subCategoryCode","summary","companyActivitySummary","companyNeedSummary","difficultRoles",
"contactEmail","website","inPlatformScope","scopeReason","confidence","outreachSubject","outreachBody"]} as const;

const clean=(v:unknown)=>typeof v==="string"&&v.trim()?v.trim():null;
const strings=(v:unknown)=>Array.isArray(v)?[...new Set(v.filter((x):x is string=>typeof x==="string").map(x=>x.trim()).filter(Boolean))]:[];
const email=(v:string|null)=>v&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&!/^(no-reply|noreply|donotreply|do-not-reply)@/i.test(v)?v.toLowerCase():null;
const siret=(v:string|null)=>{const d=v?.replace(/\D/g,"")||"";return /^\d{14}$/.test(d)?d:null;};

function htmlText(v:string){return v.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi," ")
 .replace(/<br\s*\/?\s*>/gi,"\n").replace(/<\/p\s*>|<\/div\s*>/gi,"\n").replace(/<[^>]+>/g," ")
 .replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
 .replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/[ \t]+/g," ").replace(/\n\s+/g,"\n").replace(/\n{3,}/g,"\n\n").trim();}

function safeUrl(raw:string){let u:URL;try{u=new URL(raw)}catch{throw new Error("URL d'offre invalide.")} if(!["http:","https:"].includes(u.protocol)||u.username||u.password)throw new Error("URL d'offre non autorisée.");
 const h=u.hostname.toLowerCase(); if(h==="localhost"||h.endsWith(".local")||h==="0.0.0.0")throw new Error("URL locale refusée.");
 if(isIP(h)){const p=h.split(".").map(Number);const privateV4=h.startsWith("10.")||h.startsWith("127.")||h.startsWith("169.254.")||h.startsWith("192.168.")||(p[0]===172&&p[1]>=16&&p[1]<=31);if(privateV4||h==="::1")throw new Error("Adresse privée refusée.");} return u;}

export async function fetchPublicOfferUrl(raw:string){const u=safeUrl(raw);const r=await fetch(u,{redirect:"follow",cache:"no-store",headers:{accept:"text/html,text/plain,application/xhtml+xml","user-agent":"Recrutement-Prive/1.0 (+https://recrutement-prive.com)"},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error(`Impossible de lire l'offre (HTTP ${r.status}).`);const ct=r.headers.get("content-type")||"";if(!/text\/(html|plain)|application\/xhtml\+xml/i.test(ct))throw new Error("Source non textuelle.");
 const text=htmlText((await r.text()).slice(0,500000)).slice(0,30000);if(text.length<80)throw new Error("Contenu d'offre insuffisant.");return{url:r.url,text};}

export async function analyzeRawOffer(input:{rawText:string;source:{title?:string|null;companyName?:string|null;country?:string|null;city?:string|null;sourceUrl?:string|null};taxonomy:{code:string;name:string;parentCode?:string|null}[]}):Promise<RawOfferAnalysis|null>{
 if(!process.env.OPENAI_API_KEY)return null;const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
 const taxonomy=input.taxonomy.map(x=>`${x.code} — ${x.name}${x.parentCode?` (parent: ${x.parentCode})`:""}`).join("\n");
 const r=await client.responses.create({model:process.env.OPENAI_JOB_MODEL||"gpt-4.1-mini",input:[{role:"user",content:[{type:"input_text",text:`Analyse cette offre brute pour Recrutement Privé, sans inventer de faits.
Structure le poste, identifie l'entreprise seulement si elle est réellement mentionnée, extrait compétences/expérience/localisation/type de mission, classe avec la taxonomie fournie et résume le besoin.
Propose 3 à 4 postes potentiellement difficiles à recruter à partir des éléments disponibles. Tout poste non explicitement présent doit être marqué COMPANY_HYPOTHESIS et ne doit jamais être présenté comme un fait.
Prépare un premier email très court (maximum 140 mots), personnalisé, montrant que RP a compris le besoin; mentionne 1 à 3 compétences réelles et pourquoi elles comptent; indique que RP peut se positionner sur une recherche difficile, sans promettre de candidat ni de résultat.
Ne fabrique jamais email, site, salaire, compétence, activité, expérience ou donnée juridique. N'utilise aucun critère sensible.
Contexte: titre=${input.source.title||"(non précisé)"}; entreprise=${input.source.companyName||"(non précisée)"}; pays=${input.source.country||"(non précisé)"}; ville=${input.source.city||"(non précisée)"}; URL=${input.source.sourceUrl||"(non précisée)"}.
OFFRE:
${input.rawText.slice(0,30000)}
TAXONOMIE:
${taxonomy||"(aucune)"}`}]}}],text:{format:{type:"json_schema",name:"raw_offer_analysis",strict:true,schema}}});
 if(!r.output_text)return null;const p=JSON.parse(r.output_text) as RawOfferAnalysis;
 return {title:clean(p.title)||input.source.title||"Offre à qualifier",companyName:clean(p.companyName)||clean(input.source.companyName),
 companySiret:siret(clean(p.companySiret)),country:clean(p.country)||clean(input.source.country),city:clean(p.city)||clean(input.source.city),
 location:clean(p.location),skills:strings(p.skills).slice(0,30),experienceYears:typeof p.experienceYears==="number"&&Number.isFinite(p.experienceYears)?Math.max(0,Math.min(60,Math.round(p.experienceYears))):null,
 language:clean(p.language),missionType:clean(p.missionType),categoryCode:clean(p.categoryCode),subCategoryCode:clean(p.subCategoryCode),
 summary:clean(p.summary)||"",companyActivitySummary:clean(p.companyActivitySummary)||"",companyNeedSummary:clean(p.companyNeedSummary)||"",
 difficultRoles:Array.isArray(p.difficultRoles)?p.difficultRoles.slice(0,4).map(x=>({title:clean(x.title)||"Poste à préciser",skills:strings(x.skills).slice(0,8),why:clean(x.why)||"",basis:x.basis==="OFFER_FACT"?"OFFER_FACT" as const:"COMPANY_HYPOTHESIS" as const})):[],
 contactEmail:email(clean(p.contactEmail)),website:clean(p.website),inPlatformScope:p.inPlatformScope===true,scopeReason:clean(p.scopeReason)||"",
 confidence:typeof p.confidence==="number"&&Number.isFinite(p.confidence)?Math.max(0,Math.min(1,p.confidence)):0,
 outreachSubject:clean(p.outreachSubject)||"Recrutement — échange sur votre besoin",outreachBody:clean(p.outreachBody)||""};}

export function extractEmailFromText(v:string){const found=v.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[];return found.map(x=>email(x)).find(Boolean)||null;}
export function sourceFingerprint(v:{sourceUrl?:string|null;rawText:string}){return createHash("sha256").update(`${v.sourceUrl||""}\n${v.rawText}`).digest("hex");}

export async function enrichCompanyFromAnalysis(a:RawOfferAnalysis){let pub=null;if(a.companySiret&&a.country?.toLowerCase().includes("fr")){try{pub=await lookupCompanyBySiret(a.companySiret)}catch{}}
 if(!a.companyName&&!a.companySiret)return null;return {name:pub?.name||a.companyName||"Entreprise à identifier",siret:pub?.siret||a.companySiret,siren:pub?.siren||null,
 legalForm:pub?.legalForm||null,apeCode:pub?.apeCode||null,address:pub?.address?[pub.address,pub.postalCode,pub.city].filter(Boolean).join(", "):null,
 country:pub?.country||a.country||null,website:pub?.website||a.website||null,sourceType:pub?.sourceType||"OFFER_SOURCE",sourceUrl:pub?.sourceUrl||null,
 sourceCollectedAt:pub?.collectedAt?new Date(pub.collectedAt):new Date(),contactEmail:a.contactEmail,contactEmailSourceUrl:a.contactEmail?(a.website||null):null};}

export async function sendRawOfferOutreach(v:{recipient:string;subject:string;body:string}){return sendEmail({to:v.recipient,subject:v.subject,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:640px">${v.body.split("\n").map(x=>`<p>${x}</p>`).join("")}<p style="margin-top:24px;color:#666;font-size:12px">Recrutement Privé</p></div>`});}
