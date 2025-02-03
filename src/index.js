import { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Cylinder, Torus, Html } from "@react-three/drei";
import { Physics } from "@react-three/cannon";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import "./styles.css";

const numRings = 10;
const inhaleDuration = 4; // Seconds
const exhaleDuration = 8;
const totalBreathTime = 5 * 60; // 5 minutes

function BreathingTube({ breathingIn }) {
  const tubeMaterial = useRef();

  useFrame((state) => {
    const t = (1 + Math.sin(state.clock.elapsedTime * 2)) / 2;
    const glowColor = breathingIn ? [0, 0, 30 + t * 50] : [10 + t * 50, 0, 0];
    tubeMaterial.current.emissive.setRGB(...glowColor);
  });

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

function BreathingText({ breathingIn }) {
  return (
    <Html position={[0, 4, 0]} center>
      <div
        style={{
          fontSize: "2rem",
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

function Rings({ breathingIn, progress }) {
  return (
    <>
      {[...Array(numRings)].map((_, i) => {
        const ringProgress = i / (numRings - 1);
        const isActive = breathingIn
          ? progress >= ringProgress
          : progress <= ringProgress;

        return (
          <Torus
            key={i}
            args={[1.1, 0.05, 16, 32]}
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

function Timer({ remainingTime }) {
  return (
    <Html position={[-0.2, 5, 0]} center>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontSize: "1.5rem",
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
            strokeWidth="5"
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
    <>
      {isRunning && <BreathingTube breathingIn={breathingIn} />}
      {isRunning && <Rings breathingIn={breathingIn} progress={progress} />}
      {isRunning && <BreathingText breathingIn={breathingIn} />}
      {isRunning && <Timer remainingTime={remainingTime} />}
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
    </>
  );
}

function App() {
  const [isRunning, setIsRunning] = useState(false);

  return (
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
        <Breathingrings isRunning={isRunning} setIsRunning={setIsRunning} />
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
}

createRoot(document.getElementById("root")).render(<App />);
