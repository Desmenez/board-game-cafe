import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_SPECIAL_ABILITIES,
  defaultSkyTeamLobbyOptions,
  getSkyTeamLobbyValidationErrors,
  isSkyTeamLobbyOptionsValid,
  parseSkyTeamLobbyOptions,
  type SkyTeamSpecialAbilityId,
} from 'shared';

describe('Sky Team lobby options (Milestone 1)', () => {
  it('defaults to no modules and no abilities', () => {
    const opts = defaultSkyTeamLobbyOptions();
    assert.deepEqual(opts.enabledModules, []);
    assert.deepEqual(opts.selectedSpecialAbilityIds, []);
    assert.equal(isSkyTeamLobbyOptionsValid(opts), true);
  });

  it('rejects kerosene + kerosene-leak together', () => {
    const opts = parseSkyTeamLobbyOptions({
      enabledModules: ['kerosene', 'kerosene-leak'],
      selectedSpecialAbilityIds: [],
    });
    const errors = getSkyTeamLobbyValidationErrors(opts);
    assert.ok(errors.some((e) => /Kerosene/.test(e)));
    assert.equal(isSkyTeamLobbyOptionsValid(opts), false);
  });

  it('rejects more than MAX_SPECIAL_ABILITIES', () => {
    const ids = Array.from(
      { length: MAX_SPECIAL_ABILITIES + 1 },
      () => 'engine-synchronisation' as SkyTeamSpecialAbilityId,
    );
    const forced = {
      ...defaultSkyTeamLobbyOptions(),
      selectedSpecialAbilityIds: ids,
    };
    assert.ok(getSkyTeamLobbyValidationErrors(forced).length > 0);
  });

  it('accepts a valid module set', () => {
    const opts = parseSkyTeamLobbyOptions({
      enabledModules: ['traffic-die', 'wind', 'ice-brakes'],
      selectedSpecialAbilityIds: ['engine-synchronisation'],
    });
    assert.equal(isSkyTeamLobbyOptionsValid(opts), true);
    assert.deepEqual(opts.enabledModules, ['traffic-die', 'wind', 'ice-brakes']);
  });

  it('drops unknown module ids', () => {
    const opts = parseSkyTeamLobbyOptions({
      enabledModules: ['traffic-die', 'not-a-module', 42],
    });
    assert.deepEqual(opts.enabledModules, ['traffic-die']);
  });
});
