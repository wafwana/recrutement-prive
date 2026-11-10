import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTechActor,isTechActor } from "@/lib/tech/access";
type Ctx={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Ctx){
 const actor=await getTechActor();if(!isTechActor(actor))return actor;
 const {id}=await context.params;const b=await request.json().catch(()=>null);
 if(!b||typeof b!=="object")return NextResponse.json({error:"Données invalides."},{status:400});
 const current=await prisma.techProject.findUnique({where:{id}});if(!current)return NextResponse.json({error:"Projet introuvable."},{status:404});
 const data:Record<string,unknown>={};
 if("status" in b){if(!["CADRAGE","DEVELOPPEMENT","RECETTE","LIVRE","MAINTENANCE","CLOTURE"].includes(b.status))return NextResponse.json({error:"Statut invalide."},{status:400});data.status=b.status;}
 if(actor.isOwner){
  if("budgetPlanned" in b){const n=b.budgetPlanned===null?null:Number(b.budgetPlanned);if(n!==null&&(!Number.isFinite(n)||n<0))return NextResponse.json({error:"Budget invalide."},{status:400});data.budgetPlanned=n;}
  if("budgetActual" in b){const n=b.budgetActual===null?null:Number(b.budgetActual);if(n!==null&&(!Number.isFinite(n)||n<0))return NextResponse.json({error:"Budget réel invalide."},{status:400});data.budgetActual=n;}
  if("budgetPlannedCertainty" in b)data.budgetPlannedCertainty=["CONFIRME","ESTIME","INCONNU"].includes(b.budgetPlannedCertainty)?b.budgetPlannedCertainty:"INCONNU";
 }else if("budgetPlanned" in b||"budgetActual" in b||"budgetPlannedCertainty" in b)return NextResponse.json({error:"Modification budgétaire réservée à l'OWNER."},{status:403});
 const project=await prisma.$transaction(async tx=>{
  const p=await tx.techProject.update({where:{id},data});
  await tx.techProjectEvent.create({data:{eventType:"PROJECT_UPDATED",fromValue:current.status,toValue:p.status,note:Object.keys(data).join(","),actorUserId:actor.userId,actorRole:actor.role,techProjectId:id}});
  await tx.auditLog.create({data:{actorUserId:actor.userId,actorRole:actor.role,action:"TECH_PROJECT_UPDATED",targetType:"TECH_PROJECT",targetId:id,details:{fields:Object.keys(data)}}});
  return p;
 });
 return NextResponse.json({project});
}
