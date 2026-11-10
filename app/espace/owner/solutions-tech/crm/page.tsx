import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { TechCrmWorkspace } from "./workspace";
export default async function TechCrmPage(){
 const session=await auth();const userId=session?.user?.id;const role=session?.user?.role;
 if(!userId||!role)redirect("/connexion");
 const isOwner=role==="OWNER";
 if(!isOwner&&!(await hasPermission(userId,role,"TECH_SOLUTIONS_MANAGE")))redirect("/espace");
 return <TechCrmWorkspace isOwner={isOwner}/>;
}
