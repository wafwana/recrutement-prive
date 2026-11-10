import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor,isTechActor } from "@/lib/tech/access";
type Ctx={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Ctx){
 const actor=await getTechActor();if(!isTechActor(actor))return actor;
 const {id}=await context.params;const doc=await prisma.techRequirementDoc.findUnique({where:{id},select:{fileData:true,fileName:true,mimeType:true,fileSha256:true}});
 if(!doc?.fileData)return NextResponse.json({error:"Fichier introuvable."},{status:404});
 const safeName=(doc.fileName||"document").replace(/[\r\n"]/g,"_");
 return new Response(new Uint8Array(doc.fileData),{headers:{"Content-Type":doc.mimeType||"application/octet-stream","Content-Disposition":`attachment; filename="${safeName}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-Original-SHA256":doc.fileSha256||""}});
}
