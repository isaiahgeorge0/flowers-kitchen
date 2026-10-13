import {
  Color,
  type AmbientLight,
  type DirectionalLight,
  type MeshStandardMaterial,
  type Object3D,
  type PerspectiveCamera,
  type PointLight,
} from "three";
import {
  BOX_SIZE,
  COLOURS,
  MAX_BUFFET_TRAYS,
  MAX_SIDE_BOXES,
  MAX_TABLE_BOXES,
  MAX_TABLES,
  SEATS_PER_TABLE,
  SIDE_BOX_COLUMNS,
  SIDE_BOX_ROWS,
  WALL_HEIGHT,
  tableBoxes,
  type RoomPlan,
} from "./venueLayout";

// Springs: ω ≈ 14 rad/s, ζ ≈ 0.7, so items settle in about 400ms with a slight overshoot.
const STIFFNESS = 200;
const DAMPING = 20;
const EASE_RATE = 7;
const MIN_SCALE = 1e-4;
const DEG = Math.PI / 180;

export const CAMERA_FOV = 30;
export const WALL_THICKNESS = 0.14;
const AZIMUTH = 36 * DEG;
const ELEVATION = 33 * DEG;
export const YAW_LIMIT = 25 * DEG;
const FRAME_MARGIN = 0.04;
// Share of the frame height kept clear at the top for the tables chip.
const TOP_RESERVE = 0.1;
export const FAIRY_BULBS = 64;
/** Two lamps on the back wall either side of the banner, two on the window wall. */
export const LAMP_COUNT = 4;
const LAMP_HEIGHT = 2;
export const TABLE_TOP = 0.74;
export const SIDE_TABLE_TOP = 0.77;
const TRAY_SPACING = 0.85;
const BOX_COLUMN_SPACING = BOX_SIZE.width + 0.08;
const BOX_ROW_SPACING = BOX_SIZE.depth + 0.06;
const BOX_LAYER = BOX_SIZE.height + 0.002;
const SIDE_BOX_SLOTS = SIDE_BOX_COLUMNS * SIDE_BOX_ROWS;

// Fill order for one layer of side-table boxes: centre columns first, back row before front,
// so any count leaves a tidy, symmetrical arrangement.
const SIDE_BOX_ORDER = (() => {
  const columns = Array.from({ length: SIDE_BOX_COLUMNS }, (_, c) => c).sort(
    (a, b) => Math.abs(a - (SIDE_BOX_COLUMNS - 1) / 2) - Math.abs(b - (SIDE_BOX_COLUMNS - 1) / 2) || a - b,
  );
  const order: { column: number; row: number }[] = [];
  for (let i = 0; i < columns.length; i += 2) {
    const pair = columns.slice(i, i + 2);
    for (let row = 0; row < SIDE_BOX_ROWS; row++) for (const column of pair) order.push({ column, row });
  }
  return order;
})();

class Spring {
  v = 0;
  t: number;
  constructor(public x: number) {
    this.t = x;
  }
  step(dt: number, snap: boolean) {
    if (!snap) {
      this.v += (STIFFNESS * (this.t - this.x) - DAMPING * this.v) * dt;
      this.x += this.v * dt;
    }
    if (snap || (Math.abs(this.t - this.x) < 1e-3 && Math.abs(this.v) < 1e-2)) {
      this.x = this.t;
      this.v = 0;
      return true;
    }
    return false;
  }
}

class Ease {
  t: number;
  constructor(
    public x: number,
    private precision = 5e-3,
  ) {
    this.t = x;
  }
  step(dt: number, snap: boolean, rate = EASE_RATE) {
    if (!snap) this.x += (this.t - this.x) * (1 - Math.exp(-rate * dt));
    if (snap || Math.abs(this.t - this.x) < this.precision) {
      this.x = this.t;
      return true;
    }
    return false;
  }
}

type Tinted = Object3D & { color: Color };
type SlotPart = "group" | "flowers" | "runner" | "balloons";
export type RoomPart =
  | "floor"
  | "rug"
  | "backWall"
  | "leftWall"
  | "backSkirting"
  | "leftSkirting"
  | "window"
  | "banner"
  | "sideTable"
  | "sideTableBody"
  | "buffetCloth"
  | "fairyLights"
  | "balloonsLeft"
  | "balloonsRight"
  | "screen";
