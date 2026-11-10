import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor, isTechActor } from "@/lib/tech/access";
const str=(v:unknown)=>typeof v==="string"?v.trim():"";
export async function GET() {
 const actor=await getTechActor(); if(!isTechActor(actor)) return actor;
 const proposals=await prisma.techProposal.findMany({orderBy:{createdAt:"desc"},take:200,include:{techProspect:{select:{id:true,companyName:true}},project:{select:{id:true}}}});
 return NextResponse.json({proposals});
}
export async function POST(request:Request) {
 const actor=await getTechActor(); if(!isTechActor(actor)) return actor;
 const b=await request.json().catch(()=>null);
 if(!b||!str(b.title)||!str(b.techProspectId)) return NextResponse.json({error:"Prospect et titre obligatoires."},{status:400});
 const prospect=await prisma.techProspect.findUnique({where:{id:str(b.techProspectId)},select:{id:true}});
 if(!prospect) return NextResponse.json({error:"Prospect introuvable."},{status:404});
 const proposal=await prisma.$transaction(async tx=>{
  const p=await tx.techProposal.create({data:{title:str(b.title),problem:str(b.problem)||null,solution:str(b.solution)||null,deliverables:Array.isArray(b.deliverables)?b.deliverables:[],milestones:Array.isArray(b.milestones)?b.milestones:[],assumptions:Array.isArray(b.assumptions)?b.assumptions:[],conditions:str(b.conditions)||null,maintenance:str(b.maintenance)||null,options:Array.isArray(b.options)?b.options:[],estimate:b.estimate&&typeof b.estimate==="object"?b.estimate:{},currency:str(b.currency)||"EUR",techProspectId:prospect.id,createdByUserId:actor.userId}});
  await tx.techProspectEvent.create({data:{eventType:"PROPOSAL_CREATED",note:p.reference,actorUserId:actor.userId,actorRole:actor.role,techProspectId:prospect.id}});
  await tx.auditLog.create({data:{actorUserId:actor.userId,actorRole:actor.role,action:"TECH_PROPOSAL_CREATED",targetType:"TECH_PROPOSAL",targetId:p.id,details:{reference:p.reference,prospectId:prospect.id}}});
  return p;
 });
 return NextResponse.json({proposal},{status:201});
}
