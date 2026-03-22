"use client";

export function MeshGradient() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute -left-[15%] -top-[10%] h-[800px] w-[800px] animate-mesh-float-1 rounded-full bg-teal-400/[0.06] blur-[120px] will-change-transform"
      />
      <div
        className="absolute -right-[10%] top-[25%] h-[700px] w-[700px] animate-mesh-float-2 rounded-full bg-violet-400/[0.05] blur-[120px] will-change-transform"
      />
      <div
        className="absolute -bottom-[5%] left-[25%] h-[750px] w-[750px] animate-mesh-float-1 rounded-full bg-gold-400/[0.05] blur-[120px] will-change-transform"
        style={{ animationDelay: "-5s" }}
      />
    </div>
  );
}
