import { PortalApp } from "@/components/admin/PortalApp";
import { PageKey } from "@/types/portal";

export default async function AdminDynamicPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  return <PortalApp initialRoute={page as PageKey} />;
}
