interface Props {
  message: string;
}

/** Shared night-page waiting copy + bouncing dots. */
export function RoomWaitingIndicator({ message }: Props) {
  return (
    <div className="waiting-indicator">
      <p>{message}</p>
      <div className="waiting-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
