import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { PointerLockControls as DreiPointerLockControls } from '@react-three/drei';

interface GameControlsProps {
  enabled: boolean;
}

export const GameControls = ({ enabled }: GameControlsProps) => {
  const controlsRef = useRef<any>(null);
  const { gl } = useThree();
  const [isReady, setIsReady] = useState(false);

  // Wait for canvas to be fully ready before rendering controls
  useEffect(() => {
    if (!gl?.domElement) return;

    // Check if pointer lock API is available on the canvas
    const checkReady = () => {
      const canvas = gl.domElement;
      if (canvas && typeof canvas.requestPointerLock === 'function') {
        setIsReady(true);
      } else {
        // Retry after a short delay
        setTimeout(checkReady, 100);
      }
    };

    const timer = setTimeout(checkReady, 200);
    return () => clearTimeout(timer);
  }, [gl]);

  // Handle pointer lock when enabled
  useEffect(() => {
    if (!enabled || !isReady || !controlsRef.current) return;

    const controls = controlsRef.current;

    // Auto-lock when game starts
    const autoLockTimer = setTimeout(() => {
      if (controls && !controls.isLocked) {
        try {
          controls.lock();
        } catch (e) {
          console.warn('Auto-lock failed:', e);
        }
      }
    }, 500);

    // Handle click to relock after unlock
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only lock if clicking on canvas and not on UI elements
      if (target.tagName === 'CANVAS' && controls && !controls.isLocked) {
        try {
          controls.lock();
        } catch (e) {
          console.warn('Click lock failed:', e);
        }
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      clearTimeout(autoLockTimer);
      document.removeEventListener('click', handleClick);
    };
  }, [enabled, isReady]);

  // Unlock when disabled
  useEffect(() => {
    if (!enabled && controlsRef.current?.isLocked) {
      try {
        controlsRef.current.unlock();
      } catch (e) {
        // Ignore
      }
    }
  }, [enabled]);

  // Only render PointerLockControls when ready AND enabled
  if (!enabled || !isReady) return null;

  return <DreiPointerLockControls ref={controlsRef} />;
};
