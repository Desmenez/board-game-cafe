import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultSkyTeamLobbyOptions,
  getSkyTeamLobbyValidationErrors,
  getSkyTeamScenario,
  isSkyTeamLobbyOptionsValid,
  parseSkyTeamLobbyOptions,
} from 'shared';

describe('Sky Team lobby options (scenario-driven)', () => {
  it('defaults to YUL with no modules / abilities', () => {
    const opts = defaultSkyTeamLobbyOptions();
    assert.equal(opts.scenarioId, 'yul');
    assert.deepEqual(opts.enabledModules, []);
    assert.deepEqual(opts.selectedSpecialAbilityIds, []);
    assert.equal(opts.pilotMode, 'random');
    assert.equal(isSkyTeamLobbyOptionsValid(opts), true);
  });

  it('derives modules from scenario and ignores client module lists', () => {
    const opts = parseSkyTeamLobbyOptions({
      scenarioId: 'yul',
      enabledModules: ['traffic-die', 'wind', 'ice-brakes'],
      selectedSpecialAbilityIds: ['mastery'],
      pilotMode: 'manual',
      pilotPlayerId: 'p1',
    });
    assert.equal(opts.scenarioId, 'yul');
    assert.deepEqual(opts.enabledModules, []);
    assert.deepEqual(opts.selectedSpecialAbilityIds, []);
    assert.equal(opts.pilotMode, 'manual');
    assert.equal(opts.pilotPlayerId, 'p1');
  });

  it('falls back to yul for unknown scenario id', () => {
    const opts = parseSkyTeamLobbyOptions({ scenarioId: 'not-real' });
    assert.equal(opts.scenarioId, 'yul');
  });

  it('YUL green scenario has routine approach traffic from strip', () => {
    const yul = getSkyTeamScenario('yul');
    assert.equal(yul.tier, 'green');
    assert.equal(yul.tierLabel, 'Routine Landing');
    assert.equal(yul.spaces.length, 7);
    assert.deepEqual(
      yul.spaces.map((s) => s.traffic),
      [0, 0, 1, 2, 1, 3, 2],
    );
    assert.equal(yul.spaces[6]?.base, 'airport');
    assert.deepEqual(yul.modules, []);
    assert.deepEqual(yul.specialAbilityIds, []);
  });

  it('rejects invalid forced options with missing scenario', () => {
    const forced = {
      ...defaultSkyTeamLobbyOptions(),
      scenarioId: 'missing',
    };
    assert.ok(getSkyTeamLobbyValidationErrors(forced).length > 0);
  });

  it('rejects manual pilot without player id', () => {
    const opts = parseSkyTeamLobbyOptions({
      scenarioId: 'yul',
      pilotMode: 'manual',
    });
    assert.equal(opts.pilotMode, 'manual');
    assert.equal(opts.pilotPlayerId, undefined);
    assert.ok(getSkyTeamLobbyValidationErrors(opts).some((e) => /Pilot/.test(e)));
  });
});
