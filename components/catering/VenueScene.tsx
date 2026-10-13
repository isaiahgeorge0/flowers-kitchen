"use client";

import { ContactShadows, Instance, Instances, Merged } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useLayoutEffect, useMemo, useState, type ComponentType, type Ref } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  SRGBColorSpace,
  type Color,
  type Object3D,
  type PerspectiveCamera,
} from "three";
import type { CateringEvent } from "@/lib/catering";
import {
  CAMERA_FOV,
  FAIRY_BULBS,
  LAMP_COUNT,
  LAMP_LIGHT,
  SIDE_TABLE_TOP,
  TABLE_TOP,
  VenueAnimator,
  YAW_LIMIT,
} from "./venueAnimator";
import {
  COLOURS,
  MAX_BUFFET_TRAYS,
  MAX_SIDE_BOXES,
  MAX_TABLE_BOXES,
  MAX_TABLES,
  SEATS_PER_TABLE,
  planRoom,
  type RoomPlan,
} from "./venueLayout";
import {
  LAMP_SHADE_AT,
  balloonClusterGeometry,
  buffetClothGeometry,
  centrepieceGeometry,
  chafingDishGeometry,
  chairGeometry,
  clothGeometry,
  foodBoxGeometry,
  lampFittingGeometry,
  plateGeometry,
  runnerGeometry,
  screenGeometry,
  tableBalloonsGeometry,
  windowFrameGeometry,
} from "./venueModels";

const MARK_SRC = "/brand/flowers-kitchen_mark_reverse-green.svg";
const SIDE_TABLE_DEPTH = 0.8;

const SEATS = Array.from({ length: SEATS_PER_TABLE }, (_, k) => {
  const angle = ((k + 0.5) / SEATS_PER_TABLE) * Math.PI * 2;
  return {
    angle,
    chair: [Math.sin(angle) * 1.2, 0, Math.cos(angle) * 1.2] as const,
    plate: [Math.sin(angle) * 0.6, TABLE_TOP + 0.007, Math.cos(angle) * 0.6] as const,
  };
});
const TABLE_BOXES = Array.from({ length: MAX_TABLE_BOXES }, (_, k) => k);

const clay = (color: string, roughness = 0.92) =>
  new MeshStandardMaterial({ color, roughness, metalness: 0 });

type Bind<T = Object3D> = (obj: T | null) => void;
type InstanceComponent = ComponentType<{
  ref?: Ref<Object3D & { color: Color }>;
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
}>;
type TableParts = Record<
  "Cloth" | "Chair" | "Plate" | "TableBox" | "Centrepiece" | "Runner" | "Balloons",
  InstanceComponent
>;

function useDisposable<T extends { dispose: () => void }>(items: T[]) {
  useEffect(() => () => items.forEach((item) => item.dispose()), [items]);
}

function paintBanner(texture: CanvasTexture, mark?: HTMLImageElement) {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.fillStyle = COLOURS.mountain;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = COLOURS.allspice;
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, width - 44, height - 44);
  if (mark) {
    const size = width * 0.62;
    ctx.drawImage(mark, (width - size) / 2, height * 0.44 - size / 2, size, size);
  }
  texture.needsUpdate = true;
}

function useBannerTexture(invalidate: () => void) {
  const [texture] = useState(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 640;
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    paintBanner(tex);
    return tex;
  });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      paintBanner(texture, img);
      invalidate();
    };
    img.src = MARK_SRC;
    return () => {
      img.onload = null;
    };
  }, [texture, invalidate]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

