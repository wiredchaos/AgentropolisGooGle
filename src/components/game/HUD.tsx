import React from 'react';
import { ProtocolMode } from '../../types/game';

interface HUDProps {
  health: number;
  ammo: number;
  score: number;
  protocolMode?: ProtocolMode;
  pulseTimer?: number;
  isPulseActive?: boolean;
}

export const HUD: React.FC<HUDProps> = ({ 
  health, 
  ammo, 
  score, 
  protocolMode = 'NORMAL', 
  pulseTimer = 90,
  isPulseActive = false
}) => {
  return (
    <div className={`hud-overlay p-8 flex flex-col justify-between ${isPulseActive ? 'animate-pulse' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="text-4xl font-bold tracking-tighter uppercase">BlazeFPS</div>
          <div className="text-sm text-muted-foreground">MISSION: ELIMINATE TARGETS</div>
          {protocolMode !== 'NORMAL' && (
            <div className={`text-xs font-mono px-2 py-0.5 border ${
              protocolMode === 'BLACKOUT' ? 'border-red-500 text-red-500' :
              protocolMode === 'ECHO' ? 'border-green-500 text-green-500' :
              'border-blue-500 text-blue-500'
            }`}>
              PRG33: {protocolMode} ACTIVE
            </div>
          )}
        </div>
        
        <div className="flex gap-8">
          {protocolMode !== 'NORMAL' && (
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Pulse</div>
              <div className={`text-4xl font-bold font-mono ${pulseTimer < 10 ? 'text-red-500' : ''}`}>
                {pulseTimer.toString().padStart(2, '0')}s
              </div>
            </div>
          )}
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Score</div>
            <div className="text-4xl font-bold">{score.toString().padStart(6, '0')}</div>
          </div>
        </div>
      </div>

      <div className="crosshair" />

      {isPulseActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-8xl font-black text-white/10 italic select-none">RULE FLIP ACTIVE</div>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Health</div>
          <div className="w-64 h-4 bg-secondary border border-border overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300" 
              style={{ width: `${health}%` }}
            />
          </div>
          <div className="text-2xl font-bold">{health}%</div>
        </div>

        <div className="text-right flex flex-col gap-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Ammo</div>
          <div className="flex items-baseline gap-2 justify-end">
            <span className="text-6xl font-black leading-none">{ammo}</span>
            <span className="text-2xl text-muted-foreground font-bold">/ ∞</span>
          </div>
        </div>
      </div>
    </div>
  );
};
