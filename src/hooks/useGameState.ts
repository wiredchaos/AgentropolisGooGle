
import { useState, useCallback, useEffect } from 'react';
import { ProtocolMode, ArtifactType, Artifact, GameStatus } from '../types/game';
import toast from 'react-hot-toast';

export const useGameState = () => {
  const [status, setStatus] = useState<GameStatus>('start');
  const [health, setHealth] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [score, setScore] = useState(0);
  
  // PRG33 Specific State
  const [protocolMode, setProtocolMode] = useState<ProtocolMode>('NORMAL');
  const [pulseTimer, setPulseTimer] = useState(90);
  const [isPulseActive, setIsPulseActive] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [collectedArtifacts, setCollectedArtifacts] = useState<ArtifactType[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  const startPRG33 = useCallback(() => {
    setStatus('prg33');
    setProtocolMode('NORMAL');
    setPulseTimer(90);
    setArtifacts([
      { id: '1', type: 'SIGIL SHARD', position: [10, 1, 10], collected: false },
      { id: '2', type: 'KEYFRAGMENT 33', position: [-10, 1, -10], collected: false },
    ]);
  }, []);

  const toggleConsole = useCallback(() => {
    setIsConsoleOpen(prev => !prev);
  }, []);

  const setProtocol = useCallback((mode: ProtocolMode) => {
    setProtocolMode(mode);
    setIsConsoleOpen(false);
    toast(`PROTOCOL: ${mode} INITIALIZED`, {
      style: {
        background: '#000',
        color: mode === 'BLACKOUT' ? '#f00' : mode === 'ECHO' ? '#0f0' : '#fff',
        border: '1px solid #333',
        fontFamily: 'monospace',
      }
    });
  }, []);

  const collectArtifact = useCallback((id: string) => {
    setArtifacts(prev => prev.map(a => a.id === id ? { ...a, collected: true } : a));
    const artifact = artifacts.find(a => a.id === id);
    if (artifact) {
      setCollectedArtifacts(prev => [...prev, artifact.type]);
      toast.success(`${artifact.type} EXTRACTED`, {
        style: {
          background: '#000',
          color: '#0f0',
          border: '1px solid #333',
          fontFamily: 'monospace',
        }
      });
    }
  }, [artifacts]);

  useEffect(() => {
    if (status !== 'prg33') return;

    const interval = setInterval(() => {
      setPulseTimer(prev => {
        if (prev <= 1) {
          setIsPulseActive(true);
          setTimeout(() => setIsPulseActive(false), 5000); // Pulse lasts 5 seconds
          return 90;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  return {
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
    collectedArtifacts,
    isConsoleOpen,
    toggleConsole,
    startPRG33
  };
};
