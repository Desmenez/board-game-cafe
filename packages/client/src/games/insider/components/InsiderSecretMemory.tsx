type Props = {
  secretWord: string;
  categoryLabel?: string;
};

export function InsiderSecretMemory({ secretWord, categoryLabel }: Props) {
  return (
    <div className="card insider-secret-memory" aria-label="อ้างอิงคำลับ (กันลืม)">
      <div className="insider-secret-memory-kicker">คำลับของรอบนี้</div>
      {categoryLabel != null && <p className="insider-secret-memory-cat">หมวด: {categoryLabel}</p>}
      <p className="insider-secret-memory-word">{secretWord}</p>
    </div>
  );
}
