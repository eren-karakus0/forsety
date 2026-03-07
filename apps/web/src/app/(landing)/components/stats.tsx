const stats = [
  { value: "8", label: "Database Tables", description: "Comprehensive schema" },
  { value: "114+", label: "Tests Passing", description: "Quality assured" },
  { value: "6", label: "MCP Tools", description: "Agent integration" },
  { value: "8", label: "SDK Services", description: "Full-stack SDK" },
];

export function Stats() {
  return (
    <section className="border-t border-navy-100 bg-navy-800 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-4xl font-bold text-gold-400 sm:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 text-sm font-semibold text-white">
                {stat.label}
              </div>
              <div className="mt-1 text-xs text-navy-300">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
