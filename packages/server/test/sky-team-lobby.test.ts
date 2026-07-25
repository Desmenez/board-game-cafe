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

  it('LHR Heathrow green scenario matches printed strip', () => {
    const lhr = getSkyTeamScenario('lhr');
    assert.equal(lhr.code, 'LHR');
    assert.equal(lhr.tier, 'green');
    assert.equal(lhr.countryCode, 'gb');
    assert.equal(lhr.spaces.length, 6);
    assert.deepEqual(
      lhr.spaces.map((s) => s.traffic),
      [0, 1, 1, 2, 2, 2],
    );
    assert.equal(lhr.spaces[0]?.base, 'cloud');
    assert.equal(lhr.spaces[5]?.base, 'airport');
    assert.deepEqual(
      lhr.spaces.map((s) => s.trafficDieRolls ?? 0),
      [1, 0, 1, 0, 1, 0],
    );
    assert.deepEqual(lhr.modules, ['traffic-die']);
    assert.deepEqual(lhr.specialAbilityIds, []);
  });

  it('parse accepts lhr and enables Traffic Die from scenario', () => {
    const opts = parseSkyTeamLobbyOptions({ scenarioId: 'lhr' });
    assert.equal(opts.scenarioId, 'lhr');
    assert.deepEqual(opts.enabledModules, ['traffic-die']);
  });

  it('HND Haneda green scenario matches printed strip', () => {
    const hnd = getSkyTeamScenario('hnd');
    assert.equal(hnd.code, 'HND');
    assert.equal(hnd.tier, 'green');
    assert.equal(hnd.countryCode, 'jp');
    assert.equal(hnd.spaces.length, 8);
    assert.deepEqual(
      hnd.spaces.map((s) => s.traffic),
      [0, 1, 1, 2, 1, 0, 2, 1],
    );
    assert.equal(hnd.spaces[0]?.base, 'cloud');
    assert.equal(hnd.spaces[0]?.trafficDieRolls, 2);
    assert.equal(hnd.spaces[7]?.base, 'airport');
    assert.deepEqual(hnd.spaces[2]?.allowedAxisPositions, [-1, 0]);
    assert.deepEqual(hnd.spaces[4]?.allowedAxisPositions, [-2, -1]);
    assert.deepEqual(hnd.spaces[5]?.allowedAxisPositions, [-2, -1, 0]);
    assert.deepEqual(hnd.modules, ['traffic-die', 'turns']);
    assert.deepEqual(hnd.specialAbilityIds, []);
  });

  it('parse accepts hnd and enables Traffic Die + Turns from scenario', () => {
    const opts = parseSkyTeamLobbyOptions({ scenarioId: 'hnd' });
    assert.equal(opts.scenarioId, 'hnd');
    assert.deepEqual(opts.enabledModules, ['traffic-die', 'turns']);
  });

  it('OSL Gardermoen green scenario matches printed strip', () => {
    const osl = getSkyTeamScenario('osl');
    assert.equal(osl.code, 'OSL');
    assert.equal(osl.tier, 'green');
    assert.equal(osl.countryCode, 'no');
    assert.equal(osl.spaces.length, 8);
    assert.deepEqual(
      osl.spaces.map((s) => s.traffic),
      [0, 0, 1, 0, 1, 1, 1, 0],
    );
    assert.equal(osl.spaces[0]?.base, 'cloud');
    assert.equal(osl.spaces[0]?.trafficDieRolls, 2);
    assert.equal(osl.spaces[3]?.trafficDieRolls, 1);
    assert.equal(osl.spaces[7]?.base, 'airport');
    assert.deepEqual(osl.modules, ['traffic-die', 'kerosene']);
    assert.deepEqual(osl.specialAbilityIds, []);
  });

  it('parse accepts osl and enables Traffic Die + Kerosene from scenario', () => {
    const opts = parseSkyTeamLobbyOptions({ scenarioId: 'osl' });
    assert.equal(opts.scenarioId, 'osl');
    assert.deepEqual(opts.enabledModules, ['traffic-die', 'kerosene']);
  });

  it('ATL Hartsfield-Jackson green scenario matches printed strip', () => {
    const atl = getSkyTeamScenario('atl');
    assert.equal(atl.code, 'ATL');
    assert.equal(atl.tier, 'green');
    assert.equal(atl.countryCode, 'us');
    assert.equal(atl.spaces.length, 8);
    assert.deepEqual(
      atl.spaces.map((s) => s.traffic),
      [0, 0, 0, 0, 1, 2, 1, 2],
    );
    assert.equal(atl.spaces[0]?.base, 'cloud');
    assert.equal(atl.spaces[0]?.trafficDieRolls, 4);
    assert.equal(atl.spaces[2]?.trafficDieRolls, 1);
    assert.equal(atl.spaces[4]?.trafficDieRolls, 1);
    assert.equal(atl.spaces[5]?.trafficDieRolls, 1);
    assert.equal(atl.spaces[7]?.base, 'airport');
    assert.deepEqual(atl.modules, ['traffic-die', 'intern']);
    assert.deepEqual(atl.specialAbilityIds, []);
  });

  it('parse accepts atl and enables Traffic Die + Intern from scenario', () => {
    const opts = parseSkyTeamLobbyOptions({ scenarioId: 'atl' });
    assert.equal(opts.scenarioId, 'atl');
    assert.deepEqual(opts.enabledModules, ['traffic-die', 'intern']);
  });

  it('PRG Václav Havel green scenario matches printed strip', () => {
    const prg = getSkyTeamScenario('prg');
    assert.equal(prg.code, 'PRG');
    assert.equal(prg.tier, 'green');
    assert.equal(prg.countryCode, 'cz');
    assert.equal(prg.spaces.length, 8);
    assert.deepEqual(
      prg.spaces.map((s) => s.traffic),
      [0, 0, 1, 1, 0, 1, 1, 1],
    );
    assert.equal(prg.spaces[0]?.base, 'cloud');
    assert.equal(prg.spaces[0]?.trafficDieRolls, 1);
    assert.equal(prg.spaces[2]?.trafficDieRolls, 1);
    assert.equal(prg.spaces[5]?.trafficDieRolls, 1);
    assert.deepEqual(prg.spaces[1]?.allowedAxisPositions, [0, 1, 2]);
    assert.deepEqual(prg.spaces[3]?.allowedAxisPositions, [1, 2]);
    assert.equal(prg.spaces[7]?.base, 'airport');
    assert.deepEqual(prg.modules, ['traffic-die', 'turns', 'kerosene']);
    assert.equal(prg.specialAbilitySlots, 2);
    assert.deepEqual(prg.specialAbilityIds, []);
  });

  it('parse accepts prg and enables Traffic Die + Turns + Kerosene from scenario', () => {
    const opts = parseSkyTeamLobbyOptions({ scenarioId: 'prg' });
    assert.equal(opts.scenarioId, 'prg');
    assert.deepEqual(opts.enabledModules, ['traffic-die', 'turns', 'kerosene']);
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
