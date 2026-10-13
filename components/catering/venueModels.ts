import {
  BoxGeometry,
  BufferAttribute,
  type BufferGeometry,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BOX_SIZE, COLOURS } from "./venueLayout";

type Vec3 = [number, number, number];
type Part = {
  geometry: BufferGeometry;
  colour: string;
  at?: Vec3;
  scale?: Vec3;
};

// Merges coloured primitives into one geometry so each object is a single draw call.
// Vertex colours are stored in linear space, which is what three expects.
function build(parts: Part[]) {
  const colour = new Color();
  const mixed = parts.some((p) => !p.geometry.index);
  const geometries = parts.map(({ geometry: source, colour: hex, at, scale }) => {
    const geometry = mixed && source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    if (scale) geometry.scale(...scale);
    if (at) geometry.translate(...at);
    colour.set(hex);
    const count = geometry.getAttribute("position").count;
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colour.toArray(colours, i * 3);
    geometry.setAttribute("color", new BufferAttribute(colours, 3));
    return geometry;
  });
  const merged = mergeGeometries(geometries);
  geometries.forEach((g) => g.dispose());
  if (!merged) throw new Error("Could not merge venue geometry");
  return merged;
}

const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);

const UP = new Vector3(0, 1, 0);

/** Thin rod between two points, already in place. */
function rod(from: Vec3, to: Vec3, radius: number, colour: string): Part {
  const a = new Vector3(...from);
  const dir = new Vector3(...to).sub(a);
  const geometry = new CylinderGeometry(radius, radius, dir.length(), 6);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, dir.clone().normalize()));
  const mid = a.addScaledVector(dir, 0.5);
  geometry.translate(mid.x, mid.y, mid.z);
  return { geometry, colour };
}

/** Chair with its back on +z, so rotating by its seat angle turns it to face the table. */
export function chairGeometry() {
  const legs: Part[] = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => ({
      geometry: box(0.035, 0.44, 0.035),
      colour: COLOURS.pimento,
      at: [sx * 0.19, 0.22, sz * 0.18] as Vec3,
    })),
  );
  return build([
    ...legs,
    { geometry: box(0.44, 0.05, 0.42), colour: COLOURS.paper, at: [0, 0.465, 0] },
    { geometry: box(0.44, 0.36, 0.04), colour: COLOURS.paper, at: [0, 0.69, 0.19] },
    { geometry: box(0.035, 0.42, 0.035), colour: COLOURS.pimento, at: [-0.2, 0.68, 0.2] },
    { geometry: box(0.035, 0.42, 0.035), colour: COLOURS.pimento, at: [0.2, 0.68, 0.2] },
  ]);
}

export function plateGeometry() {
  return build([
    { geometry: new CylinderGeometry(0.135, 0.12, 0.012, 20), colour: COLOURS.hairline, at: [0, 0.006, 0] },
    { geometry: new CylinderGeometry(0.115, 0.115, 0.006, 20), colour: COLOURS.cream, at: [0, 0.014, 0] },
  ]);
}

export function centrepieceGeometry() {
  const blooms: Part[] = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2;
    return {
      geometry: new IcosahedronGeometry(0.05, 1),
      colour: COLOURS.paper,
      at: [Math.cos(a) * 0.06, 0.13 + (i % 2) * 0.03, Math.sin(a) * 0.06] as Vec3,
    };
  });
  return build([
    { geometry: new CylinderGeometry(0.1, 0.075, 0.09, 16), colour: COLOURS.mountain, at: [0, 0.045, 0] },
    { geometry: new IcosahedronGeometry(0.06, 1), colour: COLOURS.paper, at: [0, 0.18, 0] },
    ...blooms,
  ]);
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Round tablecloth from the tabletop to just above the floor: a softly rounded edge,
 * a straight drop, then a gentle flare with shallow folds towards the hem.
 */
