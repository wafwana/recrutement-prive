import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor,isTechActor } from "@/lib/tech/access";
type Ctx={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Ctx){
 const actor=await getTechActor();if(!isTechActor(actor))return actor;
 const {id}=await context.params;const b=await request.json().catch(()=>null);
 if(!b||typeof b!=="object")return NextResponse.json({error:"Données invalides."},{status:400});
 const current=await prisma.techRequirementDoc.findUnique({where:{id}});if(!current)return NextResponse.json({error:"Cahier des charges introuvable."},{status:404});
 const allowed=["DEPOSE","ANALYSE_EN_COURS","ANALYSE_TERMINEE","VALIDE","REJETE"];
 if("status" in b&&(!allowed.includes(b.status)||b.status==="VALIDE"&&!actor.isOwner))return NextResponse.json({error:b.status==="VALIDE"?"Validation finale réservée à l'OWNER.":"Statut invalide."},{status:403});
 const data:Record<string,unknown>={};
 if("status" in b)data.status=b.status;
 if("featuresAnalysis" in b)data.featuresAnalysis=b.featuresAnalysis&&typeof b.featuresAnalysis==="object"?b.featuresAnalysis:{};
 if("estimatedQuote" in b)data.estimatedQuote=b.estimatedQuote&&typeof b.estimatedQuote==="object"?b.estimatedQuote:{};
 const doc=await prisma.$transaction(async tx=>{
  const updated=await tx.techRequirementDoc.update({where:{id},data});
  await tx.techProspectEvent.create({data:{eventType:"REQUIREMENT_UPDATED",note:updated.title+" · "+Object.keys(data).join(","),actorUserId:actor.userId,actorRole:actor.role,techProspectId:updated.techProspectId}});
  await tx.auditLog.create({data:{actorUserId:actor.userId,actorRole:actor.role,action:"TECH_REQUIREMENT_UPDATED",targetType:"TECH_REQUIREMENT",targetId:id,details:{fields:Object.keys(data)}}});
  return updated;
 });
 return NextResponse.json({document:doc});
}