const TableSlot = ({ i, m, anim }: { i: number; m: TableParts; anim: VenueAnimator }) => (
  <group ref={(el) => anim.bindSlot(i, "group", el)}>
    <m.Cloth ref={(el) => anim.bindCloth(i, el)} />
    {SEATS.map((seat, k) => (
      <m.Chair key={k} position={seat.chair} rotation={[0, seat.angle, 0]} />
    ))}
    {SEATS.map((seat, k) => (
      <m.Plate key={k} ref={(el) => anim.bindPlate(i, k, el)} position={seat.plate} />
    ))}
    <m.Runner ref={(el) => anim.bindSlot(i, "runner", el)} position={[0, TABLE_TOP, 0]} />
    <m.Centrepiece ref={(el) => anim.bindSlot(i, "flowers", el)} position={[0, TABLE_TOP, 0]} />
    <m.Balloons ref={(el) => anim.bindSlot(i, "balloons", el)} position={[0, TABLE_TOP, 0]} />
    {TABLE_BOXES.map((k) => (
      <m.TableBox
        key={k}
        ref={(el) => anim.bindTableBox(i, k, el)}
        position={[0, TABLE_TOP, 0]}
        rotation={[0, 0.35 + (k % 2) * 0.05, 0]}
      />
    ))}
  </group>
);

// Every slot stays mounted so tables can grow in and shrink away; this subtree renders once.
const Furniture = memo(function Furniture({ anim }: { anim: VenueAnimator }) {
  const meshes = useMemo(() => {
    const vertex = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
    return {
      Cloth: new Mesh(clothGeometry(TABLE_TOP), clay("#FFFFFF", 1)),
      Chair: new Mesh(chairGeometry(), vertex),
      Plate: new Mesh(plateGeometry(), vertex),
      TableBox: new Mesh(foodBoxGeometry(), vertex),
      Centrepiece: new Mesh(centrepieceGeometry(), vertex),
      Runner: new Mesh(runnerGeometry(), vertex),
      Balloons: new Mesh(tableBalloonsGeometry(), vertex),
    };
  }, []);
  const disposables = useMemo(
    () => Object.values(meshes).flatMap((mesh) => [mesh.geometry, mesh.material as MeshStandardMaterial]),
    [meshes],
  );
  useDisposable(disposables);

  return (
    <Merged meshes={meshes} limit={MAX_TABLES * SEATS_PER_TABLE}>
      {(parts) => {
        // drei's types omit `ref`, but each merged component forwards it to its instance.
        const m = parts as unknown as TableParts;
        return Array.from({ length: MAX_TABLES }, (_, i) => <TableSlot key={i} i={i} m={m} anim={anim} />);
      }}
    </Merged>
  );
});

