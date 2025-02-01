import { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Cylinder, Torus } from "@react-three/drei";
import { Physics } from "@react-three/cannon";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import "./styles.css";

const numRings = 10; // Number of rings along the tube
const inhaleDuration = 4; // In seconds
const exhaleDuration = 8; // Out seconds
const totalDuration = inhaleDuration + exhaleDuration;

function Breathingrings() {
  const [breathingIn, setBreathingIn] = useState(true);
  const [progress, setProgress] = useState(0);
  const elapsedRef = useRef(0);
  const tubeMaterial = useRef();

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

    // Glow effect: Intensity fluctuates with breathing
    const t = (1 + Math.sin(state.clock.elapsedTime * 2)) / 2;
    const glowColor = breathingIn ? [0, 0, 30 + t * 50] : [10 + t * 50, 0, 0];
    tubeMaterial.current.emissive.setRGB(...glowColor);
  });

  return (
    <>
      {/* Glowing Tube */}
      <Cylinder args={[1, 1, 5, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial
          ref={tubeMaterial}
          emissiveIntensity={1}
          emissive="blue"
          transparent
          opacity={0.5}
          toneMapped={false}
        />
      </Cylinder>

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
      factor={2}
      saturation={9}
      speed={1}
    />
    <ambientLight intensity={2} />
    <spotLight position={[10, 15, 10]} angle={0.3} />
    <pointLight position={[10, 10, 10]} />
    <Physics>
      <Breathingrings />
    </Physics>

    <EffectComposer>
      <Bloom
        mipmapBlur={false}
        luminanceThreshold={1}
        luminanceSmoothing={0.5}
        intensity={1.2}
      />
    </EffectComposer>
  </Canvas>
);
