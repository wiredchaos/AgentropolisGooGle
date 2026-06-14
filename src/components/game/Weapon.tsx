import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export const Weapon = ({ isShooting }: { isShooting: boolean }) => {
  const weaponRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const recoilRef = useRef(0);

  useFrame((state) => {
    if (!weaponRef.current) return;

    // Handle recoil
    if (isShooting) {
      recoilRef.current = 0.1;
    }
    recoilRef.current = THREE.MathUtils.lerp(recoilRef.current, 0, 0.1);

    // Weapon sway
    const time = state.clock.getElapsedTime();
    weaponRef.current.position.y = -0.3 + Math.sin(time * 2) * 0.01 + recoilRef.current * 0.5;
    weaponRef.current.position.x = 0.4 + Math.cos(time * 1.5) * 0.01;
    weaponRef.current.position.z = -0.6 + recoilRef.current;

    // Follow camera rotation
    weaponRef.current.rotation.copy(camera.rotation);
    weaponRef.current.position.copy(camera.position);
    
    // Offset weapon from camera
    const offset = new THREE.Vector3(0.4, -0.35, -0.6);
    offset.applyQuaternion(camera.quaternion);
    weaponRef.current.position.add(offset);
  });

  return (
    <group ref={weaponRef}>
      {/* Gun Body */}
      <mesh castShadow>
        <boxGeometry args={[0.1, 0.15, 0.6]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, -0.15, 0.1]} castShadow>
        <boxGeometry args={[0.08, 0.2, 0.1]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.4]} />
        <meshStandardMaterial color="#333" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Scope/Sight */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[0.04, 0.06, 0.2]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
};