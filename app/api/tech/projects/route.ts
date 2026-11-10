import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor,isTechActor } from "@/lib/tech/access";
export async function GET(){
 const actor=await getTechActor();if(!isTechActor(actor))return actor;
 const projects=await prisma.techProject.findMany({orderBy:{updatedAt:"desc"},take:200,include:{techProspect:{select:{id:true,companyName:true}},proposal:{select:{id:true,reference:true,title:true}},tasks:{orderBy:{createdAt:"desc"}},milestones:{orderBy:{dueAt:"asc"}}}});
 return NextResponse.json({projects});
}
export async function POST(request:Request){
 const actor=await getTechActor();if(!isTechActor(actor))return actor;
 if(!actor.isOwner)return NextResponse.json({error:"Création de projet réservée à l'OWNER."},{status:403});
 const b=await request.json().catch(()=>null);if(!b||typeof b.proposalId!=="string")return NextResponse.json({error:"Proposition requise."},{status:400});
 const proposal=await prisma.techProposal.findUnique({where:{id:b.proposalId}});
 if(!proposal||proposal.status!=="APPROUVEE")return NextResponse.json({error:"Seule une proposition approuvée peut devenir un projet."},{status:409});
 const exists=await prisma.techProject.findUnique({where:{proposalId:proposal.id}});if(exists)return NextResponse.json({error:"Un projet existe déjà pour cette proposition.",project:exists},{status:409});
 const project=await prisma.$transaction(async tx=>{
  const p=await tx.techProject.create({data:{name:proposal.title,description:proposal.solution,techProspectId:proposal.techProspectId,proposalId:proposal.id,projectManagerUserId:actor.userId,currency:proposal.currency}});
  await tx.techProjectEvent.create({data:{eventType:"PROJECT_CREATED",note:p.reference,actorUserId:actor.userId,actorRole:actor.role,techProjectId:p.id}});
  await tx.techProspect.update({where:{id:proposal.techProspectId},data:{status:"SIGNE"}});
  await tx.techProspectEvent.create({data:{eventType:"STATUS_CHANGED",fromValue:"PROPOSITION",toValue:"SIGNE",note:"Projet créé depuis une proposition approuvée",actorUserId:actor.userId,actorRole:actor.role,techProspectId:proposal.techProspectId}});
  await tx.auditLog.create({data:{actorUserId:actor.userId,actorRole:actor.role,action:"TECH_PROJECT_CREATED",targetType:"TECH_PROJECT",targetId:p.id,details:{proposalId:proposal.id,reference:p.reference}}});
  return p;
 });
 return NextResponse.json({project},{status:201});
}
