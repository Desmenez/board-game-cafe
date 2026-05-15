import { useEffect, useState } from 'react';
import type { PowsLobbyOptions as PowsOpts, PowsNegotiationDuration, PowsTotalMonths } from 'shared';
import {
  POWS_NEGOTIATION_DURATIONS,
  POWS_TOTAL_MONTHS_OPTIONS,
  powsNegotiationDurationLabelTh,
} from 'shared';
import { Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

const DEFAULTS: PowsOpts = { negotiationDuration: '2m', totalMonths: 5 };

function optsFromUnknown(opts: unknown): PowsOpts {
  if (!opts || typeof opts !== 'object') return DEFAULTS;
  const o = opts as Record<string, unknown>;
  let negotiationDuration = DEFAULTS.negotiationDuration;
  const d = o.negotiationDuration;
  if (
    typeof d === 'string' &&
    (POWS_NEGOTIATION_DURATIONS as readonly string[]).includes(d)
  ) {
    negotiationDuration = d as PowsNegotiationDuration;
  }
  let totalMonths = DEFAULTS.totalMonths;
  const m = o.totalMonths;
  if (
    typeof m === 'number' &&
    Number.isInteger(m) &&
    (POWS_TOTAL_MONTHS_OPTIONS as readonly number[]).includes(m)
  ) {
    totalMonths = m as PowsTotalMonths;
  }
  return { negotiationDuration, totalMonths };
}

export function PowsLobbyOptions({ isHost, onChange, lobbyOptions }: LobbyOptionsProps) {
  const initial = optsFromUnknown(lobbyOptions);
  const [negotiationDuration, setNegotiationDuration] = useState(initial.negotiationDuration);
  const [totalMonths, setTotalMonths] = useState(initial.totalMonths);

  useEffect(() => {
    if (isHost) return;
    const next = optsFromUnknown(lobbyOptions);
    setNegotiationDuration(next.negotiationDuration);
    setTotalMonths(next.totalMonths);
  }, [isHost, lobbyOptions]);

  const emitChange = (patch: Partial<PowsOpts>) => {
    onChange({
      negotiationDuration,
      totalMonths,
      ...patch,
    });
  };

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>Panic on Wall Street — ตั้งค่าเกม</h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-semibold">จำนวนเดือน (รอบ)</span>
          {isHost ? (
            <Select
              className="w-full"
              value={String(totalMonths)}
              onChange={(e) => {
                const next = Number(e.target.value) as PowsTotalMonths;
                setTotalMonths(next);
                emitChange({ totalMonths: next });
              }}
            >
              {POWS_TOTAL_MONTHS_OPTIONS.map((m) => (
                <option key={m} value={String(m)}>
                  {m} เดือน
                </option>
              ))}
            </Select>
          ) : (
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{totalMonths} เดือน</span>
          )}
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">ระยะเวลาเจรจา</span>
          {isHost ? (
            <Select
              className="w-full"
              value={negotiationDuration}
              onChange={(e) => {
                const next = e.target.value as PowsNegotiationDuration;
                setNegotiationDuration(next);
                emitChange({ negotiationDuration: next });
              }}
            >
              {POWS_NEGOTIATION_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {powsNegotiationDurationLabelTh(d)}
                </option>
              ))}
            </Select>
          ) : (
            <span>{powsNegotiationDurationLabelTh(negotiationDuration)}</span>
          )}
        </label>
      </div>
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.88rem',
          marginTop: 14,
          marginBottom: 0,
        }}
      >
        เดือนสุดท้ายจบเกมหลังจ่ายค่าบริหาร — เดือนก่อนหน้ามีประมูล · เจรจาหมดเวลาแล้วทอยตลาดอัตโนมัติ
      </p>
    </div>
  );
}
