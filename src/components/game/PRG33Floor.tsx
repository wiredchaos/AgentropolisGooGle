
import { Box, Plane, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { ProtocolMode } from '../../types/game';

interface PRG33FloorProps {
  protocolMode: ProtocolMode;
  onConsoleClick: () => void;
  onRelayClick: () => void;
  onVaultClick: () => void;
}

export const PRG33Floor = ({ protocolMode, onConsoleClick, onRelayClick, onVaultClick }: PRG33FloorProps) => {
  const floorRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (floorRef.current) {
      // Liquid effect on floor
      const material = floorRef.current.material as THREE.MeshStandardMaterial;
      if (material.userData.shader) {
        material.userData.shader.uniforms.time.value = state.clock.getElapsedTime();
      }
    }
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: '#050505',
    metalness: 0.9,
    roughness: 0.1,
  });

  // Custom shader for liquid effect could be added here, but for now we use standard
  
  return (
    <group>
      {/* Floor */}
      <Plane 
        args={[100, 100]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        receiveShadow
      >
        <meshStandardMaterial 
          color={protocolMode === 'BLACKOUT' ? '#000' : '#050505'} 
          metalness={0.9} 
          roughness={0.05} 
        />
      </Plane>

      {/* Corridor Walls */}
      <Box args={[2, 10, 40]} position={[-5, 5, 0]}>
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
      </Box>
      <Box args={[2, 10, 40]} position={[5, 5, 0]}>
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
      </Box>

      {/* Ceiling */}
      <Box args={[12, 1, 40]} position={[0, 10, 0]}>
        <meshStandardMaterial color="#050505" />
      </Box>

      {/* Neon Signage */}
      <Text
        position={[0, 7, -15]}
        fontSize={2}
        color={protocolMode === 'BLACKOUT' ? '#300' : '#f00'}
      >
        PRG33: EXCEPTION STATE
      </Text>

      {/* Interactable Stations */}
      <group position={[-3, 1, -5]} onClick={(e) => { e.stopPropagation(); onConsoleClick(); }}>
        <Box args={[1, 1.5, 1]}>
          <meshStandardMaterial color="#222" emissive={protocolMode === 'BLACKOUT' ? '#100' : '#0f0'} emissiveIntensity={0.5} />
        </Box>
        <Text position={[0, 1.2, 0]} fontSize={0.2} color="white">CONSOLE</Text>
      </group>

      <group position={[3, 1, -5]} onClick={(e) => { e.stopPropagation(); onRelayClick(); }}>
        <Box args={[1, 1.5, 1]}>
          <meshStandardMaterial color="#222" emissive="#00f" emissiveIntensity={0.5} />
        </Box>
        <Text position={[0, 1.2, 0]} fontSize={0.2} color="white">RELAY</Text>
      </group>

      <group position={[0, 1, -15]} onClick={(e) => { e.stopPropagation(); onVaultClick(); }}>
        <Box args={[4, 5, 1]} position={[0, 1.5, 0]}>
          <meshStandardMaterial color="#111" metalness={1} roughness={0} />
        </Box>
        <Text position={[0, 5, 0.6]} fontSize={0.5} color="red">VAULT DOOR</Text>
      </group>

      {/* Ambient Lighting for PRG33 */}
      <pointLight position={[0, 8, -5]} intensity={protocolMode === 'BLACKOUT' ? 0.2 : 1} color={protocolMode === 'ECHO' ? '#0ff' : '#f0f'} />
      <pointLight position={[0, 8, 5]} intensity={protocolMode === 'BLACKOUT' ? 0.2 : 1} color="#f0f" />
    </group>
  );
};
