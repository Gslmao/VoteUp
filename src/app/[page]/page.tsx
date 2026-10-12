import { PortalApp } from "@/components/portal/PortalApp";
import { PageKey } from "@/types/portal";

export default async function DynamicRoutePage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  return <PortalApp initialRoute={page as PageKey} />;
}
