
import { ProtocolMode } from '../../types/game';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

interface ProtocolConsoleProps {
  currentMode: ProtocolMode;
  onSelectMode: (mode: ProtocolMode) => void;
  onClose: () => void;
}

export const ProtocolConsole = ({ currentMode, onSelectMode, onClose }: ProtocolConsoleProps) => {
  const modes: { id: ProtocolMode; label: string; desc: string; color: string }[] = [
    { id: 'NORMAL', label: 'NORMAL', desc: 'Standard safety protocols active.', color: 'text-white' },
    { id: 'BLACKOUT', label: 'BLACKOUT', desc: 'Revoke visual compliance. Emergency light only.', color: 'text-red-500' },
    { id: 'ECHO', label: 'ECHO', desc: 'Reveal latent data layers. Ghost UI active.', color: 'text-green-500' },
    { id: 'INVERT', label: 'INVERT', desc: 'Space-time recalibration. Rule inversion.', color: 'text-blue-500' },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
      <div className="max-w-2xl w-full border border-zinc-800 bg-zinc-950/50 p-8 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="space-y-8">
          <div className="space-y-2 border-l-4 border-red-600 pl-4">
            <h2 className="text-4xl font-black tracking-tighter uppercase italic text-red-600">PRG33: PROTOCOL_OVERRIDE</h2>
            <p className="text-zinc-500 font-mono text-sm uppercase">Select exception state directive to proceed</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className={`flex flex-col gap-2 p-6 border text-left transition-all duration-300 group
                  ${currentMode === mode.id 
                    ? 'border-white bg-white text-black' 
                    : 'border-zinc-800 hover:border-zinc-400 bg-zinc-900/50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xl font-bold tracking-tight ${currentMode === mode.id ? 'text-black' : mode.color}`}>
                    {mode.label}
                  </span>
                  {currentMode === mode.id && (
                    <span className="text-[10px] font-mono bg-black text-white px-2 py-0.5">ACTIVE</span>
                  )}
                </div>
                <p className={`text-xs font-mono leading-relaxed ${currentMode === mode.id ? 'text-black/70' : 'text-zinc-500'}`}>
                  {mode.desc}
                </p>
                <div className={`h-1 w-0 group-hover:w-full transition-all duration-500 mt-2 ${currentMode === mode.id ? 'bg-black' : 'bg-white'}`} />
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-zinc-900">
            <div className="flex items-center justify-between font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
              <span>System: Compliance_Null</span>
              <span>Status: Waiting_Selection</span>
              <span>Auth: Root_Access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
