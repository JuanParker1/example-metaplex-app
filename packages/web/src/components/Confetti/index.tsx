import React, { useContext, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';

export interface ConfettiContextState {
  dropConfetti: () => void;
}

const ConfettiContext = React.createContext<ConfettiContextState | null>(null);

export const ConfettiProvider = ({
  children = null,
}: {
  children: React.ReactNode;
}) => {
  const canvasReference = useRef<HTMLCanvasElement>();
  const confettiReference = useRef<confetti.CreateTypes>();

  const dropConfetti = useMemo(
    () => () => {
      if (confettiReference.current && canvasReference.current) {
        canvasReference.current.style.visibility = 'visible';
        confettiReference
          .current({
            particleCount: 400,
            spread: 160,
            origin: { y: 0.3 },
          })
          ?.finally(() => {
            if (canvasReference.current) {
              canvasReference.current.style.visibility = 'hidden';
            }
          });
      }
    },
    [],
  );

  useEffect(() => {
    if (canvasReference.current && !confettiReference.current) {
      canvasReference.current.style.visibility = 'hidden';
      confettiReference.current = confetti.create(canvasReference.current, {
        resize: true,
        useWorker: true,
      });
    }
  }, []);

  const canvasStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    position: 'absolute',
    zIndex: 1,
    top: 0,
    left: 0,
  };

  return (
    <ConfettiContext.Provider value={{ dropConfetti }}>
      <canvas ref={canvasReference as any} style={canvasStyle} />
      {children}
    </ConfettiContext.Provider>
  );
};

export const Confetti = () => {
  const { dropConfetti } = useConfetti();

  useEffect(() => {
    dropConfetti();
  }, [dropConfetti]);

  return <></>;
};

export const useConfetti = () => {
  const context = useContext(ConfettiContext);
  return context as ConfettiContextState;
};
