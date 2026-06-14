import { useBox } from '@react-three/cannon';
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

export const Enemy = ({ position, onHit }: { position: [number, number, number], onHit: () => void }) => {
  const [health, setHealth] = useState(100);
  const [ref] = useBox(() => ({
    mass: 1,
    position,
    args: [1, 2, 1],
    onCollide: (e) => {
      // Could handle collision with bullets here if we use physical bullets
    },
  }));

  // Simple floating animation
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.position.y += Math.sin(t * 2) * 0.005;
  });

  return (
    <mesh 
      ref={ref as any} 
      castShadow 
      onClick={(e) => {
        e.stopPropagation();
        onHit();
      }}
    >
      <boxGeometry args={[1, 2, 1]} />
      <meshStandardMaterial color={health > 0 ? "#800" : "#333"} />
    </mesh>
  );
};
