/**
 * Interactive visual lessons — the structured lesson the AI service returns for kind "visual_lesson", re-validated here
 * before it is stored (learning_resources.content, as JSON). The frontend validates it a third time before rendering.
 *
 * A visual is DATA for one of a fixed set of renderers (frontend: src/components/visual/registry.tsx). Nothing in it
 * is ever executed: no code, no expressions, no URLs, no markup. Unknown types, unknown fields and out-of-range values
 * are dropped or clamped; a step whose visual is invalid keeps its text and simply has no visual.
 *
 * Registry v1:
 *   shape3d   a solid with labelled dimensions          (geometry)
 *   molecule  atoms + bonds, laid out by the renderer   (chemistry)
 *   graph2d   a function from a fixed family            (mathematics)
 *   vectors   labelled arrows in 3D                     (physics: forces, velocity, fields)
 *   orbit     bodies circling a centre                  (astronomy, electron shells)
 *   wave      a travelling wave                         (physics: sound, light)
 *   flow      nodes and arrows, optionally a cycle      (processes, biology/chemistry cycles) — 2D
 *   labeled   a structure and its labelled parts        (biology, anatomy, systems) — 2D
 */
export const VISUAL_TYPES = ['shape3d', 'molecule', 'graph2d', 'vectors', 'orbit', 'wave', 'flow', 'labeled'] as const;
export type VisualType = (typeof VISUAL_TYPES)[number];
export const SHAPES = ['cube', 'cuboid', 'sphere', 'cylinder', 'cone', 'pyramid', 'torus', 'prism'] as const;
export const FUNCTION_FAMILIES = ['linear', 'quadratic', 'cubic', 'sine', 'cosine', 'exponential', 'logarithmic', 'absolute'] as const;
/** Elements the molecule renderer colours; anything else is refused (keeps the spec closed). */
export const ELEMENTS = ['H', 'C', 'N', 'O', 'F', 'P', 'S', 'Cl', 'Br', 'I', 'Na', 'K', 'Mg', 'Ca', 'Fe', 'Cu', 'Zn', 'Al', 'Si', 'B', 'Li', 'He', 'Ne', 'Ar'] as const;

export interface VisualLessonStep {
  title: string;
  explanation: string;
  visual: Record<string, unknown> | null;
}
export interface VisualLesson {
  version: 1;
  title: string;
  summary: string;
  steps: VisualLessonStep[];
  keyTakeaways: string[];
  /** 'topic' = taught from general knowledge (set by the backend from the request, never taken from the AI) */
  basis?: 'material' | 'topic';
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max) : '');
const num = (v: unknown, min: number, max: number, dflt: number): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null);
const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const ident = (v: unknown): string => str(v, 24).replace(/[^A-Za-z0-9_-]/g, '');

