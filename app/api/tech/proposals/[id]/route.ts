import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor,isTechActor } from "@/lib/tech/access";
type Ctx={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Ctx){
 const actor=await getTechActor();if(!isTechActor(actor))return actor;
 const {id}=await context.params;const b=await request.json().catch(()=>null);
 if(!b||typeof b!=="object")return NextResponse.json({error:"Données invalides."},{status:400});
 const current=await prisma.techProposal.findUnique({where:{id}});if(!current)return NextResponse.json({error:"Proposition introuvable."},{status:404});
 if(["APPROUVEE","REFUSEE","ENVOYEE","ACCEPTEE"].includes(current.status))return NextResponse.json({error:"Cette proposition est verrouillée après décision."},{status:409});
 const data:Record<string,unknown>={};
 for(const k of ["title","problem","solution","conditions","maintenance","currency"] as const)if(k in b)data[k]=typeof b[k]==="string"?b[k].trim()||null:null;
 for(const k of ["deliverables","milestones","assumptions","options"] as const)if(k in b)data[k]=Array.isArray(b[k])?b[k]:[];
 if("estimate" in b)data.estimate=b.estimate&&typeof b.estimate==="object"?b.estimate:{};
 if(!Object.keys(data).length)return NextResponse.json({error:"Aucune modification fournie."},{status:400});
 const proposal=await prisma.$transaction(async tx=>{
  const p=await tx.techProposal.update({where:{id},data});
  await tx.auditLog.create({data:{actorUserId:actor.userId,actorRole:actor.role,action:"TECH_PROPOSAL_UPDATED",targetType:"TECH_PROPOSAL",targetId:id,details:{fields:Object.keys(data)}}});
  return p;
 });
 return NextResponse.json({proposal});
}
