import { unstable_noStore as noStore } from "next/cache";

import { MetaTrainingDatasetClient } from "@/components/meta/meta-training-dataset-client";

export const metadata = {
  title: "Impressions Training Dataset",
  description:
    "Inspect the real public Meta weak-range impressions training dataset collected through Apify and monitor collection progress.",
};

export default function MetaTrainingDatasetPage() {
  noStore();
  return <MetaTrainingDatasetClient />;
}
