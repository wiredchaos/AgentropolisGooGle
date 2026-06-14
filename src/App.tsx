import { Physics } from '@react-three/cannon';
import { Sky, Stars } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { GameControls } from './components/game/GameControls';
import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Player } from './components/game/Player';
import { World } from './components/game/World';
import { Weapon } from './components/game/Weapon';
import { Enemy } from './components/game/Enemy';
import { HUD } from './components/game/HUD';
import { useGameState } from './hooks/useGameState';
import { ProtocolConsole } from './components/game/ProtocolConsole';

export default function App() {
  const {
    status,
    setStatus,
    health,
    setHealth,
    ammo,
    setAmmo,
    score,
    setScore,
    protocolMode,
    setProtocol,
    pulseTimer,
    isPulseActive,
    artifacts,
    collectArtifact,
    isConsoleOpen,
    toggleConsole,
    startPRG33
  } = useGameState();

  const [isHitting, setIsHitting] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const [enemies, setEnemies] = useState([
    { id: 1, position: [5, 1, -10] as [number, number, number] },
    { id: 2, position: [-15, 1, -25] as [number, number, number] },
    { id: 3, position: [20, 1, 15] as [number, number, number] },
    { id: 4, position: [-5, 1, 30] as [number, number, number] },
    { id: 5, position: [30, 1, -5] as [number, number, number] },
  ]);

  const handleShoot = useCallback(() => {
    if (status === 'start' || status === 'gameover') return;
    if (ammo > 0) {
      setAmmo((prev) => prev - 1);
      setIsShooting(true);
      setTimeout(() => setIsShooting(false), 50);
      
      // Muzzle flash effect could be added here
    } else {
      toast.error('RELOAD REQUIRED', {
        id: 'reload-toast',
        duration: 1000,
        style: {
          background: '#000',
          color: '#fff',
          border: '1px solid #333',
          fontFamily: 'monospace',
        }
      });
    }
  }, [ammo, status]);

  const handleEnemyHit = (id: number) => {
    setScore((prev) => prev + 100);
    setEnemies((prev) => prev.filter((e) => e.id !== id));
    setIsHitting(true);
    setTimeout(() => setIsHitting(false), 100);

    toast.success('TARGET ELIMINATED', {
      duration: 1500,
      icon: '🎯',
      style: {
        background: '#000',
        color: '#fff',
        border: '1px solid #333',
        fontFamily: 'monospace',
      }
    });
    
    // Respawn enemy after some time
    setTimeout(() => {
      setEnemies((prev) => [
        ...prev,
        { 
          id: Math.random(), 
          position: [(Math.random() - 0.5) * 80, 1, (Math.random() - 0.5) * 80] as [number, number, number] 
        }
      ]);
    }, 3000);
  };

  const startGame = () => {
    setStatus('playing');
    setHealth(100);
    setAmmo(30);
    setScore(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR' && ammo < 30) {
        setAmmo(30);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ammo]);

  return (
    <div className={`canvas-container ${protocolMode === 'INVERT' ? 'scale-y-[-1]' : ''}`} onClick={handleShoot}>
      {status === 'start' && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full flex flex-col gap-8 text-center animate-fade-in">
            <h1 className="text-8xl font-black tracking-tighter uppercase italic">BlazeFPS</h1>
            <p className="text-muted-foreground font-mono">
              IMMERSIVE 3D BROWSER COMBAT SYSTEM v1.0.4<br/>
              WA S D TO MOVE | SPACE TO JUMP | MOUSE TO AIM<br/>
              CLICK TO SHOOT | R TO RELOAD
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={startGame}
                className="bg-primary text-primary-foreground py-4 px-8 text-2xl font-bold hover:scale-105 transition-transform"
              >
                INITIALIZE PROTOCOL
              </button>
              <button 
                onClick={startPRG33}
                className="border border-red-600 text-red-600 py-3 px-8 text-lg font-bold hover:bg-red-600 hover:text-white transition-all"
              >
                PRG33: EXCEPTION_STATE
              </button>
            </div>
          </div>
        </div>
      )}

      {(status === 'playing' || status === 'prg33') && (
        <>
          <HUD 
            health={health} 
            ammo={ammo} 
            score={score} 
            protocolMode={protocolMode}
            pulseTimer={pulseTimer}
            isPulseActive={isPulseActive}
          />
          {isHitting && (
            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-red-500 rounded-full animate-ping opacity-50" />
            </div>
          )}
          {isConsoleOpen && (
            <ProtocolConsole 
              currentMode={protocolMode} 
              onSelectMode={setProtocol} 
              onClose={toggleConsole} 
            />
          )}
        </>
      )}

      <div className={`noise-overlay ${protocolMode === 'BLACKOUT' ? 'opacity-100' : ''}`} />
      <div className="scanline" />

      <Canvas shadows camera={{ fov: 45 }}>
        {protocolMode !== 'BLACKOUT' && <Sky sunPosition={[100, 20, 100]} />}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <Physics gravity={[0, -9.81, 0]}>
          <World 
            isPRG33={status === 'prg33'} 
            protocolMode={protocolMode} 
            onConsoleClick={toggleConsole}
            artifacts={artifacts}
            onCollectArtifact={collectArtifact}
          />
          {(status === 'playing' || status === 'prg33') && (
            <>
              <Player />
              <Weapon isShooting={isShooting} />
              {enemies.map((enemy) => (
                <Enemy 
                  key={enemy.id} 
                  position={enemy.position} 
                  onHit={() => handleEnemyHit(enemy.id)} 
                />
              ))}
            </>
          )}
        </Physics>

        <GameControls enabled={status === 'playing' || status === 'prg33'} />
      </Canvas>
    </div>
  );
}