type Visibility =
  | "plates"
  | "box"
  | "flowers"
  | "runner"
  | "fairy"
  | "balloons"
  | "tableBalloons"
  | "screen"
  | "sideTable"
  | "buffetCloth";
export type GlowMaterial = "glass" | "fairy" | "shade";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function setScale(obj: Object3D | undefined, s: number) {
  if (!obj) return;
  obj.scale.setScalar(Math.max(MIN_SCALE, s));
}

function setVisibleScale(obj: Object3D | undefined, s: number) {
  if (!obj) return;
  obj.visible = s > 0.002;
  obj.scale.setScalar(Math.max(MIN_SCALE, s));
}

type Vec = [number, number, number];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function basis(azimuth: number) {
  const dir: Vec = [
    Math.sin(azimuth) * Math.cos(ELEVATION),
    Math.sin(ELEVATION),
    Math.cos(azimuth) * Math.cos(ELEVATION),
  ];
  const right: Vec = [Math.cos(azimuth), 0, -Math.sin(azimuth)];
  // up = right × forward, where forward = -dir
  const up: Vec = [
    -(right[1] * dir[2] - right[2] * dir[1]),
    -(right[2] * dir[0] - right[0] * dir[2]),
    -(right[0] * dir[1] - right[1] * dir[0]),
  ];
  return { dir, right, up };
}

/** Camera distance and look-at point that fit the whole room on screen. */
function frameRoom(width: number, depth: number, aspect: number, yaws: number[]) {
  const half = Math.tan((CAMERA_FOV / 2) * DEG) * (1 - FRAME_MARGIN);
  const ty = half * (1 - TOP_RESERVE);
  const tx = half * aspect;
  const w = width / 2;
  const d = depth / 2;
  const t = WALL_THICKNESS;
  const points: Vec[] = [
    [-w, -0.3, -d], [w, -0.3, -d], [-w, -0.3, d], [w, -0.3, d],
    [-w - t, WALL_HEIGHT, -d - t], [w, WALL_HEIGHT, -d - t], [-w - t, WALL_HEIGHT, d],
  ];
  const target: Vec = [0, WALL_HEIGHT * 0.3, 0];
  const front = basis(AZIMUTH);
  let distance = 0;

  const fit = () => {
    distance = 0;
    for (const yaw of yaws) {
      const { dir, right, up } = basis(AZIMUTH + yaw);
      for (const p of points) {
        const q: Vec = [p[0] - target[0], p[1] - target[1], p[2] - target[2]];
        const along = dot(q, dir);
        distance = Math.max(distance, along + Math.abs(dot(q, right)) / tx, along + Math.abs(dot(q, up)) / ty);
      }
    }
  };

  for (let pass = 0; pass < 3; pass++) {
    fit();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      const q: Vec = [p[0] - target[0], p[1] - target[1], p[2] - target[2]];
      const z = distance - dot(q, front.dir);
      const x = dot(q, front.right) / z;
      const y = dot(q, front.up) / z;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const cx = ((minX + maxX) / 2) * distance;
    const cy = ((minY + maxY) / 2) * distance;
    for (let i = 0; i < 3; i++) target[i] += front.right[i] * cx + front.up[i] * cy;
  }
  fit();
  // Lift the look-at point so the room sits below the reserved band.
  for (let i = 0; i < 3; i++) target[i] += front.up[i] * half * TOP_RESERVE * distance;
  return { distance, target };
}

// Evening keeps surfaces their true colours: the room light drops and turns neutral,
// dusk comes through the window, and the warmth comes only from the lamps' pools of light.
const DAY = {
  ambient: new Color("#FFF7EC"),
  sun: new Color("#FFF1DC"),
  glass: new Color(COLOURS.paper),
};
const EVENING = {
  ambient: new Color("#F4F3F1"),
  sun: new Color("#C6D0DA"),
  glass: new Color(COLOURS.dusk),
};
export const LAMP_LIGHT = "#FFD9A0";

