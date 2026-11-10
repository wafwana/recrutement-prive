import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { prisma } from "@/lib/prisma";
import { getTechActor,isTechActor } from "@/lib/tech/access";
export const runtime="nodejs";
const MAX_BYTES=15*1024*1024;
export async function POST(request:Request){
 const actor=await getTechActor();if(!isTechActor(actor))return actor;
 const form=await request.formData();
 const prospectId=String(form.get("prospectId")||"");const file=form.get("file");
 if(!(file instanceof File)||!prospectId)return NextResponse.json({error:"Prospect et fichier requis."},{status:400});
 if(file.size<1||file.size>MAX_BYTES)return NextResponse.json({error:"Le fichier doit peser au maximum 15 Mo."},{status:413});
 const allowed=new Set(["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain","text/markdown"]);
 if(!allowed.has(file.type))return NextResponse.json({error:"Formats acceptés : PDF, DOCX, TXT et Markdown."},{status:415});
 const prospect=await prisma.techProspect.findUnique({where:{id:prospectId},select:{id:true}});
 if(!prospect)return NextResponse.json({error:"Prospect introuvable."},{status:404});
 const bytes=Buffer.from(await file.arrayBuffer());
 if(file.type==="application/pdf"&&!bytes.subarray(0,5).equals(Buffer.from("%PDF-")))return NextResponse.json({error:"Signature PDF invalide."},{status:415});
 if(file.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"&&!(bytes[0]===0x50&&bytes[1]===0x4b))return NextResponse.json({error:"Signature DOCX invalide."},{status:415});
 let extractedText:string|null=null;
 try{
  if(file.type==="text/plain"||file.type==="text/markdown")extractedText=bytes.toString("utf8").slice(0,500000);
  else if(file.type==="application/pdf"){const parser=new PDFParse({data:bytes});try{const parsed=await parser.getText();extractedText=parsed.text.slice(0,500000);}finally{await parser.destroy();}}
  else if(file.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"){const parsed=await mammoth.extractRawText({buffer:bytes});extractedText=parsed.value.slice(0,500000);}
 }catch{return NextResponse.json({error:"Le document est stocké, mais son extraction de texte a échoué. Vérifiez le fichier."},{status:422});}
 const doc=await prisma.$transaction(async tx=>{
  const created=await tx.techRequirementDoc.create({data:{title:file.name.slice(0,240),fileName:file.name.slice(0,240),mimeType:file.type,fileSize:bytes.length,fileSha256:createHash("sha256").update(bytes).digest("hex"),fileData:bytes,extractedText,techProspectId:prospectId,createdByUserId:actor.userId}});
  await tx.techProspectEvent.create({data:{eventType:"REQUIREMENT_UPLOADED",note:file.name,actorUserId:actor.userId,actorRole:actor.role,techProspectId:prospectId}});
  await tx.auditLog.create({data:{actorUserId:actor.userId,actorRole:actor.role,action:"TECH_REQUIREMENT_UPLOADED",targetType:"TECH_REQUIREMENT",targetId:created.id,details:{prospectId,fileName:file.name,fileSize:bytes.length,sha256:created.fileSha256}}});
  return created;
 });
 return NextResponse.json({document:{id:doc.id,title:doc.title,fileName:doc.fileName,status:doc.status,extractedText:doc.extractedText,featuresAnalysis:doc.featuresAnalysis,estimatedQuote:doc.estimatedQuote}},{status:201});
}
