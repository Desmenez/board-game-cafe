import type { OnuwNightSecretView } from 'shared';
import { onuwCardBackUrl, onuwRoleCardUrl } from '../../imageMap';
import { ROLE_LABEL_TH } from './onuwRoles';

function NightSecretCardImg({ artKey, caption }: { artKey: string; caption?: string }) {
  return (
    <figure className="onuw-secret-card-fig">
      <img src={onuwRoleCardUrl(artKey)} alt="" className="onuw-secret-card-img" decoding="async" />
      {caption ? <figcaption className="onuw-secret-card-cap">{caption}</figcaption> : null}
    </figure>
  );
}

/** ผลลับจากคืน — เน้นรูปการ์ด */
export function NightSecretVisual({ secret }: { secret: OnuwNightSecretView }) {
  switch (secret.kind) {
    case 'doppel_peek':
      return (
        <div className="onuw-secret-visual">
          <div className="onuw-secret-cards-row">
            <NightSecretCardImg
              artKey={secret.sawArtKey}
              caption={`การ์ดของ ${secret.targetName}`}
            />
          </div>
          <p className="onuw-secret-hint">
            คุณสวมบท <strong>{ROLE_LABEL_TH[secret.sawRole]}</strong> ตลอดคืนนี้ —
            การ์ดของเขายังอยู่ที่เดิม
          </p>
        </div>
      );
    case 'wolf_pack':
      return (
        <div className="onuw-secret-visual onuw-secret-visual--text">
          <p className="onuw-secret-lead">เพื่อนมนุษย์หมาป่า</p>
          <p className="onuw-secret-names">
            {secret.teammateNames.length ? secret.teammateNames.join(' · ') : 'คุณคนเดียวในผู้เล่น'}
          </p>
        </div>
      );
    case 'wolf_solo':
      return (
        <div className="onuw-secret-visual">
          <div className="onuw-secret-cards-row">
            <NightSecretCardImg
              artKey={secret.sawArtKey}
              caption={`กลาง ${secret.centerIndex + 1}`}
            />
          </div>
        </div>
      );
    case 'minion_peek':
      return (
        <div className="onuw-secret-visual onuw-secret-visual--text">
          <p className="onuw-secret-lead">มนุษย์หมาป่าในเกม</p>
          <p className="onuw-secret-names">
            {secret.werewolfNames.length ? secret.werewolfNames.join(' · ') : 'ไม่มีในผู้เล่น'}
          </p>
        </div>
      );
    case 'mason_peek':
      return (
        <div className="onuw-secret-visual onuw-secret-visual--text">
          <p className="onuw-secret-lead">ช่างหินด้วยกัน</p>
          <p className="onuw-secret-names">
            {secret.masonNames.length ? secret.masonNames.join(' · ') : 'คุณคนเดียว'}
          </p>
        </div>
      );
    case 'seer_player':
      return (
        <div className="onuw-secret-visual">
          <div className="onuw-secret-cards-row">
            <NightSecretCardImg artKey={secret.sawArtKey} caption={secret.targetName} />
          </div>
        </div>
      );
    case 'seer_center':
      return (
        <div className="onuw-secret-visual">
          <div className="onuw-secret-cards-row onuw-secret-cards-row--pair">
            <NightSecretCardImg artKey={secret.artKeys[0]!} caption="กลางใบที่ 1" />
            <NightSecretCardImg artKey={secret.artKeys[1]!} caption="กลางใบที่ 2" />
          </div>
        </div>
      );
    case 'robber_swap':
      return (
        <div className="onuw-secret-visual">
          <div className="onuw-secret-cards-row">
            <NightSecretCardImg
              artKey={secret.newRoleArtKey}
              caption={`สลับกับ ${secret.tookFromName} — บทบาทใหม่`}
            />
          </div>
        </div>
      );
    case 'troublemaker_done':
      return (
        <div className="onuw-secret-visual onuw-secret-visual--text">
          <p className="onuw-secret-hint">
            สลับการ์ดระหว่าง <strong>{secret.swappedNames[0]}</strong> กับ{' '}
            <strong>{secret.swappedNames[1]}</strong>
          </p>
        </div>
      );
    case 'drunk_done':
      return (
        <div className="onuw-secret-visual onuw-secret-visual--text">
          <div className="onuw-secret-drunk-visual">
            <img src={onuwCardBackUrl()} alt="" className="onuw-secret-drunk-back" />
          </div>
          <p className="onuw-secret-hint">{secret.noteTh}</p>
        </div>
      );
    case 'insomniac':
      return (
        <div className="onuw-secret-visual">
          <div className="onuw-secret-cards-row onuw-secret-cards-row--pair">
            <NightSecretCardImg artKey={secret.startedArtKey} caption="ตอนเริ่มคืน" />
            <span className="onuw-secret-arrow" aria-hidden>
              →
            </span>
            <NightSecretCardImg artKey={secret.endedArtKey} caption="ตอนตื่น" />
          </div>
        </div>
      );
    default:
      return null;
  }
}
