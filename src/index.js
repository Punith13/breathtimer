import { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Cylinder, Torus } from "@react-three/drei";
import { Physics, usePlane, useBox } from "@react-three/cannon";
import "./styles.css";

const numRings = 10; // Number of rings along the tube
const inhaleDuration = 4; // In seconds
const exhaleDuration = 8; // Out seconds
const totalDuration = inhaleDuration + exhaleDuration;

function Box() {
  const [ref, api] = useBox(() => ({ mass: 1, position: [0, 2, 0] }));
  return (
    <mesh
      onClick={() => {
        api.velocity.set(0, 2, 0);
      }}
      ref={ref}
      position={[0, 2, 0]}
    >
      <boxBufferGeometry attach="geometry" />
      <meshLambertMaterial attach="material" color="hotpink" />
    </mesh>
  );
}

function Plane() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
  }));
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <planeBufferGeometry attach="geometry" args={[100, 100]} />
      <meshLambertMaterial attach="material" color="lightblue" />
    </mesh>
  );
}

function Breathingrings() {
  const [breathingIn, setBreathingIn] = useState(true);
  const [progress, setProgress] = useState(0);
  const elapsedRef = useRef(0);

  useFrame((state, delta) => {
    elapsedRef.current += delta;

    // Normalize time between 0 and 1 based on inhale/exhale duration
    let phaseDuration = breathingIn ? inhaleDuration : exhaleDuration;
    let normalizedTime = elapsedRef.current / phaseDuration;

    if (normalizedTime >= 1) {
      elapsedRef.current = 0;
      setBreathingIn(!breathingIn);
    }

    setProgress(breathingIn ? normalizedTime : 1 - normalizedTime);
  });

  return (
    <>
      {/* Rings that light up sequentially */}
      {[...Array(numRings)].map((_, i) => {
        const ringProgress = i / (numRings - 1); // Normalize ring position
        const isActive = breathingIn
          ? progress >= ringProgress
          : progress <= ringProgress;

        return (
          <Torus
            key={i}
            args={[1.1, 0.05, 16, 32]} // Outer radius, tube radius
            position={[0, -2.5 + (i * 5) / (numRings - 1), 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <meshStandardMaterial
              color={isActive ? (breathingIn ? "blue" : "red") : "#fff5e4"}
            />
          </Torus>
        );
      })}
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <Canvas camera={{ position: [0, 0, 8] }}>
    <OrbitControls autoRotate autoRotateSpeed={0.05} />
    <Stars
      radius={150}
      depth={50}
      count={5000}
      factor={6}
      saturation={9}
      speed={1}
    />
    <ambientLight intensity={0.5} />
    <spotLight position={[10, 15, 10]} angle={0.3} />
    <pointLight position={[10, 10, 10]} />
    <Physics>
      <Cylinder args={[1, 1, 5, 16]} position={[0, 0, 0]}>
        <meshStandardMaterial transparent opacity={0.1} color="gold" />
      </Cylinder>
      <Breathingrings />
    </Physics>
  </Canvas>
);
