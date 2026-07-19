import type { InsiderPhase } from 'shared';
import { Button } from '../../../components/ui';
import { BookOpen, Check, Lock } from 'lucide-react';

type Props = {
  phase: Extract<InsiderPhase, 'master_reads' | 'insider_reads'>;
  masterName: string;
  isMaster: boolean;
  isInsider: boolean;
  categoryLabel?: string;
  secretWord?: string;
  onMasterAck: () => void;
  onInsiderAck: () => void;
};

export function InsiderReadFlowPanel({
  phase,
  masterName,
  isMaster,
  isInsider,
  categoryLabel,
  secretWord,
  onMasterAck,
  onInsiderAck,
}: Props) {
  const showWord = secretWord != null && secretWord.length > 0;
  const step1Done = phase === 'insider_reads';
  const step1Active = phase === 'master_reads' && !step1Done;
  const step2Active = phase === 'insider_reads';

  return (
    <section className="card insider-secret-shell" aria-labelledby="insider-readflow-title">
      <h2 id="insider-readflow-title" className="insider-secret-shell-title">
        <BookOpen className="insider-secret-shell-title-ic" aria-hidden />
        รอบอ่านคำลับ
      </h2>

      <ol className="insider-read-track" aria-label="ลำดับการอ่านคำลับ">
        <li
          className={`insider-read-step${step1Active ? ' insider-read-step--active' : ''}${step1Done ? ' insider-read-step--done' : ''}`}
        >
          <span className="insider-read-step-ic" aria-hidden>
            {step1Done ? <Check size={18} strokeWidth={2.5} /> : '1'}
          </span>
          <span className="insider-read-step-label">
            <span>Master — อ่านคำลับ</span>
            <span className="insider-read-step-who">{masterName}</span>
          </span>
        </li>
        <li className={`insider-read-step${step2Active ? ' insider-read-step--active' : ''}`}>
          <span className="insider-read-step-ic" aria-hidden>
            2
          </span>
          <span>Insider — อ่านคำลับ</span>
        </li>
      </ol>

      <div className="insider-read-status-banner" role="status" aria-live="polite">
        {phase === 'master_reads' && (
          <div
            className={
              isMaster
                ? 'insider-read-status-tile insider-read-status-tile--on-master'
                : 'insider-read-status-tile'
            }
          >
            <strong>Master — กำลังอ่านคำลับ</strong>
            <p className="insider-read-status-master-who">Master คนตอนนี้: {masterName}</p>
            {!isMaster && (
              <p className="insider-read-status-tile-hint">
                รอ {masterName} อ่านและกด &ldquo;อ่านแล้ว&rdquo;
              </p>
            )}
          </div>
        )}
        {phase === 'insider_reads' && (
          <div
            className={
              isInsider
                ? 'insider-read-status-tile insider-read-status-tile--on-insider'
                : isMaster
                  ? 'insider-read-status-tile insider-read-status-tile--on-master'
                  : 'insider-read-status-tile'
            }
          >
            <strong>Insider — กำลังอ่านคำลับ</strong>
            {isMaster && !isInsider && showWord && (
              <p className="insider-read-status-tile-hint">
                คุณอ่านคำแล้ว — ยังแสดงคำนี้ให้ดูกันลืม จนกว่า Insider จะกดยืนยัน
              </p>
            )}
            {isInsider && showWord && (
              <p className="insider-read-status-tile-hint">
                อ่านให้แม่น — กด &ldquo;จำแล้ว&rdquo; เมื่อพร้อม
              </p>
            )}
            {!isMaster && !isInsider && (
              <p className="insider-read-status-tile-hint">
                กรุณาหลีกมุมหรือหลับตา — รอ Insider กดยืนยันว่าจำคำแล้ว
              </p>
            )}
          </div>
        )}
      </div>

      <div
        className={`insider-secret-reveal-box${showWord ? ' insider-secret-reveal-box--lit' : ''}`}
      >
        {showWord ? (
          <>
            {categoryLabel != null && (
              <p className="insider-secret-reveal-cat">หมวด: {categoryLabel}</p>
            )}
            <p className="insider-secret-reveal-master" lang="th">
              Master: <strong>{masterName}</strong>
            </p>
            <p className="insider-secret-reveal-word" lang="th">
              {secretWord}
            </p>
          </>
        ) : (
          <div className="insider-secret-locked">
            <Lock className="insider-secret-locked-ic" aria-hidden />
            <p className="insider-secret-locked-title">ยังไม่ใช่ตาคุณ</p>
            <p className="insider-secret-locked-master-who">Master: {masterName}</p>
            {phase === 'master_reads' && (
              <p className="insider-muted">
                รอ <strong>{masterName}</strong> ฝ่าย Master อ่านก่อน — ถ้าคุณเป็น Insider
                จะเห็นคำนี้ในขั้นถัดไป
              </p>
            )}
            {phase === 'insider_reads' && !isInsider && (
              <p className="insider-muted">บทบาทนี้ไม่อ่านคำลับ — กรุณาไม่แอบมอง</p>
            )}
          </div>
        )}
      </div>

      <div className="insider-read-actions">
        {phase === 'master_reads' && isMaster && showWord && (
          <Button type="button" onClick={onMasterAck} className="insider-read-cta" size="md">
            อ่านแล้ว — ไปต่อ
          </Button>
        )}
        {phase === 'master_reads' && !isMaster && (
          <p className="insider-read-actions-wait insider-muted">รอ Master กดยืนยันต่อ</p>
        )}

        {phase === 'insider_reads' && isInsider && showWord && (
          <Button type="button" onClick={onInsiderAck} className="insider-read-cta" size="lg">
            จำแล้ว — เริ่มถามตอบ
          </Button>
        )}
        {phase === 'insider_reads' && isMaster && !isInsider && showWord && (
          <p className="insider-read-actions-wait insider-muted">
            รอ Insider กด &ldquo;จำแล้ว&rdquo; เพื่อเริ่มรอบถาม-ตอบ
          </p>
        )}
        {phase === 'insider_reads' && !isMaster && !isInsider && (
          <p className="insider-read-actions-wait insider-muted">รอ Insider กดยืนยัน</p>
        )}
      </div>
    </section>
  );
}
