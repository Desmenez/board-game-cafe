import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';

/**
 * Desktop: mouse + distance. Mobile: touch + short hold (not PointerSensor — it steals touch as scroll).
 * @see https://docs.dndkit.com/api-documentation/sensors
 */
export function usePlayDragSensors() {
  return useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 6 },
    }),
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
  );
}
