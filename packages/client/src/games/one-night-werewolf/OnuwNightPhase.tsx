import type { OnuwAction, OnuwPlayerView } from 'shared';
import { ONUW_ROLE_DESCRIPTION_TH } from 'shared';
import { OnuwNightActions } from './OnuwNightActions';
import { OnuwNightScheduleStrip } from './OnuwNightScheduleStrip';
import { NightSecretVisual } from './OnuwNightSecretVisual';
import { ROLE_LABEL_TH } from './onuwRoles';
import { onuwRoleCardUrl } from '../../imageMap';

type Props = {
  gs: OnuwPlayerView;
  myId: string;
  nightList: NonNullable<OnuwPlayerView['nightSteps']>;
  nightCurIdx: number;
  sendAction: (action: OnuwAction) => void;
};

export function OnuwNightPhase({ gs, myId, nightList, nightCurIdx, sendAction }: Props) {
  return (
    <section className="onuw-stage card onuw-night-stage">
      <header className="onuw-phase-banner onuw-phase-banner--night">
        <span className="onuw-phase-banner-kicker">ช่วงเกม</span>
        <span className="onuw-phase-banner-title">กลางคืน</span>
      </header>

      {nightList.length > 0 ? (
        <section
          className="onuw-night-block onuw-night-block--schedule"
          aria-labelledby="onuw-night-schedule-heading"
        >
          <h3 id="onuw-night-schedule-heading" className="onuw-night-block-title">
            ลำดับแอ็กชันกลางคืน
          </h3>
          <p className="onuw-night-block-lead">เวลานับถอยหลังอยู่ใต้การ์ดแต่ละขั้น</p>
          <OnuwNightScheduleStrip
            nightList={nightList}
            nightCurIdx={nightCurIdx}
            endsAtMs={gs.nightStepEndsAtMs}
            rolesInPlay={gs.rolesInPlay}
          />
        </section>
      ) : null}

      <section
        className="onuw-night-block onuw-night-block--intel-actions"
        aria-labelledby="onuw-night-intel-heading"
      >
        <h3 id="onuw-night-intel-heading" className="onuw-night-block-title">
          การ์ดและข้อมูลที่คุณรู้
        </h3>
        <p className="onuw-night-block-lead">การ์ดเริ่มต้น · ข้อมูลล่าสุดจากขั้นที่ผ่านมา</p>

        <div className="onuw-night-play-layout">
          {gs.myRole != null && gs.myRoleArtKey != null ? (
            <aside className="onuw-night-my-role">
              <h4 className="onuw-night-my-role-title">การ์ดของคุณในตอนแรก</h4>
              <div className="onuw-night-my-role-card">
                <img
                  src={onuwRoleCardUrl(gs.myRoleArtKey)}
                  alt=""
                  className="onuw-night-my-role-img"
                  decoding="async"
                />
              </div>
              <p className="onuw-night-my-role-name">{ROLE_LABEL_TH[gs.myRole]}</p>
              <p className="onuw-night-my-role-desc">
                {gs.myRoleDescriptionTh ?? ONUW_ROLE_DESCRIPTION_TH[gs.myRole]}
              </p>
            </aside>
          ) : null}
          <div className="onuw-night-play-intel">
            {gs.nightSecretView ? (
              <div className="onuw-secret-panel">
                <p className="onuw-secret-panel-title">การ์ด / ข้อมูลล่าสุดที่คุณรู้</p>
                <NightSecretVisual secret={gs.nightSecretView} />
              </div>
            ) : (
              <div className="onuw-night-intel-placeholder">
                <p>
                  {gs.myRole != null && gs.myRoleArtKey != null
                    ? 'ยังไม่มีข้อมูลใหม่จากขั้นกลางคืนในตอนนี้ — ดูการ์ดเริ่มต้นจากคอลัมน์ด้านซ้าย'
                    : 'หลังคุณทำขั้นตอนหรือได้รับข้อมูล การ์ดและข้อความจะแสดงที่นี่'}
                </p>
              </div>
            )}
            <div className="onuw-night-block-actions onuw-night-block-actions--in-intel-column">
              <h4 className="onuw-night-block-subtitle" id="onuw-night-action-heading">
                แอ็กชันในขั้นนี้
              </h4>
              {gs.nightPromptTh ? <p className="onuw-night-prompt-line">{gs.nightPromptTh}</p> : null}
              {!(gs.nightActors ?? []).includes(myId) ? (
                <p className="onuw-night-wait-banner">
                  รอขั้นนี้จบ — <strong>อย่าให้ใครเห็นหน้าจอของคุณ</strong>
                </p>
              ) : null}
              <OnuwNightActions gs={gs} myId={myId} sendAction={sendAction} />
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
