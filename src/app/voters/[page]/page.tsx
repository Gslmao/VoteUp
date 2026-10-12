import { VoterApp } from "@/components/voters/VoterApp";
import { VoterPageKey } from "@/types/voter";

const pageAliases: Record<string, VoterPageKey> = {
  "cast-vote": "vote",
  "voting-history": "history",
};

export default async function VoterDynamicPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const resolvedPage = (pageAliases[page] || page) as VoterPageKey;
  return <VoterApp initialRoute={resolvedPage} />;
}
