"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { animate, motion, useReducedMotion } from "motion/react";
import usStatesTopology from "us-atlas/states-10m.json";
import type { StateRow } from "@/lib/data";

/** Delay between each state's entrance so the map assembles rather than appears at once. */
const STAGGER_MS = 8;

const WIDTH = 960;
const HEIGHT = 600;
/** Extra room around a clicked state so it doesn't zoom in flush to its own edges. */
const ZOOM_PADDING = 0.3;
const ZOOM_DURATION_S = 0.7;

type ViewBox = [number, number, number, number];
type Bounds = [[number, number], [number, number]];

function boundsToViewBox([[x0, y0], [x1, y1]]: Bounds): ViewBox {
  return [x0, y0, x1 - x0, y1 - y0];
}

function padBounds([[x0, y0], [x1, y1]]: Bounds, fraction: number): Bounds {
  const w = x1 - x0;
  const h = y1 - y0;
  const px = w * fraction;
  const py = h * fraction;
  return [
    [x0 - px, y0 - py],
    [x1 + px, y1 + py],
  ];
}

interface UsMapProps {
  states: StateRow[];
  onSelect: (fips: string) => void;
}

export function UsMap({ states, onSelect }: UsMapProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const knownFips = useMemo(() => new Set(states.map((s) => s.fips)), [states]);
  const nameByFips = useMemo(() => new Map(states.map((s) => [s.fips, s.name])), [states]);

  const { pathFor, boundsFor, initialViewBox } = useMemo(() => {
    const topology = usStatesTopology as unknown as Topology;
    const geometries = topology.objects.states as GeometryCollection;
    const collection = feature(topology, geometries);
    const relevant = collection.features.filter((f) => knownFips.has(String(f.id)));
    const relevantCollection = { type: "FeatureCollection" as const, features: relevant };

    const projection = geoAlbersUsa().fitSize([WIDTH, HEIGHT], relevantCollection);
    const pathGenerator = geoPath(projection);

    const pathFor = new Map<string, string>();
    const boundsFor = new Map<string, Bounds>();
    for (const f of relevant) {
      const id = String(f.id);
      pathFor.set(id, pathGenerator(f) ?? "");
      boundsFor.set(id, pathGenerator.bounds(f));
    }

    return {
      pathFor,
      boundsFor,
      initialViewBox: boundsToViewBox(pathGenerator.bounds(relevantCollection)),
    };
  }, [knownFips]);

  const [viewBox, setViewBox] = useState<ViewBox>(initialViewBox);
  const [hoveredFips, setHoveredFips] = useState<string | null>(null);
  const [selectedFips, setSelectedFips] = useState<string | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  // Ambient drift only kicks in once every state has finished assembling —
  // otherwise the entrance stagger and the drift's own transform would fight
  // for the same property mid-animation.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setSettled(true),
      states.length * STAGGER_MS + 400
    );
    return () => clearTimeout(timer);
  }, [states.length]);

  function handlePointerMove(event: React.PointerEvent<SVGPathElement>) {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  function selectState(fips: string) {
    if (selectedFips) return; // a zoom is already in flight or done — ignore repeat activation
    setSelectedFips(fips);
    setHoveredFips(null);

    const bounds = boundsFor.get(fips);
    if (!bounds) {
      onSelect(fips);
      return;
    }
    const target = boundsToViewBox(padBounds(bounds, ZOOM_PADDING));

    if (prefersReducedMotion) {
      setViewBox(target);
      onSelect(fips);
      return;
    }

    const from = viewBox;
    animate(0, 1, {
      duration: ZOOM_DURATION_S,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (t) => {
        setViewBox([
          from[0] + (target[0] - from[0]) * t,
          from[1] + (target[1] - from[1]) * t,
          from[2] + (target[2] - from[2]) * t,
          from[3] + (target[3] - from[3]) * t,
        ]);
      },
      onComplete: () => onSelect(fips),
    });
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl">
      <svg
        viewBox={viewBox.join(" ")}
        className="w-full"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      >
        {/* role="group" (not "img") so each state's role="button" stays exposed to assistive tech individually. */}
        <g role="group" aria-label="Select your state">
          {states.map((state, index) => {
            const d = pathFor.get(state.fips);
            if (!d) return null;
            const isHovered = hoveredFips === state.fips;
            const isSelected = selectedFips === state.fips;
            const isLifted = isHovered && !selectedFips;
            // A hovered (unselected) state dims every other state; once one is
            // selected, everything but the selection dims regardless of hover.
            const isDimmed = selectedFips !== null ? !isSelected : hoveredFips !== null && !isHovered;
            const ambient = !prefersReducedMotion && settled && !isLifted;
            return (
              <motion.path
                key={state.fips}
                d={d}
                tabIndex={0}
                role="button"
                aria-label={state.name}
                onClick={() => selectState(state.fips)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectState(state.fips);
                  }
                }}
                onPointerEnter={() => !selectedFips && setHoveredFips(state.fips)}
                onPointerLeave={() => setHoveredFips((prev) => (prev === state.fips ? null : prev))}
                onPointerMove={handlePointerMove}
                className="cursor-pointer outline-none transition-[fill] duration-150 focus-visible:stroke-ring focus-visible:stroke-2"
                style={{
                  fill: isHovered || isSelected ? "var(--brand)" : "var(--secondary)",
                  stroke: "var(--background)",
                  strokeWidth: 1,
                  transformBox: "fill-box",
                  transformOrigin: "center",
                }}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={
                  isLifted
                    ? { y: -3, scale: 1.04, opacity: isDimmed ? 0.35 : 1 }
                    : ambient
                      ? { y: [0, -1.2, 0], scale: 1, opacity: isDimmed ? 0.35 : 1 }
                      : { y: 0, scale: 1, opacity: isDimmed ? 0.35 : 1 }
                }
                transition={
                  isLifted
                    ? { type: "spring", stiffness: 320, damping: 18 }
                    : ambient
                      ? {
                          y: {
                            duration: 4 + (index % 5),
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: (index % 7) * 0.3,
                          },
                          scale: { duration: 0.25 },
                        }
                      : { duration: 0.35, delay: index * (STAGGER_MS / 1000), ease: "easeOut" }
                }
              />
            );
          })}
        </g>
      </svg>

      {hoveredFips && pointer && !selectedFips ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-popover px-2.5 py-1 text-sm font-medium text-popover-foreground shadow-md"
          style={{ left: pointer.x, top: pointer.y - 12 }}
        >
          {nameByFips.get(hoveredFips)}
        </div>
      ) : null}
    </div>
  );
}
