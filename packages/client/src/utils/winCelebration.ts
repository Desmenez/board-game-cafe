import confetti from 'canvas-confetti';

export function startWinCelebrationLoop(): () => void {
  let active = true;
  let frameId: number | null = null;
  let lastFireworkAt = 0;

  const render = (now: number) => {
    if (!active) return;

    // Snow-like particles from the top edge
    confetti({
      particleCount: 2,
      angle: 90,
      spread: 50,
      startVelocity: 6,
      gravity: 0.45,
      ticks: 280,
      scalar: 0.75,
      origin: { x: Math.random(), y: 0 },
      colors: ['#ffffff', '#dbeafe', '#bfdbfe'],
      zIndex: 9999,
      disableForReducedMotion: true,
    });

    // Firework bursts every ~650ms
    if (now - lastFireworkAt >= 650) {
      lastFireworkAt = now;
      const x = 0.2 + Math.random() * 0.6;
      const y = 0.15 + Math.random() * 0.35;
      confetti({
        particleCount: 100,
        spread: 90,
        startVelocity: 45,
        gravity: 0.9,
        ticks: 220,
        scalar: 1.05,
        origin: { x, y },
        zIndex: 9999,
        disableForReducedMotion: true,
      });
    }

    frameId = window.requestAnimationFrame(render);
  };

  frameId = window.requestAnimationFrame(render);

  return () => {
    active = false;
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
    }
  };
}
