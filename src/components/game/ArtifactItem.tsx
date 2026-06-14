
import { Float, Sphere, MeshDistortMaterial, Text } from '@react-three/drei';
import { ArtifactType } from '../../types/game';

interface ArtifactItemProps {
  type: ArtifactType;
  position: [number, number, number];
  onCollect: () => void;
  collected: boolean;
}

export const ArtifactItem = ({ type, position, onCollect, collected }: ArtifactItemProps) => {
  if (collected) return null;

  const getColor = () => {
    switch (type) {
      case 'SIGIL SHARD': return '#f00';
      case 'KEYFRAGMENT 33': return '#0f0';
      case 'MEMORY HEX': return '#00f';
      default: return '#fff';
    }
  };

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onCollect(); }}>
      <Float speed={2} rotationIntensity={2} floatIntensity={2}>
        <Sphere args={[0.3, 32, 32]}>
          <MeshDistortMaterial
            color={getColor()}
            speed={5}
            distort={0.4}
            emissive={getColor()}
            emissiveIntensity={1}
          />
        </Sphere>
        <Text
          position={[0, 0.6, 0]}
          fontSize={0.2}
          color="white"
        >
          {type}
        </Text>
      </Float>
    </group>
  );
};
