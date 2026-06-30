import { CARD_BACK_URL, SPY_CARD_URL, spyfallLocationImage } from './cardMeta';

type Props = {
  isSpy: boolean;
  locationName?: string;
  roleName?: string;
  useRoles: boolean;
  faceDown?: boolean;
};

export function SpyfallRoleCard({ isSpy, locationName, roleName, useRoles, faceDown }: Props) {
  if (faceDown) {
    return (
      <div className="sf-role-card" aria-hidden>
        <img src={CARD_BACK_URL} alt="" />
      </div>
    );
  }

  if (isSpy) {
    return (
      <div className="sf-role-card sf-role-card--spy">
        <img src={SPY_CARD_URL} alt="Spy" />
        <div className="sf-role-card__body">
          <p className="sf-role-card__title">Spy</p>
          <p className="sf-role-card__subtitle">คุณไม่รู้สถานที่ — หาจากคำถาม</p>
        </div>
      </div>
    );
  }

  const locImg = locationName
    ? spyfallLocationImage(locationName.toLowerCase().replace(/\s+/g, '-'))
    : '';

  return (
    <div className="sf-role-card">
      {locImg ? <img src={locImg} alt={locationName ?? 'Location'} /> : null}
      <div className="sf-role-card__body">
        <p className="sf-role-card__title">{locationName ?? 'สถานที่'}</p>
        {useRoles && roleName ? (
          <p className="sf-role-card__subtitle">{roleName}</p>
        ) : (
          <p className="sf-role-card__subtitle">คุณอยู่ที่นี่</p>
        )}
      </div>
    </div>
  );
}
