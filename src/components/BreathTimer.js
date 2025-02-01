import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Cylinder, Points, PointMaterial } from "@react-three/drei";

function BreathAnimation() {
  const particlesRef = useRef();
  const [breathingIn, setBreathingIn] = useState(true);
  const [progress, setProgress] = useState(0);

  useFrame((state, delta) => {
    setProgress((prev) => {
      let updated = breathingIn ? prev + delta * 0.5 : prev - delta * 0.5;
      if (updated >= 1) setBreathingIn(false);
      if (updated <= 0) setBreathingIn(true);
      return Math.max(0, Math.min(1, updated));
    });

    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <>
      <Cylinder args={[1, 1, 5, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial transparent opacity={0.3} color="blue" />
      </Cylinder>
      <Points ref={particlesRef}>
        <bufferGeometry />
        <PointMaterial color={breathingIn ? "blue" : "red"} size={0.1} />
      </Points>
    </>
  );
}

export default function BreathTimer() {
  return (
    <Canvas camera={{ position: [0, 0, 10] }}>
      <ambientLight />
      <BreathAnimation />
    </Canvas>
  );
}
