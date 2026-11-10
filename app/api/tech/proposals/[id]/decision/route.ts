import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor,isTechActor } from "@/lib/tech/access";
type Ctx={params:Promise<{id:string}>};
export async function POST(request:Request,context:Ctx){
 const actor=await getTechActor();if(!isTechActor(actor))return actor;
 if(!actor.isOwner)return NextResponse.json({error:"Décision réservée à l'OWNER."},{status:403});
 const {id}=await context.params;const b=await request.json().catch(()=>null);
 if(!b||!["APPROUVEE","REFUSEE"].includes(b.decision))return NextResponse.json({error:"Décision invalide."},{status:400});
 const current=await prisma.techProposal.findUnique({where:{id}});if(!current)return NextResponse.json({error:"Proposition introuvable."},{status:404});
 if(current.status!=="DRAFT"&&current.status!=="A_REVOIR")return NextResponse.json({error:"Proposition déjà décidée."},{status:409});
 const proposal=await prisma.$transaction(async tx=>{
  const p=await tx.techProposal.update({where:{id},data:{status:b.decision,approvedAt:b.decision==="APPROUVEE"?new Date():null,approvedByUserId:actor.userId,decisionNote:typeof b.note==="string"?b.note.trim().slice(0,2000):null}});
  await tx.techProspectEvent.create({data:{eventType:"PROPOSAL_DECISION",note:b.decision,actorUserId:actor.userId,actorRole:actor.role,techProspectId:p.techProspectId}});
  await tx.auditLog.create({data:{actorUserId:actor.userId,actorRole:actor.role,action:"TECH_PROPOSAL_DECISION",targetType:"TECH_PROPOSAL",targetId:id,details:{decision:b.decision}}});
  return p;
 });
 return NextResponse.json({proposal});
}
