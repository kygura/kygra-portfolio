import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

import { Stratum } from "./graphics/Stratum";
import { Solis } from "./graphics/Solis";
import { Eclipse } from "./graphics/Eclipse";
import { Axis } from "./graphics/Axis";
import { Geo1 } from "./graphics/Geo1";
import { Geo2 } from "./graphics/Geo2";
import ProjectVisual from "./projects/ProjectVisual";

import { projects } from "@/lib/projects";

gsap.registerPlugin(ScrollTrigger);

// ── Grid layout definition ─────────────────────────────────────────────────
interface GraphicCellDef {
  id: string;
  type: "graphic";
  colSpan: string;
  component: React.ComponentType<{ className: string }>;
  colorVar: string;
  bg: string;
}

interface ProjectCellDef {
  id: string;
  type: "project";
  colSpan: string;
  slotIndex: number;
}

type GridCellDef = GraphicCellDef | ProjectCellDef;

const GRID_CELLS: GridCellDef[] = [
  // Row 1: 5+4+3 = 12
  { id: "project-0", type: "project", colSpan: "canvas-col-5", slotIndex: 0 },
  { id: "stratum", type: "graphic", colSpan: "canvas-col-4", component: Stratum, colorVar: "var(--accent-amber)", bg: "var(--bg-secondary)" },
  { id: "project-1", type: "project", colSpan: "canvas-col-3", slotIndex: 1 },
  // Row 2: 3+5+4 = 12
  { id: "geo1", type: "graphic", colSpan: "canvas-col-3", component: Geo1, colorVar: "var(--bg-primary)", bg: "var(--accent-sage)" },
  { id: "project-2", type: "project", colSpan: "canvas-col-5", slotIndex: 2 },
  { id: "project-3", type: "project", colSpan: "canvas-col-4", slotIndex: 3 },
  // Row 3: 4+3+5 = 12
  { id: "project-4", type: "project", colSpan: "canvas-col-4", slotIndex: 4 },
  { id: "solis", type: "graphic", colSpan: "canvas-col-3", component: Solis, colorVar: "var(--bg-primary)", bg: "var(--accent-terracotta)" },
  { id: "project-5", type: "project", colSpan: "canvas-col-5", slotIndex: 5 },
  // Row 4: 3+4+5 = 12
  { id: "project-6", type: "project", colSpan: "canvas-col-3", slotIndex: 6 },
  { id: "eclipse", type: "graphic", colSpan: "canvas-col-4", component: Eclipse, colorVar: "var(--text-primary)", bg: "var(--bg-elevated)" },
  { id: "project-7", type: "project", colSpan: "canvas-col-5", slotIndex: 7 },
  // Row 5: 6+6 = 12
  { id: "axis", type: "graphic", colSpan: "canvas-col-6", component: Axis, colorVar: "var(--text-secondary)", bg: "var(--bg-secondary)" },
  { id: "geo2", type: "graphic", colSpan: "canvas-col-6", component: Geo2, colorVar: "var(--bg-primary)", bg: "var(--accent-amber)" },
];

const INITIAL_PROJECT_ORDER: string[] = [
  "meridian",
  "hyperagent",
  "zknull",
  "equilibria",
  "airmy",
  "lexis-editorial-companion",
  "colony",
  "gaia",
];

