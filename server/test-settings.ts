/**
 * Automated tests for Issue #10: Custom Game Settings
 * Tests settings validation, configurable timer, auto-advance, public voting, allow skip, and persistence.
 */
import { GameManager } from './src/gameManager.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function section(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 ${title}`);
  console.log('='.repeat(60));
}

/** Helper: create a game with N players, word set, all roles revealed → clues phase */
function setupGame(numPlayers: number, settingsOverrides: Record<string, unknown> = {}) {
  const gm = new GameManager();
  const hostId = 'host-1';
  const game = gm.createGame(hostId, 'sock-host', 'Host');

  // Add players
  const playerIds: string[] = [hostId];
  for (let i = 2; i <= numPlayers; i++) {
    const pid = `player-${i}`;
    gm.addPlayer(game.code, pid, `sock-${i}`, `Player${i}`);
    playerIds.push(pid);
  }

  // Apply settings overrides via updateSettings
  if (Object.keys(settingsOverrides).length > 0) {
    gm.updateSettings(hostId, game.code, settingsOverrides);
  }

  // Start game
  gm.startGame(hostId, game.code);

  // Set word (assigns impostor)
  gm.setWord(hostId, game.code, 'banana');

  // Mark all roles ready -> transitions to 'clues'
  for (const pid of playerIds) {
    gm.markRoleReady(pid, game.code);
  }

  return { gm, game: gm.getGame(game.code)!, playerIds, code: game.code };
}

/** Helper: submit all clues */
function submitAllClues(gm: GameManager, code: string, game: ReturnType<typeof gm.getGame>) {
  if (!game) return;
  const activePlayers = game.players.filter((p) => !p.isEliminated && !p.isSpectator);
  for (const player of activePlayers) {
    if (game.turnIndex < activePlayers.length) {
      gm.submitClue(player.id, code, `clue-${player.name}`);
    }
  }
}

/** Helper: everyone votes for a target */
function everyoneVotesFor(gm: GameManager, code: string, game: ReturnType<typeof gm.getGame>, targetId: string) {
  if (!game) return;
  const activePlayers = game.players.filter((p) => !p.isEliminated && !p.isSpectator);
  for (const player of activePlayers) {
    if (player.id !== targetId) {
      gm.vote(player.id, code, targetId);
    } else {
      const other = activePlayers.find((p) => p.id !== targetId);
      if (other) gm.vote(player.id, code, other.id);
    }
  }
}

// ==================================================================
// TEST 1: Settings validation — host-only, lobby-only, valid values
// ==================================================================
section('Test 1: Settings validation');
{
  const gm = new GameManager();
  const game = gm.createGame('host', 'sock', 'Host');
  gm.addPlayer(game.code, 'p2', 'sock2', 'Player2');
  gm.addPlayer(game.code, 'p3', 'sock3', 'Player3');

  // Default settings
  assert(game.settings.clueTimer === 30, 'Default clueTimer is 30');
  assert(game.settings.votingStyle === 'anonymous', 'Default votingStyle is anonymous');
  assert(game.settings.maxRounds === 1, 'Default maxRounds is 1');
  assert(game.settings.allowSkip === true, 'Default allowSkip is true');

  // Host can update settings
  const r1 = gm.updateSettings('host', game.code, { clueTimer: 45 });
  assert(!r1.error, 'Host can update settings');
  assert(game.settings.clueTimer === 45, 'clueTimer updated to 45');

  // Non-host cannot update
  const r2 = gm.updateSettings('p2', game.code, { clueTimer: 15 });
  assert(r2.error === 'not_host', 'Non-host cannot update settings');
  assert(game.settings.clueTimer === 45, 'clueTimer unchanged after non-host attempt');

  // Invalid clueTimer value
  const r3 = gm.updateSettings('host', game.code, { clueTimer: 25 as any });
  assert(r3.error === 'invalid_setting', 'Invalid clueTimer rejected');

  // Invalid votingStyle value
  const r4 = gm.updateSettings('host', game.code, { votingStyle: 'secret' as any });
  assert(r4.error === 'invalid_setting', 'Invalid votingStyle rejected');

  // Invalid maxRounds value
  const r5 = gm.updateSettings('host', game.code, { maxRounds: 5 as any });
  assert(r5.error === 'invalid_setting', 'Invalid maxRounds rejected');

  // Valid values accepted
  const r6 = gm.updateSettings('host', game.code, {
    clueTimer: 0,
    votingStyle: 'public',
    maxRounds: 3,
    allowSkip: false,
  });
  assert(!r6.error, 'Multiple valid settings accepted');
  assert(game.settings.clueTimer === 0, 'clueTimer set to 0 (unlimited)');
  assert(game.settings.votingStyle === 'public', 'votingStyle set to public');
  assert(game.settings.maxRounds === 3, 'maxRounds set to 3');
  assert(game.settings.allowSkip === false, 'allowSkip set to false');

  // Cannot update outside lobby
  gm.startGame('host', game.code);
  const r7 = gm.updateSettings('host', game.code, { clueTimer: 30 });
  assert(r7.error === 'wrong_phase', 'Cannot update settings outside lobby');
}

