export function Architecture() {
  return (
    <section className="border-t border-navy-100 bg-navy-50/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-600">
            Architecture
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
            Built on Shelby Protocol
          </h2>
          <p className="mt-4 text-lg text-navy-500">
            Forsety leverages Shelby&apos;s decentralized storage for immutable
            data anchoring and blob management.
          </p>
        </div>

        {/* Layered Architecture Diagram */}
        <div className="mx-auto mt-16 max-w-3xl">
          <div className="space-y-3">
            {/* Layer 1: Apps */}
            <div className="rounded-xl border border-navy-200 bg-white p-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-400">
                Application Layer
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["Dashboard", "MCP Server", "REST API", "CLI"].map((app) => (
                  <div
                    key={app}
                    className="rounded-lg bg-navy-50 px-3 py-2 text-center text-sm font-medium text-navy-700"
                  >
                    {app}
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-navy-300">
                <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Layer 2: Forsety SDK */}
            <div className="rounded-xl border-2 border-gold-400 bg-gold-50/50 p-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-700">
                Forsety SDK
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  "Dataset Service",
                  "Evidence Pack",
                  "RecallVault",
                  "ShieldStore",
                  "Policy Engine",
                  "Agent Auth",
                  "Vector Search",
                  "Audit Trail",
                ].map((service) => (
                  <div
                    key={service}
                    className="rounded-lg bg-white px-3 py-2 text-center text-xs font-medium text-navy-700 shadow-sm"
                  >
                    {service}
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-navy-300">
                <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Layer 3: Data */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-navy-200 bg-white p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-400">
                  Database (Neon PostgreSQL)
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Datasets",
                    "Licenses",
                    "Policies",
                    "Access Logs",
                    "Evidence",
                    "Agents",
                    "Memories",
                    "Audit",
                  ].map((table) => (
                    <span
                      key={table}
                      className="rounded-md bg-navy-50 px-2 py-1 text-xs font-medium text-navy-600"
                    >
                      {table}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-navy-200 bg-navy-800 p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-300">
                  Shelby Protocol
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Blob Storage",
                    "Commitments",
                    "Content Hash",
                    "Devnet",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-md bg-navy-700 px-2 py-1 text-xs font-medium text-navy-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