// ── Tilt wrapper for project cells ─────────────────────────────────────────
function TiltProject({
  children,
  className,
  onHoverChange,
  layoutId,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}: {
  children: React.ReactNode;
  className: string;
  onHoverChange?: (hovered: boolean) => void;
  layoutId?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
}) {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [7, -7]), { stiffness: 300, damping: 28 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-7, 7]), { stiffness: 300, damping: 28 });
  const glareX = useTransform(mouseX, [0, 1], [0, 100]);
  const glareY = useTransform(mouseY, [0, 1], [0, 100]);

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width);
    mouseY.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
    onHoverChange?.(false);
  };

  return (
    <motion.article
      className={className + (isDragOver ? " project-tile--drag-over" : "")}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      layoutId={layoutId}
      layout
      onMouseMove={onMove}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={onLeave}
      whileHover={{ scale: 1.008 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <motion.div
        className="project-tile__tilt-inner"
        style={{ background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(242,237,228,0.05) 0%, transparent 55%)` }}
        aria-hidden
      />
      {children}
    </motion.article>
  );
}

// ── Hover tooltip for icon-only project cards ──────────────────────────────
interface TooltipLink {
  label: string;
  href: string;
  type: "dossier" | "live" | "github";
}

function ProjectTooltip({ title, subtitle, links }: { title: string; subtitle: string; links: TooltipLink[] }) {
  return (
    <motion.div
      className="project-tooltip"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <span className="project-tooltip__title">{title}</span>
      <span className="project-tooltip__subtitle">{subtitle}</span>
      <div className="project-tooltip__links">
        {links.map((l) =>
          l.type === "dossier" ? (
            <Link
              key={l.href}
              to={l.href}
              className="project-tooltip__link project-tooltip__link--dossier"
            >
              {l.label}
            </Link>
          ) : (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="project-tooltip__link"
            >
              {l.label}
            </a>
          )
        )}
      </div>
    </motion.div>
  );
}

// ── Icon-only project card ─────────────────────────────────────────────────
function ProjectCard({
  slug,
  colSpan,
  slotIndex,
  onSwap,
  dragOverSlot,
  setDragOverSlot,
}: {
  slug: string;
  colSpan: string;
  slotIndex: number;
  onSwap: (from: number, to: number) => void;
  dragOverSlot: number | null;
  setDragOverSlot: (slot: number | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const p = projects.find((x) => x.slug === slug);
  if (!p) return null;

  const tooltipLinks: TooltipLink[] = p.links.map((l) => {
    if (l.href.startsWith("/")) return { ...l, type: "dossier" as const };
    if (l.label.toLowerCase().includes("github")) return { ...l, type: "github" as const };
    return { ...l, type: "live" as const };
  });

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/bento-slot", String(slotIndex));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSlot(slotIndex);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromSlot = Number(e.dataTransfer.getData("application/bento-slot"));
    if (fromSlot !== slotIndex) {
      onSwap(fromSlot, slotIndex);
    }
    setDragOverSlot(null);
  };

  const handleDragEnd = () => {
    setDragOverSlot(null);
  };

  return (
    <TiltProject
      className={`canvas-cell project-tile project-tile--${p.palette} ${colSpan}`}
      onHoverChange={setHovered}
      layoutId={`project-${slug}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      isDragOver={dragOverSlot === slotIndex}
    >
      <div
        className="project-tile__overlay"
        aria-label={`Open ${p.title}`}
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/projects/${p.slug}`)}
        onKeyDown={(e) => { if (e.key === "Enter") navigate(`/projects/${p.slug}`); }}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      />
      <div className="project-tile__visual">
        <ProjectVisual palette={p.palette} />
      </div>
      <AnimatePresence>
        {hovered && (
          <ProjectTooltip title={p.title} subtitle={p.subtitle} links={tooltipLinks} />
        )}
      </AnimatePresence>
    </TiltProject>
  );
}

export default function BentoCanvas() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [projectOrder, setProjectOrder] = useState<string[]>(INITIAL_PROJECT_ORDER);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  const handleSwap = useCallback((fromSlot: number, toSlot: number) => {
    setProjectOrder((prev) => {
      const next = [...prev];
      [next[fromSlot], next[toSlot]] = [next[toSlot], next[fromSlot]];
      return next;
    });
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cells = gridRef.current?.querySelectorAll(".canvas-cell");
      if (!cells?.length) return;
      cells.forEach((cell, i) => {
        gsap.fromTo(
          cell,
          { opacity: 0, y: 28 + (i % 3) * 6 },
          {
            opacity: 1, y: 0,
            duration: 0.72, ease: "power3.out",
            scrollTrigger: { trigger: cell, start: "top 92%", once: true },
            delay: (i % 4) * 0.06,
          }
        );
      });
    }, gridRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={gridRef} className="canvas-grid">
      <AnimatePresence>
        {GRID_CELLS.map((cell) => {
          if (cell.type === "graphic") {
            return (
              <div
                key={cell.id}
                className={`canvas-cell canvas-cell--graphic ${cell.colSpan}`}
                style={{ background: cell.bg, color: cell.colorVar }}
              >
                <cell.component className="canvas-cell__svg" />
              </div>
            );
          }

          const slug = projectOrder[cell.slotIndex];
          return (
            <ProjectCard
              key={`slot-${cell.slotIndex}`}
              slug={slug}
              colSpan={cell.colSpan}
              slotIndex={cell.slotIndex}
              onSwap={handleSwap}
              dragOverSlot={dragOverSlot}
              setDragOverSlot={setDragOverSlot}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