// ==================================================================
// TEST 2: Configurable timer — turnDeadline matches clueTimer
// ==================================================================
section('Test 2: Configurable timer');
{
  // Test with 15s timer
  const { gm, game, code } = setupGame(3, { clueTimer: 15 });

  assert(game.phase === 'clues', 'Game in clues phase');
  assert(game.settings.clueTimer === 15, 'clueTimer is 15');

  // Set a turn timer
  let timerFired = false;
  gm.setTurnTimer(code, () => { timerFired = true; });

  assert(game.turnDeadline !== null, 'turnDeadline is set');
  const expectedDeadline = Date.now() + 15000;
  const diff = Math.abs((game.turnDeadline ?? 0) - expectedDeadline);
  assert(diff < 200, `turnDeadline approximately matches 15s from now (diff: ${diff}ms)`);

  gm.clearTurnTimer(code);
}

// ==================================================================
// TEST 3: Unlimited timer (clueTimer = 0) — no timer set
// ==================================================================
section('Test 3: Unlimited timer (clueTimer = 0)');
{
  const { gm, game, code } = setupGame(3, { clueTimer: 0 });

  assert(game.settings.clueTimer === 0, 'clueTimer is 0 (unlimited)');

  // Set a turn timer — should NOT set deadline
  let timerFired = false;
  gm.setTurnTimer(code, () => { timerFired = true; });

  assert(game.turnDeadline === null, 'No turnDeadline for unlimited timer');

  // Timer shouldn't fire (clear just in case)
  gm.clearTurnTimer(code);
}

// ==================================================================
// TEST 4: Max rounds auto-advance (maxRounds = 2)
// ==================================================================
section('Test 4: Max rounds auto-advance');
{
  const { gm, game, playerIds, code } = setupGame(3, { maxRounds: 2 });

  assert(game.settings.maxRounds === 2, 'maxRounds is 2');
  assert(game.phase === 'clues', 'Starts in clues');
  assert(game.round === 1, 'Round starts at 1');

  // Submit all clues for round 1
  submitAllClues(gm, code, game);
  const activePlayers = game.players.filter((p) => !p.isEliminated && !p.isSpectator);
  assert(game.turnIndex >= activePlayers.length, 'All players have given clues');

  // Auto-advance: call autoNextRound
  gm.autoNextRound(code);
  assert(game.round === 2, 'Round auto-advanced to 2');
  assert(game.turnIndex === 0, 'turnIndex reset to 0');

  // Players should have their clues cleared
  const cluesCleared = game.players.every((p) => p.isSpectator || p.clue === null);
  assert(cluesCleared, 'Clues cleared for round 2');

  // Submit all clues for round 2
  submitAllClues(gm, code, game);

  // Now auto-start voting since round >= maxRounds
  gm.autoStartVoting(code);
  assert(game.phase === 'voting', 'Auto-transitioned to voting after maxRounds');
  assert(Object.keys(game.votes).length === 0, 'Votes reset for voting phase');
}

// ==================================================================
// TEST 5: Max rounds = 1 — host manual control preserved
// ==================================================================
section('Test 5: Max rounds = 1 (manual host control)');
{
  const { gm, game, playerIds, code } = setupGame(3, { maxRounds: 1 });

  assert(game.settings.maxRounds === 1, 'maxRounds is 1');
  submitAllClues(gm, code, game);

  // Host should still have manual control — test startVoting
  const r = gm.startVoting('host-1', code);
  assert(!r.error, 'Host can manually start voting with maxRounds=1');
  assert(game.phase === 'voting', 'Phase is voting');
}

// ==================================================================
// TEST 6: Host can manually nextRound / startVoting with maxRounds=1
// ==================================================================
section('Test 6: Manual nextRound with maxRounds=1');
{
  const { gm, game, playerIds, code } = setupGame(3, { maxRounds: 1 });

  submitAllClues(gm, code, game);

  // Host calls nextRound
  const r = gm.nextRound('host-1', code);
  assert(!r.error, 'Host can call nextRound with maxRounds=1');
  assert(game.round === 2, 'Round incremented to 2');
  assert(game.phase === 'clues', 'Still in clues phase');
}