export class VenueAnimator {
  private plan: RoomPlan;
  private slots = Array.from({ length: MAX_TABLES }, () => ({
    scale: new Spring(0),
    x: new Spring(0),
    z: new Spring(0),
    boxes: Array.from({ length: MAX_TABLE_BOXES }, () => new Spring(0)),
  }));
  private vis: Record<Visibility, Spring> = {
    plates: new Spring(0),
    box: new Spring(0),
    flowers: new Spring(0),
    runner: new Spring(0),
    fairy: new Spring(0),
    balloons: new Spring(0),
    tableBalloons: new Spring(0),
    screen: new Spring(0),
    sideTable: new Spring(0),
    buffetCloth: new Spring(0),
  };
  private boxShift = new Spring(0);
  private tableLength = new Spring(2);
  private trays = Array.from({ length: MAX_BUFFET_TRAYS }, () => ({ scale: new Spring(0), x: new Spring(0) }));
  private sideBoxes = Array.from({ length: MAX_SIDE_BOXES }, () => new Spring(0));
  private width: Ease;
  private depth: Ease;
  private rug: { z: Ease; width: Ease; depth: Ease };
  private evening: Ease;
  private cloth = new Color();
  private clothTarget = new Color();
  private clothSettled = true;
  private camera = {
    distance: new Ease(20, 0.01),
    x: new Ease(0),
    y: new Ease(0),
    z: new Ease(0),
    yaw: new Ease(0, 1e-3),
  };
  private aspect = 0;
  private canRotate = false;
  private tail = 0;

  private slotNodes = Array.from({ length: MAX_TABLES }, () => ({
    parts: {} as Partial<Record<SlotPart, Object3D>>,
    cloth: undefined as Tinted | undefined,
    plates: [] as (Object3D | undefined)[],
    boxes: [] as (Object3D | undefined)[],
  }));
  private room: Partial<Record<RoomPart, Object3D>> = {};
  private trayNodes: (Object3D | undefined)[] = [];
  private sideBoxNodes: (Object3D | undefined)[] = [];
  private bulbNodes: (Object3D | undefined)[] = [];
  private lampNodes: (Object3D | undefined)[] = [];
  private glow: Partial<Record<GlowMaterial, MeshStandardMaterial>> = {};
  private lights: { ambient?: AmbientLight; sun?: DirectionalLight; lamps: (PointLight | undefined)[] } = {
    lamps: [],
  };

  constructor(plan: RoomPlan) {
    this.plan = plan;
    this.width = new Ease(plan.width);
    this.depth = new Ease(plan.depth);
    this.rug = { z: new Ease(plan.rug.z), width: new Ease(plan.rug.width), depth: new Ease(plan.rug.depth) };
    this.evening = new Ease(plan.evening ? 1 : 0, 2e-3);
    this.retarget(plan, true);
  }

  bindSlot = (i: number, part: SlotPart, obj: Object3D | null) => {
    this.slotNodes[i].parts[part] = obj ?? undefined;
  };
  bindCloth = (i: number, obj: Tinted | null) => {
    this.slotNodes[i].cloth = obj ?? undefined;
    obj?.color.copy(this.cloth);
  };
  bindPlate = (i: number, k: number, obj: Object3D | null) => {
    this.slotNodes[i].plates[k] = obj ?? undefined;
  };
  bindTableBox = (i: number, k: number, obj: Object3D | null) => {
    this.slotNodes[i].boxes[k] = obj ?? undefined;
  };
  bindRoom = (part: RoomPart, obj: Object3D | null) => {
    this.room[part] = obj ?? undefined;
  };
  bindTray = (i: number, obj: Object3D | null) => {
    this.trayNodes[i] = obj ?? undefined;
  };
  bindSideBox = (i: number, obj: Object3D | null) => {
    this.sideBoxNodes[i] = obj ?? undefined;
  };
  bindLamp = (i: number, obj: Object3D | null) => {
    this.lampNodes[i] = obj ?? undefined;
  };
  bindBulb = (i: number, obj: Object3D | null) => {
    this.bulbNodes[i] = obj ?? undefined;
  };
  bindGlow = (name: GlowMaterial, material: MeshStandardMaterial | null) => {
    this.glow[name] = material ?? undefined;
  };
  bindAmbient = (light: AmbientLight | null) => {
    this.lights.ambient = light ?? undefined;
  };
  bindSun = (light: DirectionalLight | null) => {
    this.lights.sun = light ?? undefined;
  };
  bindLampLight = (i: number, light: PointLight | null) => {
    this.lights.lamps[i] = light ?? undefined;
  };

  setCanRotate(canRotate: boolean) {
    this.canRotate = canRotate;
    if (!canRotate) this.camera.yaw.t = 0;
    this.aspect = 0;
  }

