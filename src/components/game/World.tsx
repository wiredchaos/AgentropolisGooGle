import { usePlane, useBox } from '@react-three/cannon';
import { useTexture } from '@react-three/drei';
import { DoubleSide } from 'three';
import { PRG33Floor } from './PRG33Floor';
import { ProtocolMode, Artifact } from '../../types/game';
import { ArtifactItem } from './ArtifactItem';

const Floor = () => {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
  }));

  return (
    <mesh ref={ref as any} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#111" />
    </mesh>
  );
};

const Cube = ({ position, args = [1, 1, 1], color = "#222" }: any) => {
  const [ref] = useBox(() => ({
    type: 'Static',
    position,
    args,
  }));

  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

interface WorldProps {
  isPRG33?: boolean;
  protocolMode?: ProtocolMode;
  onConsoleClick?: () => void;
  artifacts?: Artifact[];
  onCollectArtifact?: (id: string) => void;
}

export const World = ({ 
  isPRG33 = false, 
  protocolMode = 'NORMAL', 
  onConsoleClick = () => {},
  artifacts = [],
  onCollectArtifact = () => {}
}: WorldProps) => {
  return (
    <>
      <ambientLight intensity={protocolMode === 'BLACKOUT' ? 0.05 : 0.5} />
      <pointLight position={[10, 10, 10]} castShadow intensity={protocolMode === 'BLACKOUT' ? 0.1 : 1} />
      
      {isPRG33 ? (
        <>
          <PRG33Floor 
            protocolMode={protocolMode} 
            onConsoleClick={onConsoleClick} 
            onRelayClick={() => console.log('Relay clicked')}
            onVaultClick={() => console.log('Vault clicked')}
          />
          {artifacts.map((artifact) => (
            <ArtifactItem 
              key={artifact.id}
              type={artifact.type}
              position={artifact.position}
              collected={artifact.collected}
              onCollect={() => onCollectArtifact(artifact.id)}
            />
          ))}
        </>
      ) : (
        <>
          <Floor />
          {/* Walls */}
          <Cube position={[0, 2.5, -50]} args={[100, 5, 1]} />
          <Cube position={[0, 2.5, 50]} args={[100, 5, 1]} />
          <Cube position={[-50, 2.5, 0]} args={[1, 5, 100]} />
          <Cube position={[50, 2.5, 0]} args={[1, 5, 100]} />
          
          {/* Obstacles */}
          <Cube position={[10, 1, 10]} color="#333" />
          <Cube position={[-10, 2, -10]} args={[2, 4, 2]} color="#444" />
          <Cube position={[20, 1.5, -20]} args={[3, 3, 3]} color="#555" />
        </>
      )}
    </>
  );
};
