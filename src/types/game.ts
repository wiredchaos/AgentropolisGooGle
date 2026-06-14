
export type ProtocolMode = 'NORMAL' | 'BLACKOUT' | 'ECHO' | 'INVERT';

export type ArtifactType = 'SIGIL SHARD' | 'KEYFRAGMENT 33' | 'MEMORY HEX';

export interface Artifact {
  id: string;
  type: ArtifactType;
  position: [number, number, number];
  collected: boolean;
}

export interface PRG33State {
  protocolMode: ProtocolMode;
  isPulseActive: boolean;
  pulseTimer: number;
  artifacts: Artifact[];
  collectedArtifacts: ArtifactType[];
  isConsoleOpen: boolean;
}

export type GameStatus = 'start' | 'playing' | 'gameover' | 'prg33';
