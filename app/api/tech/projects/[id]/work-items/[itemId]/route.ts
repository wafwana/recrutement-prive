import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor,isTechActor } from "@/lib/tech/access";
type Ctx={params:Promise<{id:string;itemId:string}>};
export async function PATCH(request:Request,context:Ctx){
 const actor=await getTechActor();if(!isTechActor(actor))return actor;
 const {id,itemId}=await context.params;const b=await request.json().catch(()=>null);
 if(!b||!["TASK","MILESTONE"].includes(b.kind))return NextResponse.json({error:"Type d'élément invalide."},{status:400});
 const status=typeof b.status==="string"?b.status:"";
 if(!["A_FAIRE","EN_COURS","TERMINE","BLOQUE"].includes(status))return NextResponse.json({error:"Statut invalide."},{status:400});
 const result=await prisma.$transaction(async tx=>{
  const item=b.kind==="TASK"?await tx.techProjectTask.updateMany({where:{id:itemId,techProjectId:id},data:{status,completedAt:status==="TERMINE"?new Date():null}}):await tx.techProjectMilestone.updateMany({where:{id:itemId,techProjectId:id},data:{status,completedAt:status==="TERMINE"?new Date():null}});
  if(!item.count)return null;
  await tx.techProjectEvent.create({data:{eventType:b.kind+"_STATUS_CHANGED",toValue:status,note:itemId,actorUserId:actor.userId,actorRole:actor.role,techProjectId:id}});
  await tx.auditLog.create({data:{actorUserId:actor.userId,actorRole:actor.role,action:"TECH_WORK_ITEM_UPDATED",targetType:b.kind,targetId:itemId,details:{projectId:id,status}}});
  return b.kind==="TASK"?tx.techProjectTask.findUnique({where:{id:itemId}}):tx.techProjectMilestone.findUnique({where:{id:itemId}});
 });
 if(!result)return NextResponse.json({error:"Élément introuvable pour ce projet."},{status:404});
 return NextResponse.json({item:result});
}
