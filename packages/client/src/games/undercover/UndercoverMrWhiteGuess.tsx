import { useState } from 'react';
import { Button, Input } from '../../components/ui';
import { ucRoleCardClass } from './roleStyles';

type Props = {
  onSubmit: (text: string) => void;
};

export function UndercoverMrWhiteGuess({ onSubmit }: Props) {
  const [text, setText] = useState('');

  return (
    <div className="card uc-panel uc-mr-white-guess">
      <div className={ucRoleCardClass('mr_white')}>
        <p className="uc-role-name">Mr. White ทายคำ</p>
        <p className="uc-role-hint">ทายคำลับของคนธรรมดา — ทายถูกชนะทันที!</p>
      </div>

      <Input
        label="คำตอบ"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="พิมพ์คำภาษาไทย"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && text.trim()) onSubmit(text.trim());
        }}
      />

      <div className="uc-actions">
        <Button variant="primary" disabled={!text.trim()} onClick={() => onSubmit(text.trim())}>
          ส่งคำตอบ
        </Button>
      </div>
    </div>
  );
}