  /** Drag rotation in radians, clamped to ±25°. */
  setYaw(yaw: number) {
    this.camera.yaw.t = Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, yaw));
  }

  get yaw() {
    return this.camera.yaw.t;
  }

  /** Keep rendering for a few frames so instanced matrices catch up. */
  kick(frames = 3) {
    this.tail = Math.max(this.tail, frames);
  }

  retarget(plan: RoomPlan, snap: boolean) {
    this.plan = plan;
    this.slots.forEach((slot, i) => {
      const target = plan.slots[i];
      if (target) {
        if (slot.scale.x <= MIN_SCALE * 10 && slot.scale.t === 0) {
          slot.x.x = slot.x.t = target.x;
          slot.z.x = slot.z.t = target.z;
        }
        slot.scale.t = 1;
        slot.x.t = target.x;
        slot.z.t = target.z;
        const boxes = tableBoxes(target.seats);
        slot.boxes.forEach((box, k) => (box.t = k < boxes ? 1 : 0));
      } else {
        slot.scale.t = 0;
      }
    });

    const { decor, service } = plan;
    this.vis.plates.t = service === "served" ? 1 : 0;
    this.vis.box.t = service === "boxes" ? 1 : 0;
    this.vis.flowers.t = decor.flowers ? 1 : 0;
    this.vis.runner.t = decor.runner ? 1 : 0;
    this.vis.fairy.t = decor.fairyLights ? 1 : 0;
    this.vis.balloons.t = decor.balloons ? 1 : 0;
    this.vis.tableBalloons.t = decor.tableBalloons ? 1 : 0;
    this.vis.screen.t = decor.screen ? 1 : 0;
    this.vis.sideTable.t = service === "buffet" || service === "boxes" ? 1 : 0;
    this.vis.buffetCloth.t = service === "buffet" ? 1 : 0;
    this.boxShift.t = decor.flowers || decor.tableBalloons ? 1 : 0;

    const trays = service === "buffet" ? plan.buffetTrays : 0;
    this.trays.forEach((tray, i) => {
      tray.scale.t = i < trays ? 1 : 0;
      if (i < trays) tray.x.t = (i - (trays - 1) / 2) * TRAY_SPACING;
    });
    const sideBoxes = service === "boxes" ? plan.sideBoxes : 0;
    this.sideBoxes.forEach((box, i) => (box.t = i < sideBoxes ? 1 : 0));
    if (service === "buffet") this.tableLength.t = trays * TRAY_SPACING + 0.6;
    else if (service === "boxes") this.tableLength.t = SIDE_BOX_COLUMNS * BOX_COLUMN_SPACING + 0.5;

    this.width.t = plan.width;
    this.depth.t = plan.depth;
    this.rug.z.t = plan.rug.z;
    this.rug.width.t = plan.rug.width;
    this.rug.depth.t = plan.rug.depth;
    this.evening.t = plan.evening ? 1 : 0;
    this.clothTarget.set(decor.cloth);
    this.clothSettled = false;
    if (snap) this.step(0, true, this.aspect || 1);
    this.kick();
  }

  /** Advances every animation; returns true once nothing is moving. */
  step(dt: number, snap: boolean, aspect: number) {
    let settled = true;
    const track = (done: boolean) => {
      if (!done) settled = false;
    };

    for (const slot of this.slots) {
      track(slot.scale.step(dt, snap));
      if (slot.scale.x < 0) {
        slot.scale.x = 0;
        slot.scale.v = 0;
      }
      track(slot.x.step(dt, snap));
      track(slot.z.step(dt, snap));
      for (const box of slot.boxes) track(box.step(dt, snap));
    }
    for (const spring of Object.values(this.vis)) track(spring.step(dt, snap));
    track(this.boxShift.step(dt, snap));
    track(this.tableLength.step(dt, snap));
    for (const tray of this.trays) {
      track(tray.scale.step(dt, snap));
      track(tray.x.step(dt, snap));
    }
    for (const box of this.sideBoxes) track(box.step(dt, snap));
    track(this.width.step(dt, snap));
    track(this.depth.step(dt, snap));
    for (const ease of Object.values(this.rug)) track(ease.step(dt, snap));
    track(this.evening.step(dt, snap, 4));

    if (!this.clothSettled) {
      if (snap) this.cloth.copy(this.clothTarget);
      else this.cloth.lerp(this.clothTarget, 1 - Math.exp(-10 * dt));
      const { r, g, b } = this.cloth;
      const t = this.clothTarget;
      this.clothSettled = Math.abs(r - t.r) + Math.abs(g - t.g) + Math.abs(b - t.b) < 2e-3;
      if (this.clothSettled) this.cloth.copy(t);
      else settled = false;
    }

    const resized = aspect !== this.aspect;
    if (resized) {
      this.aspect = aspect;
    }
    const goal = frameRoom(
      this.plan.width,
      this.plan.depth,
      aspect,
      this.canRotate ? [-YAW_LIMIT, 0, YAW_LIMIT] : [0],
    );
    const cam = this.camera;
    cam.distance.t = goal.distance;
    [cam.x.t, cam.y.t, cam.z.t] = goal.target;
    const snapCamera = snap || resized;
    track(cam.distance.step(dt, snapCamera));
    track(cam.x.step(dt, snapCamera));
    track(cam.y.step(dt, snapCamera));
    track(cam.z.step(dt, snapCamera));
    track(cam.yaw.step(dt, snap, 14));

    if (settled && this.tail > 0) {
      this.tail--;
      return false;
    }
    return settled;
  }

  apply(camera: PerspectiveCamera) {
    const w = this.width.x;
    const d = this.depth.x;
    const t = WALL_THICKNESS;
    const H = WALL_HEIGHT;
    const back = -d / 2;
    const room = this.room;

    room.floor?.scale.set(w, 0.3, d);
    room.floor?.position.set(0, -0.15, 0);
    room.rug?.scale.set(this.rug.width.x, 0.004, this.rug.depth.x);
    room.rug?.position.set(0, 0.001, this.rug.z.x);
    room.backWall?.scale.set(w + t, H, t);
    room.backWall?.position.set(-t / 2, H / 2, back - t / 2);
    room.leftWall?.scale.set(t, H, d);
    room.leftWall?.position.set(-w / 2 - t / 2, H / 2, 0);
    room.backSkirting?.scale.set(w, 0.12, 0.025);
    room.backSkirting?.position.set(0, 0.06, back + 0.0125);
    room.leftSkirting?.scale.set(0.025, 0.12, d);
    room.leftSkirting?.position.set(-w / 2 + 0.0125, 0.06, 0);
    room.window?.position.set(-w / 2, 1.55, 0);
    room.banner?.position.set(0, 0, back);
    const lampX = Math.max(2.2, w / 4);
    const lampZ = Math.max(1.7, d / 4);
    const lampLights = this.lights.lamps;
    for (let i = 0; i < LAMP_COUNT; i++) {
      const onBackWall = i < 2;
      const side = i % 2 === 0 ? -1 : 1;
      const x = onBackWall ? side * lampX : -w / 2;
      const z = onBackWall ? back : side * lampZ;
      this.lampNodes[i]?.position.set(x, LAMP_HEIGHT, z);
      // Set out from the wall so the pool spreads softly instead of clipping to a hot spot.
      const out = 0.75;
      lampLights[i]?.position.set(onBackWall ? x : x + out, LAMP_HEIGHT + 0.1, onBackWall ? z + out : z);
    }
    room.fairyLights?.position.set(0, 0, back + 0.06);
    room.balloonsLeft?.position.set(-w / 2 + 0.65, 0, back + 0.65);
    room.balloonsRight?.position.set(w / 2 - 0.65, 0, back + 0.65);
    room.screen?.position.set(w / 2 - 1.05, 0, back + 1.4);
    room.sideTable?.position.set(0, 0, back + 0.7);
    room.sideTableBody?.scale.set(this.tableLength.x, 1, 1);
    const cloth = room.buffetCloth;
    if (cloth) {
      const s = this.vis.buffetCloth.x;
      cloth.visible = s > 0.002;
      cloth.scale.set(1, Math.max(MIN_SCALE, s), 1);
    }

    setVisibleScale(room.sideTable, this.vis.sideTable.x);
    setVisibleScale(room.fairyLights, this.vis.fairy.x);
    setVisibleScale(room.balloonsLeft, this.vis.balloons.x);
    setVisibleScale(room.balloonsRight, this.vis.balloons.x);
    setVisibleScale(room.screen, this.vis.screen.x);

    if (this.vis.fairy.x > 0.002) {
      const span = w - 0.5;
      const scallops = Math.max(3, Math.round(span / 1.6));
      this.bulbNodes.forEach((bulb, i) => {
        if (!bulb) return;
        const u = i / (FAIRY_BULBS - 1);
        const local = (u * scallops) % 1;
        bulb.position.set(-span / 2 + u * span, 2.9 - 0.16 * Math.sin(Math.PI * local), 0);
      });
    }

    this.trays.forEach((tray, i) => {
      const node = this.trayNodes[i];
      if (!node) return;
      node.position.x = tray.x.x;
      setVisibleScale(node, tray.scale.x);
    });
    this.sideBoxes.forEach((box, i) => {
      const node = this.sideBoxNodes[i];
      if (!node) return;
      const { column, row } = SIDE_BOX_ORDER[i % SIDE_BOX_SLOTS];
      const layer = Math.floor(i / SIDE_BOX_SLOTS);
      node.position.set(
        (column - (SIDE_BOX_COLUMNS - 1) / 2) * BOX_COLUMN_SPACING,
        SIDE_TABLE_TOP + layer * BOX_LAYER,
        (row - (SIDE_BOX_ROWS - 1) / 2) * BOX_ROW_SPACING,
      );
      setScale(node, box.x);
    });

    this.slots.forEach((slot, i) => {
      const nodes = this.slotNodes[i];
      const group = nodes.parts.group;
      if (!group) return;
      group.position.set(slot.x.x, 0, slot.z.x);
      setScale(group, slot.scale.x);
      nodes.cloth?.color.copy(this.cloth);
      setScale(nodes.parts.flowers, this.vis.flowers.x);
      setScale(nodes.parts.runner, this.vis.runner.x);
      setScale(nodes.parts.balloons, this.vis.tableBalloons.x);
      let y = TABLE_TOP;
      slot.boxes.forEach((spring, k) => {
        const node = nodes.boxes[k];
        if (!node) return;
        const s = this.vis.box.x * spring.x;
        // Moves aside for a centrepiece or balloons, across the runner rather than along it.
        node.position.set(0, y, this.boxShift.x * 0.42);
        setScale(node, s);
        y += BOX_LAYER * Math.max(0, s);
      });
      for (let k = 0; k < SEATS_PER_TABLE; k++) setScale(nodes.plates[k], this.vis.plates.x);
    });

    const e = this.evening.x;
    const { ambient, sun, lamps } = this.lights;
    if (ambient) {
      ambient.intensity = lerp(2.6, 0.85, e);
      ambient.color.lerpColors(DAY.ambient, EVENING.ambient, e);
    }
    if (sun) {
      sun.intensity = lerp(1.7, 0.3, e);
      sun.color.lerpColors(DAY.sun, EVENING.sun, e);
      sun.position.set(-w / 2 - 6, lerp(4.5, 3, e), lerp(1, 2, e));
    }
    const lampIntensity = lerp(0, 2.4, e);
    const lampReach = Math.max(8, Math.min(w, d) * 1.05);
    for (const lamp of lamps) {
      if (!lamp) continue;
      lamp.intensity = lampIntensity;
      lamp.distance = lampReach;
    }
    const { glass, fairy, shade } = this.glow;
    if (glass) {
      glass.color.lerpColors(DAY.glass, EVENING.glass, e);
      glass.emissive.lerpColors(DAY.glass, EVENING.glass, e);
      glass.emissiveIntensity = lerp(0.85, 0.7, e);
    }
    if (fairy) fairy.emissiveIntensity = lerp(0.35, 1.3, e);
    if (shade) shade.emissiveIntensity = lerp(0, 1.15, e);

    const cam = this.camera;
    const yaw = AZIMUTH + cam.yaw.x;
    const distance = cam.distance.x;
    camera.position.set(
      cam.x.x + Math.sin(yaw) * Math.cos(ELEVATION) * distance,
      cam.y.x + Math.sin(ELEVATION) * distance,
      cam.z.x + Math.cos(yaw) * Math.cos(ELEVATION) * distance,
    );
    camera.lookAt(cam.x.x, cam.y.x, cam.z.x);
    if (camera.far < distance * 3) {
      camera.far = distance * 3;
      camera.updateProjectionMatrix();
    }
  }
}
