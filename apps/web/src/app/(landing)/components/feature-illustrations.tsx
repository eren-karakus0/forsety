"use client";

import { motion, useReducedMotion } from "framer-motion";

/* ─── Color tokens ─── */
const colors = {
  gold: { primary: "#D4AF37", secondary: "#B8960E", glow: "rgba(212,175,55,0.15)", muted: "rgba(212,175,55,0.08)" },
  teal: { primary: "#37AAD4", secondary: "#2B8BAD", glow: "rgba(55,170,212,0.15)", muted: "rgba(55,170,212,0.08)" },
  violet: { primary: "#6137D4", secondary: "#8955FF", glow: "rgba(97,55,212,0.15)", muted: "rgba(97,55,212,0.08)" },
};

/* ─── 01 · VERIFY — Runic Seal ─── */
export function VerifyIllustration() {
  const reduced = useReducedMotion();

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="0 0 400 400"
        className="h-[320px] w-[320px] sm:h-[380px] sm:w-[380px] lg:h-[420px] lg:w-[420px]"
        fill="none"
      >
        {/* Outer glow circle */}
        <circle cx="200" cy="200" r="185" stroke={colors.gold.muted} strokeWidth="1" />

        {/* Outer rotating ring */}
        <motion.g
          animate={reduced ? {} : { rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          style={{ originX: "200px", originY: "200px" }}
        >
          <circle cx="200" cy="200" r="170" stroke={colors.gold.primary} strokeWidth="0.5" opacity="0.3" />
          {/* Tick marks around outer ring */}
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
                strokeWidth={i % 3 === 0 ? "1.5" : "0.5"}
                opacity={i % 3 === 0 ? "0.6" : "0.25"}
              />
            );
          })}
        </motion.g>

        {/* Inner counter-rotating ring */}
        <motion.g
          animate={reduced ? {} : { rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          style={{ originX: "200px", originY: "200px" }}
        >
          <circle cx="200" cy="200" r="130" stroke={colors.gold.primary} strokeWidth="0.5" opacity="0.2" />
          {/* Rune markers on inner ring */}
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const angle = (deg * Math.PI) / 180;
            const x = 200 + 130 * Math.cos(angle);
            const y = 200 + 130 * Math.sin(angle);
            return (
              <g key={deg} transform={`translate(${x},${y})`}>
                <line x1="0" y1="-6" x2="0" y2="6" stroke={colors.gold.primary} strokeWidth="1.2" opacity="0.5" />
                <line x1="-3" y1="-3" x2="3" y2="3" stroke={colors.gold.primary} strokeWidth="0.8" opacity="0.3" />
              </g>
            );
          })}
        </motion.g>

        {/* Static middle ring */}
        <circle cx="200" cy="200" r="95" stroke={colors.gold.primary} strokeWidth="0.5" opacity="0.15" />

        {/* Verification pulse ring */}
        <motion.circle
          cx="200" cy="200" r="95"
          stroke={colors.gold.primary}
          strokeWidth="1"
          fill="none"
          opacity={0}
          animate={reduced ? {} : {
            r: [95, 140, 170],
            opacity: [0.4, 0.15, 0],
            strokeWidth: [1, 0.5, 0.2],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeOut", repeatDelay: 2 }}
        />

        {/* Central Tiwaz Rune — larger, prominent */}
        <g opacity="0.7">
          {/* Vertical line */}
          <line x1="200" y1="155" x2="200" y2="245" stroke={colors.gold.primary} strokeWidth="2" strokeLinecap="round" />
          {/* Upper arms */}
          <line x1="200" y1="165" x2="178" y2="190" stroke={colors.gold.primary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="200" y1="165" x2="222" y2="190" stroke={colors.gold.primary} strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Glowing center dot */}
        <motion.circle
          cx="200" cy="200" r="3"
          fill={colors.gold.primary}
          animate={reduced ? {} : { opacity: [0.4, 0.8, 0.4], r: [3, 4, 3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Corner accent runes — small Elder Futhark marks */}
        {/* Fehu (ᚠ) — top right */}
        <g opacity="0.2" transform="translate(310, 90)">
          <line x1="0" y1="0" x2="0" y2="18" stroke={colors.gold.primary} strokeWidth="1" />
          <line x1="0" y1="2" x2="8" y2="7" stroke={colors.gold.primary} strokeWidth="0.8" />
          <line x1="0" y1="8" x2="7" y2="12" stroke={colors.gold.primary} strokeWidth="0.8" />
        </g>
        {/* Ansuz (ᚨ) — bottom left */}
        <g opacity="0.2" transform="translate(85, 295)">
          <line x1="0" y1="0" x2="0" y2="18" stroke={colors.gold.primary} strokeWidth="1" />
          <line x1="0" y1="3" x2="7" y2="8" stroke={colors.gold.primary} strokeWidth="0.8" />
          <line x1="7" y1="8" x2="0" y2="13" stroke={colors.gold.primary} strokeWidth="0.8" />
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
              strokeWidth="0.4"
              opacity="0.15"
              strokeDasharray="2 4"
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ─── 02 · RECALL — Memory Constellation ─── */
export function RecallIllustration() {
  const reduced = useReducedMotion();

  /* Node positions — Yggdrasil-like tree structure */
  const nodes = [
    { x: 200, y: 80, r: 4, delay: 0 },       // top (root)
    { x: 140, y: 150, r: 3, delay: 0.5 },     // branch left
    { x: 260, y: 140, r: 3, delay: 0.8 },     // branch right
    { x: 100, y: 220, r: 2.5, delay: 1.2 },   // leaf left-left
    { x: 175, y: 230, r: 2.5, delay: 1 },     // leaf left-right
    { x: 240, y: 210, r: 2.5, delay: 1.4 },   // leaf right-left
    { x: 310, y: 225, r: 2.5, delay: 0.6 },   // leaf right-right
    { x: 200, y: 200, r: 5, delay: 0.2 },     // center (Tiwaz)
    { x: 155, y: 300, r: 2.5, delay: 1.6 },   // lower-left
    { x: 245, y: 310, r: 2.5, delay: 1.3 },   // lower-right
    { x: 200, y: 340, r: 3, delay: 0.9 },     // bottom
  ];

  /* Connections between nodes (index pairs) */
  const edges: [number, number][] = [
    [0, 1], [0, 2], [0, 7],
    [1, 3], [1, 4],
    [2, 5], [2, 6],
    [7, 1], [7, 2], [7, 4], [7, 5],
    [7, 8], [7, 9],
    [8, 10], [9, 10],
  ];

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="0 0 400 420"
        className="h-[320px] w-[320px] sm:h-[380px] sm:w-[380px] lg:h-[420px] lg:w-[420px]"
        fill="none"
      >
        {/* Outer atmosphere ring */}
        <circle cx="200" cy="210" r="180" stroke={colors.teal.primary} strokeWidth="0.5" opacity="0.1" />
        <circle cx="200" cy="210" r="160" stroke={colors.teal.primary} strokeWidth="0.3" opacity="0.08" strokeDasharray="4 8" />

        {/* Connection lines */}
        {edges.map(([from, to], i) => (
          <motion.line
            key={i}
            x1={nodes[from].x} y1={nodes[from].y}
            x2={nodes[to].x} y2={nodes[to].y}
            stroke={colors.teal.primary}
            strokeWidth="0.8"
            opacity={0}
            animate={reduced ? { opacity: 0.2 } : {
              opacity: [0.08, 0.3, 0.08],
              strokeWidth: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}

        {/* Data flow particles along edges */}
        {!reduced && [0, 3, 6, 9, 12].map((edgeIdx) => {
          const [from, to] = edges[edgeIdx];
          return (
            <motion.circle
              key={`particle-${edgeIdx}`}
              r="1.5"
              fill={colors.teal.primary}
              animate={{
                cx: [nodes[from].x, nodes[to].x],
                cy: [nodes[from].y, nodes[to].y],
                opacity: [0, 0.7, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: edgeIdx * 0.6,
                repeatDelay: 1.5,
              }}
            />
          );
        })}

        {/* Memory nodes */}
        {nodes.map((node, i) => (
          <g key={i}>
            {/* Node glow */}
            <motion.circle
              cx={node.x} cy={node.y} r={node.r * 3}
              fill={colors.teal.glow}
              animate={reduced ? {} : { opacity: [0.3, 0.6, 0.3], r: [node.r * 2.5, node.r * 3.5, node.r * 2.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: node.delay }}
            />
            {/* Node core */}
            <motion.circle
              cx={node.x} cy={node.y} r={node.r}
              fill={i === 7 ? colors.teal.primary : "none"}
              stroke={colors.teal.primary}
              strokeWidth={i === 7 ? 0 : 1}
              opacity={i === 7 ? 0.8 : 0.5}
              animate={reduced ? {} : { opacity: i === 7 ? [0.7, 1, 0.7] : [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: node.delay }}
            />
          </g>
        ))}

        {/* Central Tiwaz rune at node[7] (center node) */}
        <g opacity="0.6">
          <line x1="200" y1="185" x2="200" y2="215" stroke={colors.teal.primary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="200" y1="189" x2="190" y2="200" stroke={colors.teal.primary} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="200" y1="189" x2="210" y2="200" stroke={colors.teal.primary} strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Decorative rune marks at key nodes */}
        {/* Raidō (ᚱ) at node[0] — journey/path */}
        <g opacity="0.25" transform="translate(210, 72)">
          <line x1="0" y1="0" x2="0" y2="14" stroke={colors.teal.primary} strokeWidth="0.8" />
          <line x1="0" y1="1" x2="6" y2="5" stroke={colors.teal.primary} strokeWidth="0.7" />
          <line x1="6" y1="5" x2="0" y2="9" stroke={colors.teal.primary} strokeWidth="0.7" />
        </g>
        {/* Laguz (ᛚ) at node[10] — water/flow */}
        <g opacity="0.25" transform="translate(210, 334)">
          <line x1="0" y1="0" x2="0" y2="14" stroke={colors.teal.primary} strokeWidth="0.8" />
          <line x1="0" y1="0" x2="6" y2="7" stroke={colors.teal.primary} strokeWidth="0.7" />
        </g>

        {/* Vertical trunk line (Yggdrasil axis) */}
        <line x1="200" y1="85" x2="200" y2="335" stroke={colors.teal.primary} strokeWidth="0.4" opacity="0.08" strokeDasharray="3 6" />
      </svg>
    </div>
  );
}

/* ─── 03 · SHIELD — Aegis Barrier ─── */
export function ShieldIllustration() {
  const reduced = useReducedMotion();

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="0 0 400 400"
        className="h-[320px] w-[320px] sm:h-[380px] sm:w-[380px] lg:h-[420px] lg:w-[420px]"
        fill="none"
      >
        {/* Outer defensive ring — slowly rotating */}
        <motion.g
          animate={reduced ? {} : { rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          style={{ originX: "200px", originY: "200px" }}
        >
          {/* Octagonal shield border */}
          <polygon
            points="200,30 310,80 360,190 310,300 200,350 90,300 40,190 90,80"
            stroke={colors.violet.primary}
            strokeWidth="0.6"
            opacity="0.15"
          />
          {/* Rune inscriptions along outer octagon */}
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
            <g key={i} transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.r})`} opacity="0.2">
              <line x1="0" y1="-4" x2="0" y2="4" stroke={colors.violet.primary} strokeWidth="0.8" />
              <line x1="-2" y1="-2" x2="2" y2="2" stroke={colors.violet.primary} strokeWidth="0.5" />
            </g>
          ))}
        </motion.g>

        {/* Middle hexagonal layer — counter rotation */}
        <motion.g
          animate={reduced ? {} : { rotate: -360 }}
          transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
          style={{ originX: "200px", originY: "200px" }}
        >
          <polygon
            points="200,70 290,115 290,265 200,310 110,265 110,115"
            stroke={colors.violet.primary}
            strokeWidth="0.5"
            opacity="0.12"
          />
          {/* Vertex markers */}
          {[
            [200, 70], [290, 115], [290, 265], [200, 310], [110, 265], [110, 115],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2" fill={colors.violet.primary} opacity="0.3" />
          ))}
        </motion.g>

        {/* Inner shield ring — static */}
        <circle cx="200" cy="190" r="100" stroke={colors.violet.primary} strokeWidth="0.5" opacity="0.12" />

        {/* Defensive pulse rings */}
        <motion.polygon
          points="200,110 260,145 260,235 200,270 140,235 140,145"
          stroke={colors.violet.primary}
          strokeWidth="1"
          fill="none"
          opacity={0}
          animate={reduced ? {} : {
            opacity: [0.3, 0.1, 0],
            strokeWidth: [1, 0.5, 0.2],
            scale: [1, 1.3, 1.6],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeOut", repeatDelay: 3 }}
          style={{ originX: "200px", originY: "190px" }}
        />

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
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.violet.primary} strokeWidth="0.3" opacity="0.12" strokeDasharray="3 5" />
              <line x1={x3} y1={y3} x2={x4} y2={y4} stroke={colors.violet.primary} strokeWidth="0.3" opacity="0.12" strokeDasharray="3 5" />
            </g>
          );
        })}

        {/* Central Tiwaz + Shield emblem */}
        <g opacity="0.6">
          {/* Shield shape (small) */}
          <path
            d="M200,155 L225,170 L225,200 Q225,215 200,225 Q175,215 175,200 L175,170 Z"
            stroke={colors.violet.primary}
            strokeWidth="1.2"
            fill={colors.violet.muted}
          />
          {/* Tiwaz inside shield */}
          <line x1="200" y1="163" x2="200" y2="215" stroke={colors.violet.primary} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="200" y1="168" x2="189" y2="181" stroke={colors.violet.primary} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="200" y1="168" x2="211" y2="181" stroke={colors.violet.primary} strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Corner ward runes */}
        {/* Algiz (ᛉ) — protection rune, 4 corners */}
        {[
          { x: 75, y: 75 },
          { x: 325, y: 75 },
          { x: 75, y: 315 },
          { x: 325, y: 315 },
        ].map((pos, i) => (
          <g key={i} opacity="0.15" transform={`translate(${pos.x}, ${pos.y})`}>
            <line x1="0" y1="8" x2="0" y2="-8" stroke={colors.violet.primary} strokeWidth="0.8" />
            <line x1="0" y1="-4" x2="-5" y2="-10" stroke={colors.violet.primary} strokeWidth="0.6" />
            <line x1="0" y1="-4" x2="5" y2="-10" stroke={colors.violet.primary} strokeWidth="0.6" />
          </g>
        ))}

        {/* Glowing center point */}
        <motion.circle
          cx="200" cy="190" r="2.5"
          fill={colors.violet.primary}
          animate={reduced ? {} : { opacity: [0.4, 0.9, 0.4], r: [2.5, 3.5, 2.5] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}
