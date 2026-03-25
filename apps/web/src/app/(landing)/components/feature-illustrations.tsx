"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-is-mobile";

/* ─── Color tokens ─── */
const colors = {
  gold: { primary: "#E8C84A", glow: "rgba(232,200,74,0.3)", muted: "rgba(232,200,74,0.12)" },
  teal: { primary: "#1A8FB8", glow: "rgba(26,143,184,0.35)", muted: "rgba(26,143,184,0.15)" },
  violet: { primary: "#A77BFF", glow: "rgba(167,123,255,0.3)", muted: "rgba(167,123,255,0.12)" },
};

/* ─── Shared breathe transition ─── */
const breathe = (duration: number, delay = 0) => ({
  duration,
  repeat: Infinity,
  ease: "easeInOut" as const,
  delay,
});

/* ─── 01 · VERIFY - Runic Seal ─── */
export function VerifyIllustration() {
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  const shouldAnimate = !reduced && !isMobile;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="0 0 400 400"
        className="h-[320px] w-[320px] sm:h-[380px] sm:w-[380px] lg:h-[420px] lg:w-[420px]"
        fill="none"
      >
        {/* Outer glow circle */}
        <circle cx="200" cy="200" r="185" stroke={colors.gold.primary} strokeWidth="1" opacity="0.2" />

        {/* Outer ring — desktop: breathe opacity, mobile: static */}
        {shouldAnimate ? (
          <motion.g
            animate={{ opacity: [0.4, 0.55, 0.4] }}
            transition={breathe(6)}
          >
            <circle cx="200" cy="200" r="170" stroke={colors.gold.primary} strokeWidth="1" opacity="0.45" />
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = (i * 10 * Math.PI) / 180;
              const x1 = 200 + 163 * Math.cos(angle);
              const y1 = 200 + 163 * Math.sin(angle);
              const x2 = 200 + (i % 3 === 0 ? 155 : 159) * Math.cos(angle);
              const y2 = 200 + (i % 3 === 0 ? 155 : 159) * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={colors.gold.primary}
                  strokeWidth={i % 3 === 0 ? "2" : "0.8"}
                  opacity={i % 3 === 0 ? "0.8" : "0.4"}
                />
              );
            })}
          </motion.g>
        ) : (
          <g>
            <circle cx="200" cy="200" r="170" stroke={colors.gold.primary} strokeWidth="1" opacity="0.45" />
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = (i * 10 * Math.PI) / 180;
              const x1 = 200 + 163 * Math.cos(angle);
              const y1 = 200 + 163 * Math.sin(angle);
              const x2 = 200 + (i % 3 === 0 ? 155 : 159) * Math.cos(angle);
              const y2 = 200 + (i % 3 === 0 ? 155 : 159) * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={colors.gold.primary}
                  strokeWidth={i % 3 === 0 ? "2" : "0.8"}
                  opacity={i % 3 === 0 ? "0.8" : "0.4"}
                />
              );
            })}
          </g>
        )}

        {/* Inner ring — desktop: breathe opacity, mobile: static */}
        {shouldAnimate ? (
          <motion.g
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={breathe(5, 1.5)}
          >
            <circle cx="200" cy="200" r="130" stroke={colors.gold.primary} strokeWidth="0.8" opacity="0.35" />
            {[0, 60, 120, 180, 240, 300].map((deg) => {
              const angle = (deg * Math.PI) / 180;
              const x = 200 + 130 * Math.cos(angle);
              const y = 200 + 130 * Math.sin(angle);
              return (
                <g key={deg} transform={`translate(${x},${y})`}>
                  <line x1="0" y1="-7" x2="0" y2="7" stroke={colors.gold.primary} strokeWidth="1.5" opacity="0.7" />
                  <line x1="-4" y1="-4" x2="4" y2="4" stroke={colors.gold.primary} strokeWidth="1" opacity="0.5" />
                </g>
              );
            })}
          </motion.g>
        ) : (
          <g>
            <circle cx="200" cy="200" r="130" stroke={colors.gold.primary} strokeWidth="0.8" opacity="0.35" />
            {[0, 60, 120, 180, 240, 300].map((deg) => {
              const angle = (deg * Math.PI) / 180;
              const x = 200 + 130 * Math.cos(angle);
              const y = 200 + 130 * Math.sin(angle);
              return (
                <g key={deg} transform={`translate(${x},${y})`}>
                  <line x1="0" y1="-7" x2="0" y2="7" stroke={colors.gold.primary} strokeWidth="1.5" opacity="0.7" />
                  <line x1="-4" y1="-4" x2="4" y2="4" stroke={colors.gold.primary} strokeWidth="1" opacity="0.5" />
                </g>
              );
            })}
          </g>
        )}

        {/* Static middle ring */}
        <circle cx="200" cy="200" r="95" stroke={colors.gold.primary} strokeWidth="0.8" opacity="0.25" />

        {/* Verification pulse ring — desktop only */}
        {shouldAnimate && (
          <motion.circle
            cx="200" cy="200" r="95"
            stroke={colors.gold.primary}
            strokeWidth="1"
            fill="none"
            opacity={0}
            animate={{
              r: [95, 140, 170],
              opacity: [0.6, 0.2, 0],
              strokeWidth: [1.5, 0.8, 0.3],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeOut", repeatDelay: 3 }}
          />
        )}

        {/* Central Tiwaz Rune - bold and prominent */}
        <g opacity="0.9">
          {/* Vertical line */}
          <line x1="200" y1="150" x2="200" y2="250" stroke={colors.gold.primary} strokeWidth="3" strokeLinecap="round" />
          {/* Upper arms */}
          <line x1="200" y1="162" x2="174" y2="192" stroke={colors.gold.primary} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="200" y1="162" x2="226" y2="192" stroke={colors.gold.primary} strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Glowing center dot — desktop: breathe, mobile: static */}
        {shouldAnimate ? (
          <motion.circle
            cx="200" cy="200" r="4"
            fill={colors.gold.primary}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={breathe(4)}
          />
        ) : (
          <circle cx="200" cy="200" r="4" fill={colors.gold.primary} opacity="0.8" />
        )}

        {/* Corner accent runes - small Elder Futhark marks */}
        {/* Fehu (ᚠ) - top right */}
        <g opacity="0.4" transform="translate(310, 88)">
          <line x1="0" y1="0" x2="0" y2="20" stroke={colors.gold.primary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="0" y1="2" x2="9" y2="8" stroke={colors.gold.primary} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="0" y1="9" x2="8" y2="14" stroke={colors.gold.primary} strokeWidth="1.2" strokeLinecap="round" />
        </g>
        {/* Ansuz (ᚨ) - bottom left */}
        <g opacity="0.4" transform="translate(82, 292)">
          <line x1="0" y1="0" x2="0" y2="20" stroke={colors.gold.primary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="0" y1="3" x2="8" y2="9" stroke={colors.gold.primary} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="8" y1="9" x2="0" y2="15" stroke={colors.gold.primary} strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Connecting radial lines from center */}
        {[30, 90, 150, 210, 270, 330].map((deg) => {
          const angle = (deg * Math.PI) / 180;
          const x1 = 200 + 50 * Math.cos(angle);
          const y1 = 200 + 50 * Math.sin(angle);
          const x2 = 200 + 90 * Math.cos(angle);
          const y2 = 200 + 90 * Math.sin(angle);
          return (
            <line
              key={deg}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={colors.gold.primary}
              strokeWidth="0.6"
              opacity="0.25"
              strokeDasharray="2 4"
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ─── 02 · RECALL - Memory Constellation ─── */
export function RecallIllustration() {
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  const shouldAnimate = !reduced && !isMobile;

  /* Node positions - Yggdrasil-like tree structure */
  const nodes = [
    { x: 200, y: 80, r: 4, delay: 0 },       // 0: top (root) — KEY
    { x: 140, y: 150, r: 3, delay: 0.5 },     // 1: branch left
    { x: 260, y: 140, r: 3, delay: 0.8 },     // 2: branch right
    { x: 100, y: 220, r: 2.5, delay: 1.2 },   // 3: leaf left-left
    { x: 175, y: 230, r: 2.5, delay: 1 },     // 4: leaf left-right
    { x: 240, y: 210, r: 2.5, delay: 1.4 },   // 5: leaf right-left
    { x: 310, y: 225, r: 2.5, delay: 0.6 },   // 6: leaf right-right
    { x: 200, y: 200, r: 5, delay: 0.2 },     // 7: center (Tiwaz) — KEY
    { x: 155, y: 300, r: 2.5, delay: 1.6 },   // 8: lower-left
    { x: 245, y: 310, r: 2.5, delay: 1.3 },   // 9: lower-right
    { x: 200, y: 340, r: 3, delay: 0.9 },     // 10: bottom — KEY
  ];

  /* Connections between nodes (index pairs) */
  const edges: [number, number][] = [
    [0, 1], [0, 2], [0, 7],       // 0,1,2 — key edges (root→center)
    [1, 3], [1, 4],
    [2, 5], [2, 6],
    [7, 1], [7, 2], [7, 4], [7, 5],
    [7, 8], [7, 9],
    [8, 10], [9, 10],             // 13,14 — key edges (→bottom)
  ];

  /* Desktop: only 3 key edges breathe (indices 0, 2, 13) */
  const keyEdgeIndices = new Set([0, 2, 13]);
  /* Desktop: only 3 key nodes breathe (root=0, center=7, bottom=10) */
  const keyNodeIndices = new Set([0, 7, 10]);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="0 0 400 420"
        className="h-[320px] w-[320px] sm:h-[380px] sm:w-[380px] lg:h-[420px] lg:w-[420px]"
        fill="none"
      >
        {/* Outer atmosphere ring */}
        <circle cx="200" cy="210" r="180" stroke={colors.teal.primary} strokeWidth="1.2" opacity="0.4" />
        <circle cx="200" cy="210" r="160" stroke={colors.teal.primary} strokeWidth="0.8" opacity="0.3" strokeDasharray="4 8" />

        {/* Connection lines */}
        {edges.map(([from, to], i) => {
          const isKey = keyEdgeIndices.has(i);
          if (shouldAnimate && isKey) {
            return (
              <motion.line
                key={i}
                x1={nodes[from].x} y1={nodes[from].y}
                x2={nodes[to].x} y2={nodes[to].y}
                stroke={colors.teal.primary}
                strokeWidth="1.5"
                animate={{ opacity: [0.3, 0.65, 0.3] }}
                transition={breathe(3, i * 0.3)}
              />
            );
          }
          return (
            <line
              key={i}
              x1={nodes[from].x} y1={nodes[from].y}
              x2={nodes[to].x} y2={nodes[to].y}
              stroke={colors.teal.primary}
              strokeWidth="1.5"
              opacity="0.45"
            />
          );
        })}

        {/* Data flow particle — desktop: 1 particle on root→center edge, mobile: none */}
        {shouldAnimate && (
          <motion.circle
            r="2.5"
            fill={colors.teal.primary}
            animate={{
              cx: [nodes[0].x, nodes[7].x],
              cy: [nodes[0].y, nodes[7].y],
              opacity: [0, 0.9, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 2,
            }}
          />
        )}

        {/* Memory nodes */}
        {nodes.map((node, i) => {
          const isKey = keyNodeIndices.has(i);
          return (
            <g key={i}>
              {/* Node glow — only key nodes breathe on desktop */}
              {shouldAnimate && isKey ? (
                <motion.circle
                  cx={node.x} cy={node.y} r={node.r * 3}
                  fill={colors.teal.glow}
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={breathe(4, node.delay)}
                />
              ) : (
                <circle
                  cx={node.x} cy={node.y} r={node.r * 3}
                  fill={colors.teal.glow}
                  opacity="0.6"
                />
              )}
              {/* Node core — static for all */}
              <circle
                cx={node.x} cy={node.y} r={node.r}
                fill={i === 7 ? colors.teal.primary : "none"}
                stroke={colors.teal.primary}
                strokeWidth={i === 7 ? 0 : 2}
                opacity={i === 7 ? 0.95 : 0.75}
              />
            </g>
          );
        })}

        {/* Central Tiwaz rune at node[7] (center node) */}
        <g opacity="1">
          <line x1="200" y1="182" x2="200" y2="218" stroke={colors.teal.primary} strokeWidth="3" strokeLinecap="round" />
          <line x1="200" y1="186" x2="186" y2="202" stroke={colors.teal.primary} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="200" y1="186" x2="214" y2="202" stroke={colors.teal.primary} strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Decorative rune marks at key nodes */}
        {/* Raidō (ᚱ) at node[0] - journey/path */}
        <g opacity="0.6" transform="translate(212, 70)">
          <line x1="0" y1="0" x2="0" y2="16" stroke={colors.teal.primary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="0" y1="1" x2="7" y2="6" stroke={colors.teal.primary} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="7" y1="6" x2="0" y2="11" stroke={colors.teal.primary} strokeWidth="1.2" strokeLinecap="round" />
        </g>
        {/* Laguz (ᛚ) at node[10] - water/flow */}
        <g opacity="0.6" transform="translate(212, 332)">
          <line x1="0" y1="0" x2="0" y2="16" stroke={colors.teal.primary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="0" y1="0" x2="7" y2="8" stroke={colors.teal.primary} strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Vertical trunk line (Yggdrasil axis) */}
        <line x1="200" y1="85" x2="200" y2="335" stroke={colors.teal.primary} strokeWidth="0.8" opacity="0.3" strokeDasharray="3 6" />
      </svg>
    </div>
  );
}

/* ─── 03 · SHIELD - Aegis Barrier ─── */
export function ShieldIllustration() {
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  const shouldAnimate = !reduced && !isMobile;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="0 0 400 400"
        className="h-[320px] w-[320px] sm:h-[380px] sm:w-[380px] lg:h-[420px] lg:w-[420px]"
        fill="none"
      >
        {/* Outer octagonal ring — desktop: breathe, mobile: static */}
        {shouldAnimate ? (
          <motion.g
            animate={{ opacity: [0.25, 0.4, 0.25] }}
            transition={breathe(7)}
          >
            <polygon
              points="200,30 310,80 360,190 310,300 200,350 90,300 40,190 90,80"
              stroke={colors.violet.primary}
              strokeWidth="1"
              opacity="0.3"
            />
            {[
              { x: 255, y: 50, r: -20 },
              { x: 340, y: 130, r: 25 },
              { x: 340, y: 250, r: -25 },
              { x: 255, y: 330, r: 20 },
              { x: 145, y: 330, r: -20 },
              { x: 60, y: 250, r: 25 },
              { x: 60, y: 130, r: -25 },
              { x: 145, y: 50, r: 20 },
            ].map((pos, i) => (
              <g key={i} transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.r})`} opacity="0.45">
                <line x1="0" y1="-5" x2="0" y2="5" stroke={colors.violet.primary} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="-3" y1="-3" x2="3" y2="3" stroke={colors.violet.primary} strokeWidth="0.8" strokeLinecap="round" />
              </g>
            ))}
          </motion.g>
        ) : (
          <g>
            <polygon
              points="200,30 310,80 360,190 310,300 200,350 90,300 40,190 90,80"
              stroke={colors.violet.primary}
              strokeWidth="1"
              opacity="0.3"
            />
            {[
              { x: 255, y: 50, r: -20 },
              { x: 340, y: 130, r: 25 },
              { x: 340, y: 250, r: -25 },
              { x: 255, y: 330, r: 20 },
              { x: 145, y: 330, r: -20 },
              { x: 60, y: 250, r: 25 },
              { x: 60, y: 130, r: -25 },
              { x: 145, y: 50, r: 20 },
            ].map((pos, i) => (
              <g key={i} transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.r})`} opacity="0.45">
                <line x1="0" y1="-5" x2="0" y2="5" stroke={colors.violet.primary} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="-3" y1="-3" x2="3" y2="3" stroke={colors.violet.primary} strokeWidth="0.8" strokeLinecap="round" />
              </g>
            ))}
          </g>
        )}

        {/* Middle hexagonal layer — desktop: breathe, mobile: static */}
        {shouldAnimate ? (
          <motion.g
            animate={{ opacity: [0.2, 0.35, 0.2] }}
            transition={breathe(6)}
          >
            <polygon
              points="200,70 290,115 290,265 200,310 110,265 110,115"
              stroke={colors.violet.primary}
              strokeWidth="0.8"
              opacity="0.25"
            />
            {[
              [200, 70], [290, 115], [290, 265], [200, 310], [110, 265], [110, 115],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3" fill={colors.violet.primary} opacity="0.5" />
            ))}
          </motion.g>
        ) : (
          <g>
            <polygon
              points="200,70 290,115 290,265 200,310 110,265 110,115"
              stroke={colors.violet.primary}
              strokeWidth="0.8"
              opacity="0.25"
            />
            {[
              [200, 70], [290, 115], [290, 265], [200, 310], [110, 265], [110, 115],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3" fill={colors.violet.primary} opacity="0.5" />
            ))}
          </g>
        )}

        {/* Inner shield ring - static */}
        <circle cx="200" cy="190" r="100" stroke={colors.violet.primary} strokeWidth="0.8" opacity="0.2" />

        {/* Defensive pulse ring — desktop only */}
        {shouldAnimate && (
          <motion.polygon
            points="200,110 260,145 260,235 200,270 140,235 140,145"
            stroke={colors.violet.primary}
            strokeWidth="1"
            fill="none"
            opacity={0}
            animate={{
              opacity: [0.5, 0.15, 0],
              strokeWidth: [1.5, 0.8, 0.3],
              scale: [1, 1.3, 1.6],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeOut", repeatDelay: 3 }}
            style={{ originX: "200px", originY: "190px" }}
          />
        )}

        {/* Shield cross-guard lines */}
        {[0, 60, 120].map((deg) => {
          const angle = (deg * Math.PI) / 180;
          const x1 = 200 + 45 * Math.cos(angle);
          const y1 = 190 + 45 * Math.sin(angle);
          const x2 = 200 + 95 * Math.cos(angle);
          const y2 = 190 + 95 * Math.sin(angle);
          const x3 = 200 - 45 * Math.cos(angle);
          const y3 = 190 - 45 * Math.sin(angle);
          const x4 = 200 - 95 * Math.cos(angle);
          const y4 = 190 - 95 * Math.sin(angle);
          return (
            <g key={deg}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.violet.primary} strokeWidth="0.5" opacity="0.2" strokeDasharray="3 5" />
              <line x1={x3} y1={y3} x2={x4} y2={y4} stroke={colors.violet.primary} strokeWidth="0.5" opacity="0.2" strokeDasharray="3 5" />
            </g>
          );
        })}

        {/* Central Tiwaz + Shield emblem */}
        <g opacity="0.9">
          {/* Shield shape */}
          <path
            d="M200,150 L230,168 L230,202 Q230,220 200,232 Q170,220 170,202 L170,168 Z"
            stroke={colors.violet.primary}
            strokeWidth="1.8"
            fill={colors.violet.muted}
          />
          {/* Tiwaz inside shield */}
          <line x1="200" y1="160" x2="200" y2="222" stroke={colors.violet.primary} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="200" y1="166" x2="186" y2="182" stroke={colors.violet.primary} strokeWidth="2" strokeLinecap="round" />
          <line x1="200" y1="166" x2="214" y2="182" stroke={colors.violet.primary} strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Corner ward runes */}
        {/* Algiz (ᛉ) - protection rune, 4 corners */}
        {[
          { x: 75, y: 75 },
          { x: 325, y: 75 },
          { x: 75, y: 315 },
          { x: 325, y: 315 },
        ].map((pos, i) => (
          <g key={i} opacity="0.35" transform={`translate(${pos.x}, ${pos.y})`}>
            <line x1="0" y1="10" x2="0" y2="-10" stroke={colors.violet.primary} strokeWidth="1.2" strokeLinecap="round" />
            <line x1="0" y1="-5" x2="-6" y2="-13" stroke={colors.violet.primary} strokeWidth="1" strokeLinecap="round" />
            <line x1="0" y1="-5" x2="6" y2="-13" stroke={colors.violet.primary} strokeWidth="1" strokeLinecap="round" />
          </g>
        ))}

        {/* Glowing center point — desktop: breathe, mobile: static */}
        {shouldAnimate ? (
          <motion.circle
            cx="200" cy="190" r="3.5"
            fill={colors.violet.primary}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={breathe(3.5)}
          />
        ) : (
          <circle cx="200" cy="190" r="3.5" fill={colors.violet.primary} opacity="0.8" />
        )}
      </svg>
    </div>
  );
}
