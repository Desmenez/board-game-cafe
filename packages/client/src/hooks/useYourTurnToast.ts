import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import './your-turn.css';

export const YOUR_TURN_TOAST_ID = 'your-turn';
/** Toggled on `document.documentElement` while it is the local player's turn. */
export const YOUR_TURN_FRAME_CLASS = 'bgc-your-turn';

/**
 * แสดง toast เมื่อเข้าสู่ช่วงที่ผู้เล่นต้องลงมือ (false → true เท่านั้น)
 * และเปิดกรอบเหลืองรอบจอตลอดช่วงที่เป็นตาของคุณ
 */
export function useYourTurnToast(isYourTurn: boolean, enabled = true) {
  const prevRef = useRef<boolean | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const showFrame = enabled && isYourTurn;
    root.classList.toggle(YOUR_TURN_FRAME_CLASS, showFrame);
    return () => {
      root.classList.remove(YOUR_TURN_FRAME_CLASS);
    };
  }, [enabled, isYourTurn]);

  useEffect(() => {
    if (!enabled) {
      prevRef.current = isYourTurn;
      return;
    }
    const prev = prevRef.current;
    if (prev === false && isYourTurn === true) {
      toast('ถึงตาของคุณแล้ว', {
        id: YOUR_TURN_TOAST_ID,
        duration: 3400,
        position: 'top-center',
        /** Own class — global `.night-toast` uses !important and would wash out inline colors. */
        className: 'bgc-your-turn-toast',
      });
    }
    prevRef.current = isYourTurn;
  }, [enabled, isYourTurn]);
}
