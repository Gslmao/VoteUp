import { redirect } from "next/navigation";
import { navItems } from "@/data/mockData";

const voterPages = [
  "dashboard",
  "voter-details",
  "elections",
  "candidates",
  "vote",
  "cast-vote",
  "history",
  "voting-history",
  "complaints",
  "submit-complaint",
  "help",
  "settings",
];

export default async function LegacyRouteHandler({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;

  if (navItems.some((n) => n.key === page)) {
    redirect(`/admin/${page}`);
  }

  if (voterPages.includes(page)) {
    redirect(`/voters/${page}`);
  }

  if (page === "login") {
    redirect("/voters/login");
  }

  redirect("/voters");
}