// ==================================================================
// TEST 7: Public voting — votes visible during voting phase
// ==================================================================
section('Test 7: Public voting');
{
  const { gm, game, playerIds, code } = setupGame(4, { votingStyle: 'public' });

  assert(game.settings.votingStyle === 'public', 'votingStyle is public');

  submitAllClues(gm, code, game);
  gm.startVoting('host-1', code);
  assert(game.phase === 'voting', 'In voting phase');

  // Player 2 votes for player 3
  gm.vote('player-2', code, 'player-3');

  // Get personalized state for player 4 (hasn't voted yet)
  const state = gm.getPersonalizedState(game, 'player-4');
  assert(state.votes['player-2'] === 'player-3', 'Public voting: can see who player-2 voted for');

  // Get personalized state for host
  const hostState = gm.getPersonalizedState(game, 'host-1');
  assert(hostState.votes['player-2'] === 'player-3', 'Host also sees public votes');
}

// ==================================================================
// TEST 8: Anonymous voting — votes hidden during voting phase
// ==================================================================
section('Test 8: Anonymous voting');
{
  const { gm, game, playerIds, code } = setupGame(4, { votingStyle: 'anonymous' });

  assert(game.settings.votingStyle === 'anonymous', 'votingStyle is anonymous');

  submitAllClues(gm, code, game);
  gm.startVoting('host-1', code);

  // Player 2 votes for player 3
  gm.vote('player-2', code, 'player-3');

  // Player 4 sees that player-2 voted but NOT for whom
  const state = gm.getPersonalizedState(game, 'player-4');
  assert(state.votes['player-2'] === '__voted__', 'Anonymous voting: vote target hidden');

  // Player 2 sees their own vote
  const voter = gm.getPersonalizedState(game, 'player-2');
  assert(voter.votes['player-2'] === 'player-3', 'Voter can see their own vote');
}

// ==================================================================
// TEST 9: Allow skip — skipTurn works when allowSkip=true
// ==================================================================
section('Test 9: Allow skip');
{
  const { gm, game, playerIds, code } = setupGame(3, { allowSkip: true });

  assert(game.settings.allowSkip === true, 'allowSkip is true');
  assert(game.phase === 'clues', 'In clues phase');

  const activePlayers = game.players.filter((p) => !p.isEliminated && !p.isSpectator);
  const firstPlayer = activePlayers[0];
  assert(game.turnIndex === 0, 'Turn index starts at 0');

  // Skip the first player's turn
  gm.skipTurn(code);
  assert(game.turnIndex === 1, 'Turn index advanced after skip');

  // The first player should not have a clue
  assert(firstPlayer.clue === null, 'Skipped player has no clue');
}

// ==================================================================
// TEST 10: Disallow skip — setting prevents skipping
// ==================================================================
section('Test 10: Disallow skip (allowSkip=false)');
{
  // The allowSkip setting is checked in handlers, not in skipTurn itself
  // But we test the setting is properly applied
  const gm = new GameManager();
  const game = gm.createGame('host', 'sock', 'Host');
  gm.addPlayer(game.code, 'p2', 'sock2', 'Player2');
  gm.addPlayer(game.code, 'p3', 'sock3', 'Player3');
  gm.updateSettings('host', game.code, { allowSkip: false });

  assert(game.settings.allowSkip === false, 'allowSkip is false');

  // Note: The actual skip prevention is in handlers.ts (game:skipMyTurn)
  // which checks game.settings.allowSkip before calling gm.skipTurn.
  // Here we verify the setting is stored correctly.
}

// ==================================================================
// TEST 11: Settings persist across playAgain
// ==================================================================
section('Test 11: Settings persist across playAgain');
{
  const { gm, game, playerIds, code } = setupGame(3, {
    clueTimer: 45,
    votingStyle: 'public',
    maxRounds: 2,
    allowSkip: false,
  });

  // Reach results
  submitAllClues(gm, code, game);
  gm.autoNextRound(code);
  submitAllClues(gm, code, game);
  gm.autoStartVoting(code);

  const nonImp = playerIds.find((id) => id !== game.impostorId)!;
  everyoneVotesFor(gm, code, game, game.impostorId!);

  // Guess phase
  if (game.phase === 'impostor-guess') {
    gm.guessWord(game.impostorId!, code, 'wrong');
  }

  assert(game.phase === 'results', 'Game in results');

  // Play again
  gm.playAgain('host-1', code);
  assert(game.phase === 'setup', 'Phase reset to setup');
  assert(game.settings.clueTimer === 45, 'clueTimer preserved');
  assert(game.settings.votingStyle === 'public', 'votingStyle preserved');
  assert(game.settings.maxRounds === 2, 'maxRounds preserved');
  assert(game.settings.allowSkip === false, 'allowSkip preserved');
}