/** One visual, cleaned; null when it cannot be rendered safely. */
export function validateVisual(raw: unknown): Record<string, unknown> | null {
  const v = obj(raw);
  const type = oneOf(v?.type, VISUAL_TYPES);
  if (!v || !type) return null;
  const caption = str(v.caption, 200);
  switch (type) {
    case 'shape3d': {
      const shape = oneOf(v.shape, SHAPES);
      if (!shape) return null;
      const labels = list(v.labels, 6).map((l) => str(l, 60)).filter(Boolean);
      const dims = obj(v.dimensions) ?? {};
      const dimensions = Object.fromEntries(
        Object.entries(dims)
          .slice(0, 4)
          .map(([k, d]) => [str(k, 24), num(d, 0.1, 100, 1)] as const)
          .filter(([k]) => k),
      );
      return { type, caption, shape, labels, dimensions };
    }
    case 'molecule': {
      const atoms = list(v.atoms, 24)
        .map(obj)
        .filter((a): a is Raw => !!a)
        .map((a) => ({ id: ident(a.id), element: oneOf(a.element, ELEMENTS) }))
        .filter((a): a is { id: string; element: (typeof ELEMENTS)[number] } => !!a.id && !!a.element);
      const ids = new Set(atoms.map((a) => a.id));
      if (atoms.length < 1 || ids.size !== atoms.length) return null;
      const bonds = list(v.bonds, 40)
        .map(obj)
        .filter((b): b is Raw => !!b)
        .map((b) => ({ a: ident(b.a), b: ident(b.b), order: Math.round(num(b.order, 1, 3, 1)) }))
        .filter((b) => ids.has(b.a) && ids.has(b.b) && b.a !== b.b);
      return { type, caption, name: str(v.name, 80), atoms, bonds };
    }
    case 'graph2d': {
      const family = oneOf(v.family, FUNCTION_FAMILIES);
      if (!family) return null;
      let xMin = num(v.xMin, -100, 100, -10);
      let xMax = num(v.xMax, -100, 100, 10);
      if (xMax <= xMin) [xMin, xMax] = [-10, 10];
      const points = list(v.points, 8)
        .map(obj)
        .filter((p): p is Raw => !!p)
        .map((p) => ({ x: num(p.x, -1000, 1000, 0), y: num(p.y, -1000, 1000, 0), label: str(p.label, 40) }));
      return { type, caption, family, a: num(v.a, -100, 100, 1), b: num(v.b, -100, 100, 0), c: num(v.c, -100, 100, 0), d: num(v.d, -100, 100, 0), xMin, xMax, xLabel: str(v.xLabel, 30), yLabel: str(v.yLabel, 30), points };
    }
    case 'vectors': {
      const vectors = list(v.vectors, 8)
        .map(obj)
        .filter((a): a is Raw => !!a)
        .map((a) => ({ x: num(a.x, -10, 10, 0), y: num(a.y, -10, 10, 0), z: num(a.z, -10, 10, 0), label: str(a.label, 40) }))
        .filter((a) => a.x || a.y || a.z);
      return vectors.length ? { type, caption, vectors, showResultant: v.showResultant === true } : null;
    }
    case 'orbit': {
      const bodies = list(v.bodies, 8)
        .map(obj)
        .filter((b): b is Raw => !!b)
        .map((b) => ({ label: str(b.label, 40), radius: num(b.radius, 1, 10, 3), period: num(b.period, 1, 60, 10) }))
        .filter((b) => b.label);
      return bodies.length ? { type, caption, center: str(v.center, 40) || 'Centre', bodies } : null;
    }
    case 'wave':
      return { type, caption, amplitude: num(v.amplitude, 0.1, 5, 1), wavelength: num(v.wavelength, 0.5, 20, 4), waves: Math.round(num(v.waves, 1, 6, 1)), label: str(v.label, 60) };
    case 'flow': {
      const nodes = list(v.nodes, 12)
        .map(obj)
        .filter((n): n is Raw => !!n)
        .map((n) => ({ id: ident(n.id), label: str(n.label, 60) }))
        .filter((n) => n.id && n.label);
      const ids = new Set(nodes.map((n) => n.id));
      if (nodes.length < 2 || ids.size !== nodes.length) return null;
      const edges = list(v.edges, 20)
        .map(obj)
        .filter((e): e is Raw => !!e)
        .map((e) => ({ from: ident(e.from), to: ident(e.to), label: str(e.label, 40) }))
        .filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);
      return { type, caption, nodes, edges, cycle: v.cycle === true };
    }
    case 'labeled': {
      const parts = list(v.parts, 10)
        .map(obj)
        .filter((p): p is Raw => !!p)
        .map((p) => ({ label: str(p.label, 50), description: str(p.description, 200) }))
        .filter((p) => p.label);
      return parts.length ? { type, caption, subject: str(v.subject, 60), parts } : null;
    }
  }
}

/** The whole lesson, cleaned; null when nothing usable remains (fewer than 2 steps with text). */
export function validateVisualLesson(raw: unknown): VisualLesson | null {
  const r = obj(raw);
  if (!r) return null;
  const steps = list(r.steps, 10)
    .map(obj)
    .filter((s): s is Raw => !!s)
    .map((s) => ({ title: str(s.title, 120), explanation: text(s.explanation, 2500), visual: validateVisual(s.visual) }))
    .filter((s) => s.title && s.explanation);
  if (steps.length < 2) return null;
  return {
    version: 1,
    title: str(r.title, 200),
    summary: text(r.summary, 1200),
    steps,
    keyTakeaways: list(r.keyTakeaways, 8).map((k) => str(k, 200)).filter(Boolean),
  };
}

/** The words of a stored visual lesson (title, summary, each step, takeaways), e.g. to make a quiz from it. */
export function visualLessonText(content: string): string {
  let lesson: VisualLesson | null = null;
  try {
    lesson = validateVisualLesson(JSON.parse(content));
  } catch {
    lesson = null;
  }
  if (!lesson) return '';
  return [lesson.title, lesson.summary, ...lesson.steps.map((st, i) => `${i + 1}. ${st.title}\n${st.explanation}`), lesson.keyTakeaways.length ? `Key takeaways: ${lesson.keyTakeaways.join('; ')}` : '']
    .filter(Boolean)
    .join('\n\n');
}