const RoomShell = memo(function RoomShell({ anim }: { anim: VenueAnimator }) {
  const invalidate = useThree((s) => s.invalidate);
  const banner = useBannerTexture(invalidate);
  const assets = useMemo(
    () => ({
      unit: new BoxGeometry(1, 1, 1),
      bulb: new SphereGeometry(0.055, 8, 6),
      foodBox: foodBoxGeometry(),
      shade: new CylinderGeometry(0.075, 0.115, 0.17, 20),
      windowFrame: windowFrameGeometry(1.3, 2.1),
      lampFitting: lampFittingGeometry(),
      chafing: chafingDishGeometry(),
      buffetCloth: buffetClothGeometry(SIDE_TABLE_DEPTH),
      balloons: balloonClusterGeometry(),
      screen: screenGeometry(),
      vertex: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
      fabric: new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
      floor: clay(COLOURS.floor, 0.95),
      rug: clay(COLOURS.rug, 1),
      // Paper-toned so the walls read as cream under the soft ambient light.
      wall: clay(COLOURS.paper, 0.97),
      skirting: clay(COLOURS.muted),
      pimento: clay(COLOURS.pimento, 0.8),
      mountain: clay(COLOURS.mountain, 0.95),
      paper: clay(COLOURS.paper),
      glass: new MeshStandardMaterial({ color: COLOURS.paper, emissive: COLOURS.paper, roughness: 1 }),
      fairy: new MeshStandardMaterial({ color: COLOURS.glow, emissive: COLOURS.glow, roughness: 0.6 }),
      // Off by day (no emissive); the animator brings the glow up in the evening.
      shadeGlow: new MeshStandardMaterial({ color: COLOURS.cream, emissive: LAMP_LIGHT, emissiveIntensity: 0, roughness: 0.9 }),
    }),
    [],
  );
  const disposables = useMemo(() => Object.values(assets), [assets]);
  useDisposable(disposables);

  useLayoutEffect(() => {
    anim.bindGlow("glass", assets.glass);
    anim.bindGlow("fairy", assets.fairy);
    anim.bindGlow("shade", assets.shadeGlow);
  }, [anim, assets]);

  const bindRoom = (part: Parameters<VenueAnimator["bindRoom"]>[0]): Bind => (el) => anim.bindRoom(part, el);

  return (
    <>
      <mesh ref={bindRoom("floor")} geometry={assets.unit} material={assets.floor} />
      <mesh ref={bindRoom("rug")} geometry={assets.unit} material={assets.rug} />
      <mesh ref={bindRoom("backWall")} geometry={assets.unit} material={assets.wall} />
      <mesh ref={bindRoom("leftWall")} geometry={assets.unit} material={assets.wall} />
      <mesh ref={bindRoom("backSkirting")} geometry={assets.unit} material={assets.skirting} />
      <mesh ref={bindRoom("leftSkirting")} geometry={assets.unit} material={assets.skirting} />

      <group ref={bindRoom("window")}>
        <mesh geometry={assets.windowFrame} material={assets.vertex} />
        <mesh position-x={0.004} scale={[0.01, 2.1, 1.3]} geometry={assets.unit} material={assets.glass} />
      </group>

      <group ref={bindRoom("banner")}>
        <mesh position={[0, 2.72, 0.06]} rotation-z={Math.PI / 2} material={assets.pimento}>
          <cylinderGeometry args={[0.02, 0.02, 1.42, 8]} />
        </mesh>
        <mesh position={[0, 1.95, 0.03]}>
          <planeGeometry args={[1.2, 1.5]} />
          <meshStandardMaterial map={banner} roughness={1} metalness={0} />
        </mesh>
      </group>

      {Array.from({ length: LAMP_COUNT }, (_, i) => (
        // The first two hang on the back wall (facing +z); the others on the window wall (facing +x).
        <group key={i} ref={(el) => anim.bindLamp(i, el)} rotation-y={i < 2 ? 0 : Math.PI / 2} scale={1.5}>
          <mesh geometry={assets.lampFitting} material={assets.vertex} />
          <mesh position={LAMP_SHADE_AT} geometry={assets.shade} material={assets.shadeGlow} />
        </group>
      ))}

      <group ref={bindRoom("fairyLights")}>
        <Instances limit={FAIRY_BULBS} geometry={assets.bulb} material={assets.fairy}>
          {Array.from({ length: FAIRY_BULBS }, (_, i) => (
            <Instance key={i} ref={(el: Object3D | null) => anim.bindBulb(i, el)} />
          ))}
        </Instances>
      </group>

      <group ref={bindRoom("sideTable")}>
        <group ref={bindRoom("sideTableBody")}>
          <mesh position-y={0.37} scale={[1, 0.74, 0.76]} geometry={assets.unit} material={assets.mountain} />
          <mesh
            position-y={SIDE_TABLE_TOP - 0.015}
            scale={[1.04, 0.03, SIDE_TABLE_DEPTH]}
            geometry={assets.unit}
            material={assets.paper}
          />
          <mesh
            ref={bindRoom("buffetCloth")}
            position-y={SIDE_TABLE_TOP}
            geometry={assets.buffetCloth}
            material={assets.fabric}
          />
        </group>
        {Array.from({ length: MAX_BUFFET_TRAYS }, (_, i) => (
          <mesh
            key={i}
            ref={(el) => anim.bindTray(i, el)}
            position-y={SIDE_TABLE_TOP + 0.006}
            geometry={assets.chafing}
            material={assets.vertex}
          />
        ))}
        <Instances limit={MAX_SIDE_BOXES} geometry={assets.foodBox} material={assets.vertex}>
          {Array.from({ length: MAX_SIDE_BOXES }, (_, i) => (
            <Instance key={i} ref={(el: Object3D | null) => anim.bindSideBox(i, el)} />
          ))}
        </Instances>
      </group>

      <mesh ref={bindRoom("balloonsLeft")} geometry={assets.balloons} material={assets.vertex} />
      <mesh
        ref={bindRoom("balloonsRight")}
        rotation-y={Math.PI * 0.6}
        geometry={assets.balloons}
        material={assets.vertex}
      />
      <mesh ref={bindRoom("screen")} rotation-y={-0.6} geometry={assets.screen} material={assets.vertex} />
    </>
  );
});