// ==================================================================
// TEST 12: Presets (multiple settings at once)
// ==================================================================
section('Test 12: Presets (Classic + Extended)');
{
  const gm = new GameManager();
  const game = gm.createGame('host', 'sock', 'Host');

  // Apply "Extended" preset
  gm.updateSettings('host', game.code, {
    clueTimer: 45,
    votingStyle: 'public',
    maxRounds: 2,
    allowSkip: true,
    elimination: true,
  });
  assert(game.settings.clueTimer === 45, 'Extended: clueTimer=45');
  assert(game.settings.votingStyle === 'public', 'Extended: votingStyle=public');
  assert(game.settings.maxRounds === 2, 'Extended: maxRounds=2');
  assert(game.settings.allowSkip === true, 'Extended: allowSkip=true');
  assert(game.settings.elimination === true, 'Extended: elimination=true');

  // Apply "Classic" preset
  gm.updateSettings('host', game.code, {
    clueTimer: 30,
    votingStyle: 'anonymous',
    maxRounds: 1,
    allowSkip: true,
    elimination: false,
  });
  assert(game.settings.clueTimer === 30, 'Classic: clueTimer=30');
  assert(game.settings.votingStyle === 'anonymous', 'Classic: votingStyle=anonymous');
  assert(game.settings.maxRounds === 1, 'Classic: maxRounds=1');
  assert(game.settings.allowSkip === true, 'Classic: allowSkip=true');
  assert(game.settings.elimination === false, 'Classic: elimination=false');
}

// ==================================================================
// TEST 13: Settings visible in PersonalizedState
// ==================================================================
section('Test 13: Settings in PersonalizedState');
{
  const gm = new GameManager();
  const game = gm.createGame('host', 'sock', 'Host');
  gm.addPlayer(game.code, 'p2', 'sock2', 'Player2');

  gm.updateSettings('host', game.code, {
    clueTimer: 60,
    votingStyle: 'public',
    maxRounds: 3,
    allowSkip: false,
  });

  const g = gm.getGame(game.code)!;
  const state = gm.getPersonalizedState(g, 'host');
  assert(state.settings.clueTimer === 60, 'PersonalizedState has clueTimer=60');
  assert(state.settings.votingStyle === 'public', 'PersonalizedState has votingStyle=public');
  assert(state.settings.maxRounds === 3, 'PersonalizedState has maxRounds=3');
  assert(state.settings.allowSkip === false, 'PersonalizedState has allowSkip=false');

  // Non-host sees same settings
  const p2State = gm.getPersonalizedState(g, 'p2');
  assert(p2State.settings.clueTimer === 60, 'Non-host sees same settings');
}

// ==================================================================
// TEST 14: Timer with different values
// ==================================================================
section('Test 14: Timer values (15s, 30s, 45s, 60s)');
{
  for (const timer of [15, 30, 45, 60] as const) {
    const { gm, game, code } = setupGame(3, { clueTimer: timer });
    gm.setTurnTimer(code, () => {});

    assert(game.turnDeadline !== null, `turnDeadline set for ${timer}s`);
    const expectedMs = timer * 1000;
    const deadline = game.turnDeadline!;
    const diff = Math.abs(deadline - Date.now() - expectedMs);
    assert(diff < 200, `${timer}s timer: deadline matches (diff: ${diff}ms)`);

    gm.clearTurnTimer(code);
  }
}

// ==================================================================
// TEST 15: autoNextRound + autoStartVoting with elimination mode
// ==================================================================
section('Test 15: Auto-advance with elimination mode');
{
  const { gm, game, playerIds, code } = setupGame(5, {
    maxRounds: 2,
    elimination: true,
  });

  assert(game.settings.maxRounds === 2, 'maxRounds is 2');
  assert(game.settings.elimination === true, 'elimination is on');

  // Round 1 clues
  submitAllClues(gm, code, game);

  // Auto next round
  gm.autoNextRound(code);
  assert(game.round === 2, 'Round 2 after auto-advance');

  // Round 2 clues
  submitAllClues(gm, code, game);

  // Auto start voting after maxRounds
  gm.autoStartVoting(code);
  assert(game.phase === 'voting', 'Voting after maxRounds reached');

  // Vote out non-impostor → should go to elimination-results
  const nonImp = playerIds.find((id) => id !== game.impostorId && id !== 'host-1')!;
  everyoneVotesFor(gm, code, game, nonImp);
  assert(game.phase === 'elimination-results', 'Elimination mode: goes to elimination-results');
}

// ==================================================================
// SUMMARY
// ==================================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}
