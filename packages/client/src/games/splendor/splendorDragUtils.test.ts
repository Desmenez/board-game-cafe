import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SplendorGems } from 'shared';
import {
  applyBankGemToTakeDraft,
  applyPlayerTokenReturn,
  removePlayerTokenReturn,
  takeGemsActionFromDraft,
  validateTakeGemsConfirm,
} from './splendorDragUtils.ts';

function bank(overrides: Partial<SplendorGems> = {}): SplendorGems {
  return { white: 4, blue: 4, green: 4, red: 4, black: 4, ...overrides };
}

describe('applyBankGemToTakeDraft', () => {
  it('adds a second same-color gem to the draft when the bank has 4+', () => {
    const first = applyBankGemToTakeDraft([], 'white', bank());
    assert.equal(first.ok, true);
    assert.equal(first.ok && first.action, 'add');
    const draft = first.ok && first.action === 'add' ? first.draft : [];

    const second = applyBankGemToTakeDraft(draft, 'white', bank());
    assert.deepEqual(second, { ok: true, action: 'add', draft: ['white', 'white'] });
  });

  it('does not auto-take two gems — confirm is required', () => {
    const result = applyBankGemToTakeDraft(['white'], 'white', bank());
    assert.notEqual(result.ok && 'action' in result ? result.action : null, 'take_two');
  });

  it('rejects a second same-color gem when the bank has fewer than 4', () => {
    const result = applyBankGemToTakeDraft(['white'], 'white', bank({ white: 3 }));
    assert.equal(result.ok, false);
  });

  it('rejects mixing a take-two draft with another color', () => {
    const result = applyBankGemToTakeDraft(['white', 'white'], 'blue', bank());
    assert.equal(result.ok, false);
  });
});

describe('takeGemsActionFromDraft', () => {
  it('sends take_two only after confirm of two matching gems', () => {
    assert.deepEqual(takeGemsActionFromDraft(['white', 'white']), {
      type: 'take_two',
      color: 'white',
    });
  });

  it('sends take_gems for distinct colors', () => {
    assert.deepEqual(takeGemsActionFromDraft(['white', 'blue']), {
      type: 'take_gems',
      colors: ['white', 'blue'],
    });
  });
});

describe('validateTakeGemsConfirm', () => {
  it('allows two of the same color', () => {
    assert.equal(validateTakeGemsConfirm(['white', 'white']), null);
  });
});

function emptyReturnDraft() {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 };
}

describe('applyPlayerTokenReturn', () => {
  it('adds a gem to the return draft when under the excess', () => {
    const result = applyPlayerTokenReturn(
      emptyReturnDraft(),
      'red',
      { white: 0, blue: 0, green: 1, red: 3, black: 0 },
      0,
      1,
    );
    assert.deepEqual(result, { ok: true, draft: { ...emptyReturnDraft(), red: 1 } });
  });

  it('rejects when the return draft already matches excess', () => {
    const result = applyPlayerTokenReturn(
      { ...emptyReturnDraft(), red: 1 },
      'green',
      { white: 0, blue: 0, green: 1, red: 3, black: 0 },
      0,
      1,
    );
    assert.equal(result.ok, false);
  });
});

describe('removePlayerTokenReturn', () => {
  it('removes a gem from the return draft', () => {
    const result = removePlayerTokenReturn({ ...emptyReturnDraft(), red: 2 }, 'red');
    assert.deepEqual(result, { ok: true, draft: { ...emptyReturnDraft(), red: 1 } });
  });

  it('rejects removing a gem that was not selected', () => {
    const result = removePlayerTokenReturn(emptyReturnDraft(), 'red');
    assert.equal(result.ok, false);
  });
});
