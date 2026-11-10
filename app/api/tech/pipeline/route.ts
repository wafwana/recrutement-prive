import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TECH_PIPELINE,getTechActor,isTechActor } from "@/lib/tech/access";
export async function GET(){
 const actor=await getTechActor();if(!isTechActor(actor))return actor;
 const saved=await prisma.systemSetting.findUnique({where:{key:"tech_pipeline_stages"},select:{value:true}});
 return NextResponse.json({stages:Array.isArray(saved?.value)?saved.value:DEFAULT_TECH_PIPELINE});
}
export async function PUT(request:Request){
 const actor=await getTechActor();if(!isTechActor(actor))return actor;
 if(!actor.isOwner)return NextResponse.json({error:"Configuration réservée à l'OWNER."},{status:403});
 const b=await request.json().catch(()=>null);const stages=b?.stages;
 const keys=DEFAULT_TECH_PIPELINE.map(x=>x.key);
 if(!Array.isArray(stages)||stages.length!==keys.length||stages.some((s:unknown)=>!s||typeof s!=="object"||!("key" in s)||!("label" in s)||typeof (s as {key:unknown}).key!=="string"||typeof (s as {label:unknown}).label!=="string")||new Set(stages.map((s:{key:string})=>s.key)).size!==keys.length||keys.some(k=>!stages.some((s:{key:string})=>s.key===k)))return NextResponse.json({error:"Le pipeline doit conserver exactement les étapes autorisées."},{status:400});
 const value=stages.map((s:{key:string,label:string})=>({key:s.key,label:s.label.trim().slice(0,60)}));
 await prisma.$transaction(async tx=>{
  await tx.systemSetting.upsert({where:{key:"tech_pipeline_stages"},create:{key:"tech_pipeline_stages",value},update:{value}});
  await tx.auditLog.create({data:{actorUserId:actor.userId,actorRole:actor.role,action:"TECH_PIPELINE_UPDATED",targetType:"SYSTEM_SETTING",targetId:"tech_pipeline_stages",details:{stages:value}}});
 });
 return NextResponse.json({stages:value});
}
