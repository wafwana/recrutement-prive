import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor,isTechActor } from "@/lib/tech/access";
type Ctx={params:Promise<{id:string}>};
export async function POST(request:Request,context:Ctx){
 const actor=await getTechActor();if(!isTechActor(actor))return actor;
 const {id}=await context.params;const b=await request.json().catch(()=>null);
 if(!b||!["TASK","MILESTONE"].includes(b.kind)||typeof b.title!=="string"||!b.title.trim())return NextResponse.json({error:"Type et titre requis."},{status:400});
 const project=await prisma.techProject.findUnique({where:{id},select:{id:true}});if(!project)return NextResponse.json({error:"Projet introuvable."},{status:404});
 let dueAt:Date|null=null;if(b.dueAt){dueAt=new Date(b.dueAt);if(Number.isNaN(dueAt.getTime()))return NextResponse.json({error:"Échéance invalide."},{status:400});}
 const item=await prisma.$transaction(async tx=>{
  const data={title:b.title.trim().slice(0,200),description:typeof b.description==="string"?b.description.trim().slice(0,5000):null,dueAt,techProjectId:id};
  const created=b.kind==="TASK"?await tx.techProjectTask.create({data:{...data,assigneeUserId:typeof b.assigneeUserId==="string"?b.assigneeUserId:null}}):await tx.techProjectMilestone.create({data});
  await tx.techProjectEvent.create({data:{eventType:b.kind+"_CREATED",note:created.title,actorUserId:actor.userId,actorRole:actor.role,techProjectId:id}});
  await tx.auditLog.create({data:{actorUserId:actor.userId,actorRole:actor.role,action:"TECH_WORK_ITEM_CREATED",targetType:b.kind,targetId:created.id,details:{projectId:id,title:created.title}}});
  return created;
 });
 return NextResponse.json({item},{status:201});
}