function DragRotate({ anim }: { anim: VenueAnimator }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const el = gl.domElement;
    let drag: { id: number; x: number; yaw: number } | null = null;

    const down = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, yaw: anim.yaw };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = (e.clientX - drag.x) / Math.max(1, el.clientWidth / 2);
      anim.setYaw(drag.yaw - dx * YAW_LIMIT);
      invalidate();
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl, anim, invalidate]);

  return null;
}

type RoomProps = { plan: RoomPlan; active: boolean; reducedMotion: boolean; canRotate: boolean };

// Memoised so parent re-renders with an unchanged plan don't re-apply props and redraw.
const Room = memo(function Room({ plan, active, reducedMotion, canRotate }: RoomProps) {
  const [anim] = useState(() => new VenueAnimator(plan));
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    anim.retarget(plan, reducedMotion);
    invalidate();
  }, [anim, plan, reducedMotion, invalidate]);

  useLayoutEffect(() => {
    anim.setCanRotate(canRotate);
    invalidate();
  }, [anim, canRotate, invalidate]);

  useEffect(() => {
    if (!active) return;
    anim.kick();
    invalidate();
  }, [anim, active, invalidate]);

  // Runs before drei's instance updates so they read this frame's transforms.
  useFrame((state, delta) => {
    const settled = anim.step(Math.min(delta, 1 / 20), reducedMotion, state.size.width / state.size.height);
    anim.apply(state.camera as PerspectiveCamera);
    state.scene.updateMatrixWorld();
    if (!settled) state.invalidate();
  }, -1);

  return (
    <>
      <color attach="background" args={[COLOURS.mountain]} />
      <ambientLight ref={(light) => anim.bindAmbient(light)} />
      <directionalLight ref={(light) => anim.bindSun(light)} />
      {/* A fixed number of lights, always mounted, so switching day and evening never recompiles shaders. */}
      {Array.from({ length: LAMP_COUNT }, (_, i) => (
        <pointLight key={i} ref={(light) => anim.bindLampLight(i, light)} color={LAMP_LIGHT} decay={1.45} intensity={0} />
      ))}
      <RoomShell anim={anim} />
      <Furniture anim={anim} />
      <ContactShadows
        position={[0, 0.004, 0]}
        scale={[plan.width + 1, plan.depth + 1]}
        resolution={512}
        blur={2.2}
        far={0.9}
        opacity={0.55}
        color={COLOURS.pimento}
      />
      {canRotate && <DragRotate anim={anim} />}
    </>
  );
});

type SceneProps = {
  event: CateringEvent;
  active: boolean;
  reducedMotion: boolean;
  canRotate: boolean;
  onReady: () => void;
  onContextLost: () => void;
};

export default function VenueScene({ event, active, reducedMotion, canRotate, onReady, onContextLost }: SceneProps) {
  // Keyed on the plan's contents so typing a name or postcode doesn't wake the renderer.
  const signature = JSON.stringify(planRoom(event));
  const plan = useMemo(() => JSON.parse(signature) as RoomPlan, [signature]);

  return (
    <Canvas
      aria-hidden="true"
      frameloop={active ? "demand" : "never"}
      dpr={[1, 1.75]}
      flat
      camera={{ fov: CAMERA_FOV, near: 0.5, far: 200, position: [12, 10, 14] }}
      style={{ touchAction: "pan-y" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onContextLost();
        });
        requestAnimationFrame(onReady);
      }}
    >
      <Room plan={plan} active={active} reducedMotion={reducedMotion} canRotate={canRotate} />
    </Canvas>
  );
}
