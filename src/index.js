import { useState, useRef, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Cylinder, Torus, Html } from "@react-three/drei";
import { Physics, useSphere, useCylinder } from "@react-three/cannon";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Color, InstancedMesh } from "three";

import "./styles.css";

// const inhaleDuration = 5; // Seconds
// const holdDuration = 5; // Hold after inhale
// const exhaleDuration = 7; // Seconds
// const pauseDuration = 5; // Pause after exhale
const totalBreathTime = 10 * 60; // 5 minutes

// function generateRandomPointsWithinCircle(radius, numPoints, yPosition) {
//   const points = [];

//   for (let i = 0; i < numPoints; i++) {
//     const randomRadius = Math.random() * radius; // Random radius between 0 and 1.5
//     const angle = Math.random() * 2 * Math.PI; // Random angle around the circle
//     const x = randomRadius * Math.cos(angle); // x position based on random radius
//     const z = randomRadius * Math.sin(angle); // z position based on random radius
//     points.push([x, yPosition, z]); // Keep y constant for height
//   }

//   return points;
// }

function capitalizeFirstLetter(str) {
  if (!str) return ""; // Handle empty strings
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateSpiralPoints(radius, numPoints, yPosition) {
  const points = [];
  const turns = 2; // Number of spiral turns

  for (let i = 3; i < numPoints; i++) {
    const angle = (i / numPoints) * (turns * Math.PI * 2); // Gradually increasing angle
    const r = radius * (i / numPoints); // Gradually increasing radius
    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    const y = yPosition; // Keep y constant for a flat spiral

    points.push([x, y, z]);
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

  // Set the cylinder physics properties for solid walls (excluding top/bottom)
  const [ref] = useCylinder(() => ({
    args: [1, 1, 5, 32, 1, true], // args: [radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded]
    position: [0, 0, 0],
    mass: 0,
    type: "Static",
  }));

  return (
    <Cylinder ref={ref} args={[1, 1, 5, 32, true]} position={[0, 0, 0]}>
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

function BreathingText({ breathPhase, isMobile, breathingConfig }) {
  const xLookUp = {
    inhale: -2,
    hold: 2,
    exhale: -2,
    pause: 2,
  };

  const { inhaleDuration, exhaleDuration, holdDuration, pauseDuration } =
    breathingConfig;

  const showTextLookup = {
    inhale: inhaleDuration > 0,
    hold: holdDuration > 0,
    exhale: exhaleDuration > 0,
    pause: pauseDuration > 0,
  };

  return (
    showTextLookup[breathPhase] && (
      <Html position={[xLookUp[breathPhase], 0, 0]} center>
        <div
          style={{
            fontSize: isMobile ? "1.2rem" : "2rem",
            fontWeight: isMobile ? "300" : "bold",
            color: "white",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            textAlign: "center",
          }}
        >
          {capitalizeFirstLetter(breathPhase)}
        </div>
      </Html>
    )
  );
}

function BreathingModeText({ breathMode, isMobile }) {
  return (
    <Html position={[-0.1, 5.8, 0]} center>
      <div
        style={{
          fontSize: isMobile ? "1rem" : "1.5rem",
          fontWeight: isMobile ? "300" : "bold",
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          width: "300px",
          textAlign: "center",
        }}
      >
        {capitalizeFirstLetter(breathMode)}
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
    () => generateSpiralPoints(radius, number, yPosition),
    [number, radius]
  );

  const [ref] = useSphere(
    (index) => ({
      args: [0.07],
      mass: 0.1,
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

function Rings({ breathPhase, progress, breathingConfig }) {
  const breathInPhase = breathPhase === "inhale";
  const breathOutPhase = breathPhase === "exhale";
  const breathingIn = breathPhase === "hold" || breathPhase === "inhale";

  const { inhaleDuration, exhaleDuration } = breathingConfig;

  const numRings = breathingIn ? inhaleDuration + 2 : exhaleDuration + 2; // Total rings (2 extra neutral rings)
  const glowingRings = breathingIn ? inhaleDuration : exhaleDuration; // Inner rings that glow

  const isHold = breathPhase === "hold";
  const isPause = breathPhase === "pause";

  // Determine if the rings should glow for the hold and pause phase
  const glowAllRings = isHold || isPause;

  return (
    <>
      {[...Array(numRings)].map((_, i) => {
        const ringProgress = i / (numRings - 1);
        const isActive =
          glowAllRings || // If it's hold or pause, make all rings glow
          (i > 0 &&
            i < numRings - 1 && // Exclude top and bottom rings
            (breathingIn
              ? progress >= ringProgress
              : progress <= ringProgress));

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
            {breathInPhase && i > 0 && i < numRings - 1 && (
              <InstancedSpheres
                number={10}
                radius={0.9}
                yPosition={-2.5 + (i * 5) / (numRings - 1)}
                breatheIn={breathingIn}
              />
            )}
            {breathOutPhase && i > 0 && i < numRings - 1 && (
              <InstancedSpheres
                number={10}
                radius={0.9}
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

function Timer({ remainingTime, isMobile, totalDuration }) {
  return (
    <Html position={[isMobile ? -0.1 : -0.2, 4.8, 0]} center>
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
          width: isMobile ? "120px" : "150px",
        }}
      >
        <svg width="60" height="60" viewBox="0 0 100 100">
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
            strokeDashoffset={(remainingTime / totalDuration) * 282.7}
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

function Breathingrings({
  isRunning,
  setIsRunning,
  breathingConfig,
  isMobile,
  menuOpen,
}) {
  const [breathPhase, setBreathPhase] = useState("inhale"); // inhale, hold, exhale, pause
  const [progress, setProgress] = useState(0);

  const {
    inhaleDuration,
    exhaleDuration,
    holdDuration,
    pauseDuration,
    breathMode,
    totalDuration,
  } = breathingConfig;

  const [remainingTime, setRemainingTime] = useState(totalDuration);
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    if (!isRunning || remainingTime <= 0) return;

    elapsedRef.current += delta;
    setRemainingTime((prev) => Math.max(prev - delta, 0));

    let phaseDuration =
      breathPhase === "inhale"
        ? inhaleDuration
        : breathPhase === "hold"
        ? holdDuration
        : breathPhase === "exhale"
        ? exhaleDuration
        : pauseDuration;

    let normalizedTime = elapsedRef.current / phaseDuration;

    if (normalizedTime >= 1) {
      elapsedRef.current = 0;
      setBreathPhase((prev) => {
        if (prev === "inhale") return "hold";
        if (prev === "hold") return "exhale";
        if (prev === "exhale") return "pause";
        return "inhale";
      });
    }

    setProgress(
      breathPhase === "inhale" || breathPhase === "hold"
        ? normalizedTime
        : 1 - normalizedTime
    );
  });

  useEffect(() => {
    if (remainingTime === 0) {
      setIsRunning(false);
    }
  }, [remainingTime, setIsRunning]);

  return (
    <Physics gravity={[0, breathPhase === "exhale" ? -0.2 : 0.3, 0]}>
      {isRunning && (
        <BreathingTube
          breathingIn={breathPhase !== "exhale" && breathPhase !== "pause"}
        />
      )}
      {isRunning && (
        <Rings
          breathPhase={breathPhase}
          progress={progress}
          breathingConfig={breathingConfig}
        />
      )}
      {isRunning && (
        <Timer
          remainingTime={remainingTime}
          isMobile={isMobile}
          totalDuration={totalDuration}
        />
      )}
      {isRunning && (
        <BreathingText
          breathPhase={breathPhase}
          breathingConfig={breathingConfig}
          isMobile={isMobile}
        />
      )}
      {isRunning && (
        <BreathingModeText breathMode={breathMode} isMobile={isMobile} />
      )}

      {!isRunning && !menuOpen && (
        <Html position={[0, 0, 0]} center>
          <button
            onClick={() => {
              setRemainingTime(totalDuration);
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
              width: "200px",
            }}
          >
            {`Start ${breathMode}`}
          </button>
        </Html>
      )}
    </Physics>
  );
}

function App() {
  const [isRunning, setIsRunning] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(false); // Mobile detection state

  const [breathingConfig, setBreathingConfig] = useState({
    inhaleDuration: 4,
    exhaleDuration: 6,
    holdDuration: 2,
    pauseDuration: 2,
    breathMode: "Breathing",
    totalDuration: 5 * 60,
  });

  const presets = {
    feelGood: {
      inhaleDuration: 4,
      exhaleDuration: 6,
      holdDuration: 4,
      pauseDuration: 2,
      breathMode: "Feel Good Mode",
      totalDuration: 10 * 60,
    },
    Relax: {
      inhaleDuration: 4,
      exhaleDuration: 8,
      holdDuration: 6,
      pauseDuration: 4,
      breathMode: "Relax Mode",
      totalDuration: 10 * 60,
    },
    Focus: {
      inhaleDuration: 2,
      exhaleDuration: 6,
      holdDuration: 4,
      pauseDuration: 0,
      breathMode: "Focus Mode",
      totalDuration: 5 * 60,
    },
    Energize: {
      inhaleDuration: 3,
      exhaleDuration: 6,
      holdDuration: 1,
      pauseDuration: 0,
      breathMode: "Energise Mode",
      totalDuration: 5 * 60,
    },
    ReleaseNeg: {
      inhaleDuration: 4,
      exhaleDuration: 8,
      holdDuration: 7,
      pauseDuration: 0,
      breathMode: "Release Negativity Mode",
      totalDuration: 10 * 60,
    },
    blissMode: {
      inhaleDuration: 5,
      exhaleDuration: 10,
      holdDuration: 5,
      pauseDuration: 0,
      breathMode: "Bliss Mode",
      totalDuration: 10 * 60,
    },
    boxBreathing: {
      inhaleDuration: 6,
      exhaleDuration: 6,
      holdDuration: 6,
      pauseDuration: 6,
      breathMode: "Steady Mind Mode",
      totalDuration: 10 * 60,
    },
  };

  function loadPreset(mode) {
    setBreathingConfig(presets[mode]);
    setMenuOpen(false); // Close menu after selection
  }

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

  return (
    <>
      <Canvas camera={{ position: [0, 0, 8] }}>
        <OrbitControls autoRotate={false} enablePan={false} />
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

        {menuOpen && (
          <Html position={[isMobile ? -0.5 : 8, 4, 0]}>
            <div className="settings-panel">
              <h3>Load a Breathing Pattern</h3>
              <button
                onClick={() => {
                  loadPreset("Relax");
                }}
              >
                Relax Mode
              </button>
              <button
                onClick={() => {
                  loadPreset("feelGood");
                }}
              >
                Feel Good Mode
              </button>
              <button onClick={() => loadPreset("Focus")}>Focus Mode</button>
              <button onClick={() => loadPreset("Energize")}>
                Energize Mode
              </button>
              <button onClick={() => loadPreset("ReleaseNeg")}>
                Release Negativity
              </button>
              <button onClick={() => loadPreset("boxBreathing")}>
                Steady Mind
              </button>
              <button onClick={() => loadPreset("blissMode")}>
                Bliss Mode
              </button>
              <button onClick={() => setMenuOpen(false)}>Close</button>
            </div>
          </Html>
        )}

        {/* R3F UI (Alternative: Placing Menu Inside Canvas) */}
        {!isRunning && (
          <Html position={[isMobile ? 0 : 8, 5, 0]}>
            <button onClick={() => setMenuOpen(true)}>☰</button>
          </Html>
        )}

        <Breathingrings
          isRunning={isRunning}
          setIsRunning={setIsRunning}
          breathingConfig={breathingConfig}
          isMobile={isMobile}
          menuOpen={menuOpen}
        />

        <EffectComposer>
          <Bloom
            mipmapBlur={false}
            luminanceThreshold={1}
            luminanceSmoothing={0.5}
            intensity={1.2}
          />
        </EffectComposer>
      </Canvas>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
