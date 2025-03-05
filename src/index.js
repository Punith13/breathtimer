import { useState, useRef, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Cylinder, Torus, Html } from "@react-three/drei";
import { Physics, useSphere, useCylinder } from "@react-three/cannon";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Color, InstancedMesh } from "three";

import "./styles.css";

const inhaleDuration = 4; // Seconds
const exhaleDuration = 8;
const totalBreathTime = 5 * 60; // 5 minutes

function generateRandomPointsWithinCircle(radius, numPoints, yPosition) {
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    const randomRadius = Math.random() * radius; // Random radius between 0 and 1.5
    const angle = Math.random() * 2 * Math.PI; // Random angle around the circle
    const x = randomRadius * Math.cos(angle); // x position based on random radius
    const z = randomRadius * Math.sin(angle); // z position based on random radius
    points.push([x, yPosition, z]); // Keep y constant for height
  }

  return points;
}

function BreathingTube({ breathingIn }) {
  const tubeMaterial = useRef();

  useFrame((state) => {
    const t = (1 + Math.sin(state.clock.elapsedTime * 2)) / 2;
    const glowColor = breathingIn ? [0, 0, 30 + t * 50] : [10 + t * 50, 0, 0];
    tubeMaterial.current.emissive.setRGB(...glowColor);
  });

  useCylinder(() => ({
    args: [1, 1, 0.1, 32], // Ensures solid collision at bottom
    position: [0, 0, 0],
    type: "Static",
  }));

  return (
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
  );
}

function BreathingText({ breathingIn, isMobile }) {
  return (
    <Html position={[isMobile ? 0.9 : 0, 3.5, 0]} center>
      <div
        style={{
          fontSize: isMobile ? "1.2rem" : "2rem",
          fontWeight: "bold",
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          padding: "10px 20px",
          width: "250px",
          borderRadius: "10px",
        }}
      >
        {breathingIn ? "Breathe In" : "Breathe Out"}
      </div>
    </Html>
  );
}

function InstancedSpheres({
  number = 100,
  radius = 1.5,
  yPosition,
  breatheIn,
}) {
  const positions = useMemo(
    () => generateRandomPointsWithinCircle(radius, number, yPosition),
    [number, radius]
  );

  const [ref] = useSphere(
    (index) => ({
      args: [0.07],
      mass: 0.000001,
      position: positions[index],
    }),
    useRef < InstancedMesh > null
  );
  const colors = useMemo(() => {
    const array = new Float32Array(number * 3);
    const color = new Color();
    for (let i = 0; i < number; i++)
      color
        .set(breatheIn ? "blue" : "red")
        .convertSRGBToLinear()
        .toArray(array, i * 3);
    return array;
  }, [number]);

  return (
    <instancedMesh
      ref={ref}
      castShadow
      receiveShadow
      args={[undefined, undefined, number]}
    >
      <sphereGeometry args={[0.07, 16, 16]}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </sphereGeometry>
      <meshPhongMaterial vertexColors />
    </instancedMesh>
  );
}

function Rings({ breathingIn, progress }) {
  const numRings = breathingIn ? 6 : 10; // Total rings (2 extra neutral rings)
  const glowingRings = breathingIn ? 4 : 8; // Inner rings that glow

  return (
    <>
      {[...Array(numRings)].map((_, i) => {
        const ringProgress = i / (numRings - 1);
        const isActive =
          i > 0 &&
          i < numRings - 1 && // Exclude top and bottom rings
          (breathingIn ? progress >= ringProgress : progress <= ringProgress);

        return (
          <>
            <Torus
              key={i}
              args={[1.1, 0.05, 16, 32]}
              position={[0, -2.5 + (i * 5) / (numRings - 1), 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <meshStandardMaterial
                color={
                  i > 0 && i < glowingRings + 1 // Only glow inner rings
                    ? isActive
                      ? breathingIn
                        ? "blue"
                        : "red"
                      : "#fff5e4"
                    : "#fff5e4" // Top and bottom rings stay neutral
                }
              />
            </Torus>
            {breathingIn && (
              <InstancedSpheres
                number={10}
                radius={1}
                yPosition={-2.5 + (i * 5) / (numRings - 1)}
                breatheIn={breathingIn}
              />
            )}
            {!breathingIn && (
              <InstancedSpheres
                number={10}
                radius={1}
                yPosition={-2.5 + (i * 5) / (numRings - 1)}
                breatheIn={breathingIn}
              />
            )}
          </>
        );
      })}
    </>
  );
}

function Timer({ remainingTime, isMobile }) {
  return (
    <Html position={[isMobile ? -0.1 : -0.2, 5, 0]} center>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontSize: isMobile ? "1rem" : "1.5rem",
          fontWeight: "bold",
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          padding: "10px 20px",
          borderRadius: "10px",
          width: "150px",
        }}
      >
        <svg width="80" height="80" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="gray"
            strokeWidth="5"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="white"
            strokeWidth={isMobile ? "7" : "5"}
            fill="none"
            strokeDasharray="282.7"
            strokeDashoffset={(remainingTime / totalBreathTime) * 282.7}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div>
          {Math.floor(remainingTime / 60)}:
          {(remainingTime % 60).toFixed(0).padStart(2, "0")}
        </div>
      </div>
    </Html>
  );
}

function Breathingrings({ isRunning, setIsRunning }) {
  const [breathingIn, setBreathingIn] = useState(true);
  const [progress, setProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(totalBreathTime);
  const elapsedRef = useRef(0);

  const [isMobile, setIsMobile] = useState(false); // Mobile detection state

  // Detect if the user is on a mobile screen
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        // Mobile threshold
        setIsMobile(true);
      } else {
        setIsMobile(false);
      }
    };
    handleResize(); // Initial check
    window.addEventListener("resize", handleResize); // Event listener for resizing
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useFrame((_, delta) => {
    if (!isRunning || remainingTime <= 0) return;

    elapsedRef.current += delta;
    setRemainingTime((prev) => Math.max(prev - delta, 0));

    let phaseDuration = breathingIn ? inhaleDuration : exhaleDuration;
    let normalizedTime = elapsedRef.current / phaseDuration;

    if (normalizedTime >= 1) {
      elapsedRef.current = 0;
      setBreathingIn(!breathingIn);
    }

    setProgress(breathingIn ? normalizedTime : 1 - normalizedTime);
  });

  useEffect(() => {
    if (remainingTime === 0) {
      setIsRunning(false);
    }
  }, [remainingTime, setIsRunning]);

  return (
    <Physics gravity={[0, breathingIn ? 0.3 : -0.1, 0]}>
      {isRunning && <BreathingTube breathingIn={breathingIn} />}
      {isRunning && <Rings breathingIn={breathingIn} progress={progress} />}
      {isRunning && (
        <BreathingText breathingIn={breathingIn} isMobile={isMobile} />
      )}
      {isRunning && <Timer remainingTime={remainingTime} isMobile={isMobile} />}
      {!isRunning && (
        <Html position={[0, 0, 0]} center>
          <button
            onClick={() => {
              setRemainingTime(totalBreathTime);
              setIsRunning(true);
            }}
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "white",
              backgroundColor: "blue",
              padding: "15px 30px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            Start Breathing
          </button>
        </Html>
      )}
    </Physics>
  );
}

function App() {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <Canvas camera={{ position: [0, 0, 8] }}>
      <OrbitControls autoRotate autoRotateSpeed={0.05} enablePan={false} />
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

      <Breathingrings isRunning={isRunning} setIsRunning={setIsRunning} />

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
}

createRoot(document.getElementById("root")).render(<App />);
