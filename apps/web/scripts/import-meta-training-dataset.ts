import { importMetaTrainingDataset } from "@/lib/meta-training-dataset";

async function main() {
  const stats = await importMetaTrainingDataset();

  console.log(
    JSON.stringify(
      {
        rowsRead: stats.rowsRead,
        rowsInserted: stats.rowsInserted,
        rowsUpdated: stats.rowsUpdated,
        rowsSkipped: stats.rowsSkipped,
        duplicates: stats.duplicates,
        databaseRows: stats.databaseRows,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Meta training dataset import failed.");
  process.exitCode = 1;
});
