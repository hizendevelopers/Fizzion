import { unstable_noStore as noStore } from "next/cache";

import { MetaLibraryClient } from "@/components/meta/meta-library-client";

export const metadata = {
  title: "Meta Library",
  description:
    "Search the Facebook and Instagram Ad Library through the Apify Meta Ad Library scraper and review the latest advertisement data.",
};

export default function MetaLibraryPage() {
  noStore();
  return <MetaLibraryClient />;
}
