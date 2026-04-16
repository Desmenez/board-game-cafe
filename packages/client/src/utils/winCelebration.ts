import confetti from 'canvas-confetti';

/** One burst when an Avalon quest resolves as success (good-team milestone). */
/** One burst when Exploding Kittens “คุณจั่วได้” reveals a Defuse. */
export function fireDefuseDrawConfetti(): void {
  const x = 0.5;
  const y = 0.42;
  confetti({
    particleCount: 72,
    spread: 70,
    startVelocity: 38,
    gravity: 0.95,
    ticks: 200,
    scalar: 1,
    origin: { x, y },
    zIndex: 9999,
    disableForReducedMotion: true,
    colors: ['#fbbf24', '#fcd34d', '#fde68a', '#38bdf8', '#7dd3fc', '#ffffff'],
  });
}

/** Name It — หลังตั้งชื่อสุนัขสำเร็จ (modal + confetti สั้นๆ) */
export function fireNameItDogNamedConfetti(): void {
  const colors = ['#f472b6', '#c084fc', '#fbbf24', '#fcd34d', '#38bdf8', '#ffffff'];
  const burst = (x: number, y: number) =>
    confetti({
      particleCount: 72,
      spread: 62,
      startVelocity: 38,
      gravity: 0.9,
      ticks: 210,
      scalar: 0.95,
      origin: { x, y },
      zIndex: 10060,
      disableForReducedMotion: true,
      colors,
    });
  burst(0.32, 0.34);
  window.setTimeout(() => {
    burst(0.68, 0.36);
  }, 160);
}

export function fireQuestSuccessConfetti(): void {
  const x = 0.45 + Math.random() * 0.1;
  const y = 0.28 + Math.random() * 0.12;
  confetti({
    particleCount: 95,
    spread: 88,
    startVelocity: 44,
    gravity: 0.92,
    ticks: 210,
    scalar: 1.02,
    origin: { x, y },
    zIndex: 9999,
    disableForReducedMotion: true,
    colors: ['#22c55e', '#4ade80', '#86efac', '#fbbf24', '#fde047', '#ffffff'],
  });
}

/** Welcome to the Dungeon — ผู้เข้ารอดดันเจี้ยนรอบหนึ่ง (หนึ่งลูก) */
export function fireWttdDungeonRoundSurviveConfetti(): void {
  const x = 0.48 + Math.random() * 0.06;
  const y = 0.32 + Math.random() * 0.08;
  confetti({
    particleCount: 88,
    spread: 82,
    startVelocity: 42,
    gravity: 0.93,
    ticks: 200,
    scalar: 1,
    origin: { x, y },
    zIndex: 10070,
    disableForReducedMotion: true,
    colors: ['#a78bfa', '#c4b5fd', '#fbbf24', '#fcd34d', '#34d399', '#ffffff'],
  });
}

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
