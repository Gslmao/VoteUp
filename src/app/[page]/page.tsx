import { redirect } from "next/navigation";
import { navItems } from "@/data/mockData";

export default async function LegacyRouteHandler({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;

  if (navItems.some((n) => n.key === page)) {
    redirect(`/admin/${page}`);
  }

  if (page === "login") {
    redirect("/admin");
  }

  redirect("/");
}
