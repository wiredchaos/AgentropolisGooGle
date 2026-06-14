import { useEffect, useState } from 'react';

function actionByKey(key: string) {
  const keyActionMap: Record<string, string> = {
    KeyW: 'moveForward',
    KeyS: 'moveBackward',
    KeyA: 'moveLeft',
    KeyD: 'moveRight',
    Space: 'jump',
    Digit1: 'weapon1',
    Digit2: 'weapon2',
    Digit3: 'weapon3',
  };
  return keyActionMap[key];
}

export const useKeyboard = () => {
  const [actions, setActions] = useState({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    jump: false,
    weapon1: false,
    weapon2: false,
    weapon3: false,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = actionByKey(event.code);
      if (action) {
        setActions((prev) => ({ ...prev, [action]: true }));
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const action = actionByKey(event.code);
      if (action) {
        setActions((prev) => ({ ...prev, [action]: false }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return actions;
};
