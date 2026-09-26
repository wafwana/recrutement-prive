"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { analyzeAndMatchJob } from "@/lib/jobs/automation";
import { analyzeRawOffer, enrichCompanyFromAnalysis, extractEmailFromText, fetchPublicOfferUrl, sendRawOfferOutreach, sourceFingerprint } from "@/lib/sourcing/raw-offer";

async function ownerId(){const s=await auth();if(!s?.user?.id||s.user.role!=="OWNER")throw new Error("Accès réservé à l'OWNER.");return s.user.id;}
async function taxonomy(){return prisma.jobCategory.findMany({where:{isActive:true},select:{id:true,code:true,name:true,parentId:true,sortOrder:true},orderBy:[{parentId:"asc"},{sortOrder:"asc"}]});}

async function companyFromAnalysis(a:NonNullable<Awaited<ReturnType<typeof analyzeRawOffer>>>){
 const d=await enrichCompanyFromAnalysis(a);if(!d)return null;
 const ors=[];if(d.siret)ors.push({siret:d.siret});if(d.name)ors.push({name:d.name});
 let c=ors.length?await prisma.company.findFirst({where:{OR:ors}}):null;
 const data={siret:d.siret,siren:d.siren,legalForm:d.legalForm,apeCode:d.apeCode,address:d.address,country:d.country,website:d.website,sourceType:d.sourceType,sourceUrl:d.sourceUrl,sourceCollectedAt:d.sourceCollectedAt,contactEmail:d.contactEmail,contactEmailSourceUrl:d.contactEmailSourceUrl,contactEmailCollectedAt:d.contactEmail?new Date():null};
 if(c)return prisma.company.update({where:{id:c.id},data:{...data,siret:c.siret||data.siret,siren:c.siren||data.siren,legalForm:c.legalForm||data.legalForm,apeCode:c.apeCode||data.apeCode,address:c.address||data.address,country:c.country||data.country,website:c.website||data.website,contactEmail:c.contactEmail||data.contactEmail,contactEmailSourceUrl:c.contactEmailSourceUrl||data.contactEmailSourceUrl,contactEmailCollectedAt:c.contactEmailCollectedAt||data.contactEmailCollectedAt}});
 return prisma.company.create({data:{name:d.name,...data}});
}

