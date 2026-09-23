import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

async function actor() {
  const session = await auth();
  const id = typeof session?.user?.id === "string" ? session.user.id : null;
  const role = session?.user?.role;
  if (!id || !["OWNER","ADMIN","CONSULTANT"].includes(role || "")) return null;
  if (!(await hasPermission(id, role, "OFFRES_VIVIER"))) return null;
  return { id, role };
}

export async function GET(request: Request) {
  const current = await actor();
  if (!current) return NextResponse.json({ error: "Permission OFFRES_VIVIER non accordée par l’Owner." }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const country = searchParams.get("country")?.trim() || "";
  const where = {
    ...(status ? { status } : {}),
    ...(country ? { country: { contains: country, mode: "insensitive" as const } } : {}),
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { companyName: { contains: q, mode: "insensitive" as const } },
      { city: { contains: q, mode: "insensitive" as const } },
      { categoryCode: { contains: q, mode: "insensitive" as const } },
      { subCategoryCode: { contains: q, mode: "insensitive" as const } },
    ] } : {}),
  };
  const offers = await prisma.externalJobOpportunity.findMany({ where, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], take: 500, select: { id:true,title:true,companyName:true,country:true,city:true,categoryCode:true,subCategoryCode:true,source:true,sourceUrl:true,publishedAt:true,closingAt:true,salary:true,description:true,status:true,createdAt:true,updatedAt:true } });
  return NextResponse.json({ offers });
}

export async function POST(request: Request) {
  const current = await actor();
  if (!current) return NextResponse.json({ error: "Permission OFFRES_VIVIER non accordée par l’Owner." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Le titre de l’offre est obligatoire." }, { status: 400 });
  const id = crypto.randomUUID();
  const offer = await prisma.externalJobOpportunity.create({ data: { externalId: "manual-" + id, source: "MANUAL_RP", title, companyName: typeof body?.companyName==="string" ? body.companyName.trim() || null : null, country: typeof body?.country==="string" ? body.country.trim() || null : null, city: typeof body?.city==="string" ? body.city.trim() || null : null, categoryCode: typeof body?.categoryCode==="string" ? body.categoryCode.trim() || null : null, subCategoryCode: typeof body?.subCategoryCode==="string" ? body.subCategoryCode.trim() || null : null, salary: typeof body?.salary==="string" ? body.salary.trim() || null : null, sourceUrl: typeof body?.sourceUrl==="string" ? body.sourceUrl.trim() || null : null, description: typeof body?.description==="string" ? body.description.trim() || null : null, status: "A_QUALIFIER" }, select: { id:true } });
  return NextResponse.json({ offer }, { status: 201 });
}

export async function PATCH(request: Request) {
  const current = await actor();
  if (!current) return NextResponse.json({ error: "Permission OFFRES_VIVIER non accordée par l’Owner." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  const status = typeof body?.status === "string" ? body.status.trim() : "";
  const allowed = ["DETECTED","A_QUALIFIER","QUALIFIED","MATCHING","FILLED","ARCHIVED","REJECTED"];
  if (!id || !allowed.includes(status)) return NextResponse.json({ error: "Offre ou statut invalide." }, { status: 400 });
  const offer = await prisma.externalJobOpportunity.update({ where: { id }, data: { status }, select: { id:true,status:true } });
  return NextResponse.json({ offer });
}