export function clothGeometry(top: number) {
  const profile = [
    [0.955, 0.015],
    [0.94, 0.04],
    [0.905, 0.11],
    [0.875, 0.24],
    [0.86, 0.42],
    [0.855, top - 0.1],
    [0.85, top - 0.03],
    [0.835, top - 0.008],
    [0.8, top],
    [0, top],
  ].map(([r, y]) => new Vector2(r, y));
  const geometry = new LatheGeometry(profile, 48);
  const pos = geometry.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const fold = 1 + 0.022 * smoothstep(0.5, 0.05, pos.getY(i)) * Math.sin(Math.atan2(x, z) * 12);
    pos.setX(i, x * fold);
    pos.setZ(i, z * fold);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Runner laid across the tabletop (origin at the top surface) and hanging over both edges. */
export function runnerGeometry() {
  const width = 0.32;
  const drop = 0.26;
  const edge = 0.859;
  return build([
    { geometry: box(edge * 2, 0.006, width), colour: COLOURS.mountain, at: [0, 0.003, 0] },
    ...[-1, 1].flatMap((side): Part[] => [
      { geometry: box(0.006, drop, width), colour: COLOURS.mountain, at: [side * edge, -drop / 2, 0] },
      { geometry: box(0.008, 0.016, width + 0.002), colour: COLOURS.allspice, at: [side * edge, -drop + 0.03, 0] },
    ]),
  ]);
}

/** Kraft food box with a thin sorrel band wrapped over the lid; origin at the base. */
export function foodBoxGeometry() {
  const { width: w, height: h, depth: d } = BOX_SIZE;
  return build([
    { geometry: box(w, h, d), colour: COLOURS.kraft, at: [0, h / 2, 0] },
    { geometry: box(0.036, h + 0.004, d + 0.004), colour: COLOURS.sorrel, at: [w * 0.22, h / 2 + 0.001, 0] },
  ]);
}

/**
 * Cream cloth along the buffet table, one unit long so it scales with the table.
 * Origin is the top surface; it hangs over the front edge so scaling y unrolls it.
 */
export function buffetClothGeometry(tableDepth: number) {
  const front = tableDepth / 2 + 0.004;
  const depth = 0.56;
  const drop = 0.42;
  return build([
    { geometry: box(0.88, 0.006, depth), colour: COLOURS.cream, at: [0, 0.003, front - depth / 2] },
    { geometry: box(0.88, drop, 0.006), colour: COLOURS.cream, at: [0, -drop / 2, front] },
    { geometry: box(0.88, 0.014, 0.008), colour: COLOURS.allspice, at: [0, -drop + 0.04, front + 0.001] },
  ]);
}

export function chafingDishGeometry() {
  const handles: Part[] = [-1, 1].map((side) => ({
    geometry: box(0.05, 0.022, 0.11),
    colour: COLOURS.allspice,
    at: [side * 0.345, 0.115, 0] as Vec3,
  }));
  return build([
    { geometry: new CylinderGeometry(0.29, 0.27, 0.1, 28), colour: COLOURS.pimento, at: [0, 0.05, 0] },
    { geometry: new CylinderGeometry(0.315, 0.315, 0.035, 28), colour: COLOURS.allspice, at: [0, 0.117, 0] },
    {
      geometry: new SphereGeometry(0.305, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: COLOURS.cream,
      at: [0, 0.134, 0],
      scale: [1, 0.64, 1],
    },
    { geometry: new CylinderGeometry(0.012, 0.012, 0.03, 8), colour: COLOURS.allspice, at: [0, 0.34, 0] },
    { geometry: new SphereGeometry(0.034, 12, 8), colour: COLOURS.allspice, at: [0, 0.37, 0], scale: [1.3, 0.8, 1.3] },
    ...handles,
  ]);
}

export function balloonClusterGeometry() {
  const balloons: { at: Vec3; colour: string; string: string }[] = [
    { at: [0, 2.08, 0], colour: COLOURS.sorrel, string: COLOURS.allspice },
    { at: [0.27, 1.9, 0.08], colour: COLOURS.allspice, string: COLOURS.cream },
    { at: [-0.25, 1.88, 0.1], colour: COLOURS.cream, string: COLOURS.allspice },
    { at: [0.06, 1.76, 0.28], colour: COLOURS.cream, string: COLOURS.allspice },
    { at: [-0.04, 2.22, -0.2], colour: COLOURS.sorrel, string: COLOURS.cream },
  ];
  const weightTop: Vec3 = [0, 0.07, 0];
  const parts: Part[] = balloons.flatMap(({ at, colour, string }) => {
    const knot: Vec3 = [at[0], at[1] - 0.235, at[2]];
    return [
      { geometry: new SphereGeometry(0.2, 18, 12), colour, at, scale: [1, 1.18, 1] as Vec3 },
      { geometry: new CylinderGeometry(0.004, 0.022, 0.03, 8), colour, at: [knot[0], knot[1] + 0.012, knot[2]] as Vec3 },
      rod(weightTop, knot, 0.0035, string),
    ];
  });
  parts.push(
    { geometry: new CylinderGeometry(0.035, 0.05, 0.06, 12), colour: COLOURS.allspice, at: [0, 0.03, 0] },
    { geometry: new SphereGeometry(0.018, 8, 6), colour: COLOURS.allspice, at: [0, 0.068, 0] },
  );
  return build(parts);
}

/** Three mini balloons on short strings, tied to a small weight; origin on the tabletop. */
export function tableBalloonsGeometry() {
  const balloons: { at: Vec3; colour: string; string: string }[] = [
    { at: [0, 0.5, 0], colour: COLOURS.sorrel, string: COLOURS.allspice },
    { at: [0.09, 0.43, 0.05], colour: COLOURS.allspice, string: COLOURS.cream },
    { at: [-0.08, 0.42, 0.06], colour: COLOURS.cream, string: COLOURS.allspice },
  ];
  const weightTop: Vec3 = [0, 0.045, 0];
  const parts: Part[] = balloons.flatMap(({ at, colour, string }) => {
    const knot: Vec3 = [at[0], at[1] - 0.085, at[2]];
    return [
      { geometry: new SphereGeometry(0.072, 14, 10), colour, at, scale: [1, 1.18, 1] as Vec3 },
      { geometry: new CylinderGeometry(0.002, 0.01, 0.014, 6), colour, at: [knot[0], knot[1] + 0.006, knot[2]] as Vec3 },
      rod(weightTop, knot, 0.0025, string),
    ];
  });
  parts.push({ geometry: new CylinderGeometry(0.026, 0.034, 0.045, 12), colour: COLOURS.allspice, at: [0, 0.0225, 0] });
  return build(parts).scale(1.25, 1.25, 1.25);
}

export function screenGeometry() {
  const legs: Part[] = [0, 1, 2].map((i) => {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    return rod([Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4 - 0.05], [0, 0.85, -0.05], 0.016, COLOURS.pimento);
  });
  return build([
    ...legs,
    { geometry: box(0.04, 1.3, 0.04), colour: COLOURS.pimento, at: [0, 1.4, -0.05] },
    { geometry: box(2, 1.15, 0.03), colour: COLOURS.paper, at: [0, 1.55, 0] },
    { geometry: box(2.08, 0.06, 0.06), colour: COLOURS.pimento, at: [0, 2.15, 0] },
    { geometry: box(2.08, 0.05, 0.05), colour: COLOURS.pimento, at: [0, 0.95, 0] },
    { geometry: box(1.4, 0.06, 0.005), colour: COLOURS.mountain, at: [0, 1.82, 0.018] },
    { geometry: box(0.9, 0.035, 0.005), colour: COLOURS.allspice, at: [0, 1.66, 0.018] },
    { geometry: box(1.1, 0.035, 0.005), colour: COLOURS.mountainMuted, at: [0, 1.56, 0.018] },
  ]);
}

/** Frame for a window set into a wall facing +x; the glass is a separate mesh. */
export function windowFrameGeometry(width: number, height: number) {
  const t = 0.07;
  return build([
    { geometry: box(0.06, t, width + t), colour: COLOURS.paper, at: [0, height / 2, 0] },
    { geometry: box(0.06, t, width + t), colour: COLOURS.paper, at: [0, -height / 2, 0] },
    { geometry: box(0.06, height, t), colour: COLOURS.paper, at: [0, 0, width / 2] },
    { geometry: box(0.06, height, t), colour: COLOURS.paper, at: [0, 0, -width / 2] },
    { geometry: box(0.05, height, 0.035), colour: COLOURS.paper, at: [0, 0, 0] },
    { geometry: box(0.05, 0.035, width), colour: COLOURS.paper, at: [0, height * 0.18, 0] },
    { geometry: box(0.16, 0.04, width + 0.2), colour: COLOURS.hairline, at: [0.05, -height / 2 - 0.04, 0] },
  ]);
}

/** Where the shade sits on the lamp fitting, relative to its wall mount. */
export const LAMP_SHADE_AT: Vec3 = [0, 0.13, 0.19];

/** Wall lamp fitting on a wall facing +z: back-plate, curved arm and socket. The shade is a separate mesh. */
export function lampFittingGeometry() {
  const [, sy, sz] = LAMP_SHADE_AT;
  const plate = new CylinderGeometry(0.065, 0.065, 0.02, 20);
  plate.rotateX(Math.PI / 2);
  return build([
    { geometry: plate, colour: COLOURS.pimento, at: [0, 0, 0.01] },
    rod([0, 0, 0.02], [0, 0.015, 0.11], 0.011, COLOURS.pimento),
    rod([0, 0.015, 0.11], [0, sy - 0.07, sz], 0.011, COLOURS.pimento),
    { geometry: new CylinderGeometry(0.022, 0.026, 0.05, 12), colour: COLOURS.pimento, at: [0, sy - 0.05, sz] },
  ]);
}
