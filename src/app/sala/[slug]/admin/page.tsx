import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { AdminClient } from "@/components/AdminClient";

export default async function AdminPage(context: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await context.params;
  const { token } = await context.searchParams;

  let initialTokenValid = false;
  if (token) {
    const group = await db.query.groups.findFirst({
      where: eq(groups.slug, slug),
      columns: { adminToken: true },
    });
    if (group && group.adminToken === token) {
      initialTokenValid = true;
    } else {
      redirect(`/sala/${slug}/admin`);
    }
  }

  return <AdminClient slug={slug} queryToken={initialTokenValid ? token : undefined} />;
}
