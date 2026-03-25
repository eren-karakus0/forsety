"use client";

import { useIsMobile } from "@/hooks/use-is-mobile";

export function MeshGradient() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/[0.04] blur-[60px]"
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute -left-[15%] -top-[10%] h-[600px] w-[600px] animate-mesh-float-1 rounded-full bg-teal-400/[0.06] blur-[80px] will-change-transform"
      />
      <div
        className="absolute -right-[10%] top-[25%] h-[550px] w-[550px] animate-mesh-float-2 rounded-full bg-violet-400/[0.05] blur-[80px] will-change-transform"
      />
      <div
        className="absolute -bottom-[5%] left-[25%] h-[575px] w-[575px] animate-mesh-float-1 rounded-full bg-gold-400/[0.05] blur-[80px] will-change-transform"
        style={{ animationDelay: "-5s" }}
      />
    </div>
  );
}