export async function processOwnerRawOffer(formData:FormData){
 const actor=await ownerId();const externalJobId=String(formData.get("externalJobId")||"").trim();let sourceUrl=String(formData.get("sourceUrl")||"").trim()||null;
 let rawText=String(formData.get("rawText")||"").trim();let source:{title?:string|null;companyName?:string|null;country?:string|null;city?:string|null;rawData?:unknown}={};
 if(externalJobId){const e=await prisma.externalJobOpportunity.findUnique({where:{id:externalJobId}});if(!e)throw new Error("Offre source introuvable.");source={title:e.title,companyName:e.companyName,country:e.country,city:e.city,rawData:e.rawData};sourceUrl=e.sourceUrl||sourceUrl;rawText=e.description||"";if(!rawText&&e.rawData)rawText=JSON.stringify(e.rawData);}
 else if(sourceUrl){const f=await fetchPublicOfferUrl(sourceUrl);sourceUrl=f.url;rawText=f.text;}
 else {const file=formData.get("offerFile");if(file instanceof File&&file.size){if(!/^(text\/(plain|html)|application\/(json|xhtml\+xml))$/i.test(file.type||""))throw new Error("Fichier accepté actuellement : TXT, HTML ou JSON.");rawText=(await file.text()).slice(0,30000);}}
 const parsed=z.string().trim().min(80,"L'offre brute est trop courte.").max(30000).safeParse(rawText);if(!parsed.success)throw new Error(parsed.error.issues[0]?.message||"Offre invalide.");
 const rows=await taxonomy();const a=await analyzeRawOffer({rawText:parsed.data,source:{...source,sourceUrl},taxonomy:rows.map(r=>({code:r.code,name:typeof r.name==="object"&&r.name!==null?String((r.name as Record<string,unknown>).fr??r.code):r.code,parentCode:rows.find(p=>p.id===r.parentId)?.code??null}))});if(!a)throw new Error("Le moteur IA n'est pas disponible : OPENAI_API_KEY est absent.");
 if(!a.contactEmail){const e=extractEmailFromText(parsed.data);if(e)a.contactEmail=e;}
 const company=await companyFromAnalysis(a);if(!company)throw new Error("L'entreprise n'a pas pu être identifiée.");
 const valid=new Set(rows.map(r=>r.code));const cat=a.categoryCode&&valid.has(a.categoryCode)?rows.find(r=>r.code===a.categoryCode&&r.parentId===null):null;
 const sub=a.subCategoryCode&&valid.has(a.subCategoryCode)?rows.find(r=>r.code===a.subCategoryCode&&r.parentId===cat?.id):null;
 const fingerprint=sourceFingerprint({sourceUrl,rawText:parsed.data});const now=new Date();
 const external=await prisma.externalJobOpportunity.upsert({where:{source_externalId:{source:"OWNER_RAW",externalId:fingerprint}},create:{externalId:fingerprint,source:"OWNER_RAW",sourceUrl,sourceType:"OWNER_RAW_OFFER",sourceCollectedAt:now,title:a.title,companyName:company.name,country:a.country,city:a.city,categoryCode:cat?.code||null,subCategoryCode:sub?.code||null,skills:a.skills,experienceYears:a.experienceYears,language:a.language,description:parsed.data.slice(0,30000),rawData:{analysis:a,inputSource:source.rawData??null},status:a.inPlatformScope?"QUALIFIED":"A_QUALIFIER"},update:{sourceUrl,sourceType:"OWNER_RAW_OFFER",sourceCollectedAt:now,title:a.title,companyName:company.name,country:a.country,city:a.city,categoryCode:cat?.code||null,subCategoryCode:sub?.code||null,skills:a.skills,experienceYears:a.experienceYears,language:a.language,description:parsed.data.slice(0,30000),rawData:{analysis:a,inputSource:source.rawData??null},status:a.inPlatformScope?"QUALIFIED":"A_QUALIFIER"}});
 const existing=await prisma.enterpriseSourcedOffer.findUnique({where:{companyId_externalJobId:{companyId:company.id,externalJobId:external.id}}});
 let jobId:string|null=null;let matching:unknown=existing?.matching??null;
 if(a.inPlatformScope&&!existing){const j=await prisma.job.create({data:{companyId:company.id,title:a.title,location:a.location||a.city,description:a.summary||parsed.data.slice(0,10000),requiredSkills:a.skills,requiredExperienceYears:a.experienceYears,missionType:a.missionType,jobCategoryId:cat?.id||null,subCategoryId:sub?.id||null,status:"DRAFT"}});jobId=j.id;const m=await analyzeAndMatchJob({jobId:j.id,actorUserId:actor,actorRole:"OWNER"});matching=m.matches;await prisma.recruitmentHistory.create({data:{jobId:j.id,actorUserId:actor,action:"JOB_IMPORTED_FROM_RAW_OFFER",toStatus:j.status,details:{source:"OWNER_RAW_OFFER",externalJobId:external.id}}});}
 const recipient=a.contactEmail||company.contactEmail||null;let outreachStatus=recipient?"PREPARED":"NO_CONTACT";let sentAt:Date|null=null;let messageId:string|null=null;
 if(recipient&&process.env.RP_AUTO_OUTREACH_ENABLED==="true"&&a.outreachBody){const sent=await sendRawOfferOutreach({recipient,subject:a.outreachSubject,body:a.outreachBody});if(sent.ok){outreachStatus="SENT";sentAt=new Date();messageId=sent.id||null;}else outreachStatus="SEND_FAILED";}
 const analysis=JSON.parse(JSON.stringify({...a,sourceType:"OWNER_RAW_OFFER",sourceUrl,outreach:{recipient,subject:a.outreachSubject,body:a.outreachBody,status:outreachStatus,sentAt,messageId}}));\n const safeMatching=matching==null?null:JSON.parse(JSON.stringify(matching));
 await prisma.enterpriseSourcedOffer.upsert({where:{companyId_externalJobId:{companyId:company.id,externalJobId:external.id}},create:{companyId:company.id,externalJobId:external.id,selectedCountry:a.country||"",status:a.inPlatformScope?"QUALIFIED":"OUT_OF_SCOPE",analysis,matching:safeMatching,analyzedAt:now},update:{selectedCountry:a.country||"",status:a.inPlatformScope?"QUALIFIED":"OUT_OF_SCOPE",analysis,matching:safeMatching,analyzedAt:now}});
 await prisma.auditLog.create({data:{actorUserId:actor,actorRole:"OWNER",action:"OWNER_RAW_OFFER_FULL_PROCESSING",targetType:"ExternalJobOpportunity",targetId:external.id,details:{companyId:company.id,jobId,inPlatformScope:a.inPlatformScope,matchCount:Array.isArray(matching)?matching.length:0,outreachStatus,sourceUrl}}});
 revalidatePath("/espace/owner/offres-vivier");return{ok:true,externalJobId:external.id,companyId:company.id,jobId,title:a.title,companyName:company.name,matchCount:Array.isArray(matching)?matching.length:0,outreachStatus,difficultRoles:a.difficultRoles};
}
