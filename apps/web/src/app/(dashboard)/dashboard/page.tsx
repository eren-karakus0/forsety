import Link from "next/link";
import { getForsetyClient } from "@/lib/forsety";

export const dynamic = "force-dynamic";

interface DatasetRow {
  id: string;
  name: string;
  license: string;
  status: "active" | "pending" | "expired";
  createdAt: string;
  blobHash: string | null;
}

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  expired: "bg-red-50 text-red-700 border-red-200",
};

function StatusBadge({ status }: { status: DatasetRow["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          status === "active"
            ? "bg-emerald-500"
            : status === "pending"
              ? "bg-amber-500"
              : "bg-red-500"
        }`}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

async function getDatasets(): Promise<DatasetRow[]> {
  try {
    const client = getForsetyClient();
    const datasetsWithLicenses = await client.datasets.listWithLicenses();

    return datasetsWithLicenses.map((d) => ({
      id: d.id,
      name: d.name,
      license: d.licenseSpdx ?? "—",
      status: "active" as const,
      createdAt: d.createdAt
        ? new Date(d.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—",
      blobHash: d.blobHash,
    }));
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const datasets = await getDatasets();

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy-800">
            Datasets
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            Licensed datasets with verifiable evidence trails
          </p>
        </div>
        <Link
          href="/dashboard/upload"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-navy-700 hover:shadow-md active:scale-[0.98]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Upload Dataset
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Datasets", value: datasets.length.toString(), accent: false },
          { label: "Active Policies", value: "—", accent: false },
          { label: "Evidence Packs", value: "—", accent: true },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-5 transition-shadow hover:shadow-sm ${
              stat.accent
                ? "border-gold-300/60 bg-gradient-to-br from-gold-50/80 to-white"
                : "border-navy-200/60 bg-white"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-navy-400">
              {stat.label}
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-navy-800">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-navy-200/60 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">
                Name
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">
                License
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">
                Created
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-navy-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100/80">
            {datasets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-navy-400">
                        <path d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-navy-600">No datasets yet</p>
                    <p className="text-xs text-navy-400">Upload your first dataset to get started</p>
                    <Link
                      href="/dashboard/upload"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-navy-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-navy-700"
                    >
                      Upload Dataset
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              datasets.map((dataset) => (
                <tr
                  key={dataset.id}
                  className="group transition-colors hover:bg-navy-50/30"
                >
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/${dataset.id}`} className="group/link">
                      <span className="text-sm font-medium text-navy-800 group-hover/link:text-gold-600 transition-colors">
                        {dataset.name}
                      </span>
                      {dataset.blobHash && (
                        <span className="mt-0.5 block font-mono text-[10px] text-navy-400">
                          {dataset.blobHash.slice(0, 16)}...
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded bg-navy-100 px-2 py-0.5 font-mono text-xs text-navy-600">
                      {dataset.license}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={dataset.status} />
                  </td>
                  <td className="px-5 py-4 text-sm text-navy-500">
                    {dataset.createdAt}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/dashboard/${dataset.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-navy-200 px-2.5 py-1 text-xs font-medium text-navy-600 transition-all hover:border-navy-300 hover:bg-navy-50 hover:text-navy-800"
                    >
                      View
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
