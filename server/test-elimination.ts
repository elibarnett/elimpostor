/**
 * Automated tests for Issue #12: Player Elimination Across Rounds
 * Tests all items from the PR test plan by exercising GameManager directly.
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

/** Helper: create a game with N players, elimination on, word set, all roles revealed */
function setupEliminationGame(numPlayers: number) {
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

  // Enable elimination mode
  gm.setElimination(hostId, game.code, true);

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
  const activePlayers = game.players.filter(p => !p.isEliminated && !p.isSpectator);
  for (const player of activePlayers) {
    if (game.turnIndex < activePlayers.length) {
      gm.submitClue(player.id, code, `clue-${player.name}`);
    }
  }
}

/** Helper: everyone votes for a target */
function everyoneVotesFor(gm: GameManager, code: string, game: ReturnType<typeof gm.getGame>, targetId: string) {
  if (!game) return;
  const activePlayers = game.players.filter(p => !p.isEliminated && !p.isSpectator);
  for (const player of activePlayers) {
    if (player.id !== targetId) {
      gm.vote(player.id, code, targetId);
    } else {
      // Can't vote for self — vote for someone else
      const other = activePlayers.find(p => p.id !== targetId && p.id !== game.impostorId);
      if (other) gm.vote(player.id, code, other.id);
    }
  }
}

// ==================================================================
// TEST 1: Toggle elimination mode in lobby
// ==================================================================
section('Test 1: Toggle elimination mode in lobby');
{
  const gm = new GameManager();
  const game = gm.createGame('host', 'sock', 'Host');

  assert(game.settings.elimination === false, 'Elimination defaults to false');
  assert(game.mode === 'online', 'Default mode is online');

  // Host can toggle
  const r1 = gm.setElimination('host', game.code, true);
  assert(r1.game?.settings.elimination === true, 'Host can enable elimination');

  const r2 = gm.setElimination('host', game.code, false);
  assert(r2.game?.settings.elimination === false, 'Host can disable elimination');

  // Non-host cannot toggle
  gm.addPlayer(game.code, 'p2', 'sock2', 'Player2');
  const r3 = gm.setElimination('p2', game.code, true);
  assert(r3.error === 'not_host', 'Non-host cannot toggle elimination');

  // Cannot toggle outside lobby
  gm.addPlayer(game.code, 'p3', 'sock3', 'Player3');
  gm.setElimination('host', game.code, true);
  gm.startGame('host', game.code);
  const r4 = gm.setElimination('host', game.code, false);
  assert(r4.error === 'wrong_phase', 'Cannot toggle elimination outside lobby');

  // Verify personalized state includes elimination setting
  const g = gm.getGame(game.code)!;
  const state = gm.getPersonalizedState(g, 'host');
  assert(state.settings.elimination === true, 'PersonalizedState includes elimination setting');
}

// ==================================================================
// TEST 2: Full elimination round loop
// ==================================================================
section('Test 2: Full round loop (clues → voting → elimination → clues)');
{
  const { gm, game, playerIds, code } = setupEliminationGame(5);

  assert(game.phase === 'clues', 'Game starts in clues phase');
  assert(game.settings.elimination === true, 'Elimination is enabled');

  // Find a non-impostor to eliminate
  const nonImpostorId = playerIds.find(id => id !== game.impostorId && id !== 'host-1')!;

  // Submit all clues
  submitAllClues(gm, code, game);

  // Host starts voting
  gm.startVoting('host-1', code);
  assert(game.phase === 'voting', 'Phase transitions to voting');

  // Everyone votes for the non-impostor
  everyoneVotesFor(gm, code, game, nonImpostorId);

  assert(game.phase === 'elimination-results', 'Phase transitions to elimination-results');
  assert(game.lastEliminatedId === nonImpostorId, 'Correct player is marked as last eliminated');

  const eliminatedPlayer = game.players.find(p => p.id === nonImpostorId)!;
  assert(eliminatedPlayer.isEliminated === true, 'Eliminated player has isEliminated=true');
  assert(game.eliminationHistory.length === 1, 'Elimination history has 1 entry');
  assert(game.eliminationHistory[0].playerId === nonImpostorId, 'History records correct player');
  assert(game.eliminationHistory[0].round === 1, 'History records correct round');

  // Verify votes are visible in personalized state during elimination-results
  const state = gm.getPersonalizedState(game, 'host-1');
  assert(Object.keys(state.votes).length > 0, 'Votes are visible during elimination-results');
  assert(state.eliminationHistory.length === 1, 'PersonalizedState includes elimination history');
  assert(state.lastEliminatedId === nonImpostorId, 'PersonalizedState includes lastEliminatedId');

  // Host continues → back to clues
  const r = gm.continueAfterElimination('host-1', code);
  assert(!r.error, 'Host can continue after elimination');
  assert(game.phase === 'clues', 'Phase loops back to clues');
  assert(game.round === 2, 'Round incremented to 2');
  assert(game.votes && Object.keys(game.votes).length === 0, 'Votes reset for new round');
  assert(game.lastEliminatedId === null, 'lastEliminatedId reset');

  // Eliminated player still in game but excluded from active
  const activePlayers = game.players.filter(p => !p.isEliminated && !p.isSpectator);
  assert(!activePlayers.find(p => p.id === nonImpostorId), 'Eliminated player not in active players');
  assert(activePlayers.length === 4, '4 active players remain');
}

// ==================================================================
// TEST 3: Eliminated players cannot vote or submit clues
// ==================================================================
section('Test 3: Eliminated player restrictions');
{
  const { gm, game, playerIds, code } = setupEliminationGame(5);
  const nonImpostorId = playerIds.find(id => id !== game.impostorId && id !== 'host-1')!;

  // Eliminate a player
  submitAllClues(gm, code, game);
  gm.startVoting('host-1', code);
  everyoneVotesFor(gm, code, game, nonImpostorId);
  gm.continueAfterElimination('host-1', code);

  // Now in round 2 clues — eliminated player tries to submit clue
  const clueResult = gm.submitClue(nonImpostorId, code, 'sneaky');
  assert(clueResult.error === 'not_your_turn', 'Eliminated player cannot submit clue (not in turn order)');

  // Fast-forward to voting again
  submitAllClues(gm, code, game);
  gm.startVoting('host-1', code);

  // Eliminated player tries to vote
  const activePlayers = game.players.filter(p => !p.isEliminated && !p.isSpectator);
  const someActiveId = activePlayers.find(p => p.id !== nonImpostorId)!.id;
  const voteResult = gm.vote(nonImpostorId, code, someActiveId);
  assert(voteResult.error === 'eliminated_cannot_act', 'Eliminated player cannot vote');

  // Active player tries to vote for eliminated player
  const voteElimResult = gm.vote(activePlayers[0].id, code, nonImpostorId);
  assert(voteElimResult.error === 'cannot_vote_eliminated', 'Cannot vote for eliminated player');

  // Verify personalized state for eliminated player
  const elimState = gm.getPersonalizedState(game, nonImpostorId);
  const meInState = elimState.players.find(p => p.id === nonImpostorId);
  assert(meInState?.isEliminated === true, 'Eliminated player sees themselves as eliminated in state');
}

// ==================================================================
// TEST 4: Game ends when impostor is voted out (with guess phase)
// ==================================================================
section('Test 4: Impostor elimination → guess phase → results');
{
  const { gm, game, playerIds, code } = setupEliminationGame(5);
  const impostorId = game.impostorId!;

  // Round 1: eliminate a non-impostor first
  const nonImpostorId = playerIds.find(id => id !== impostorId && id !== 'host-1')!;
  submitAllClues(gm, code, game);
  gm.startVoting('host-1', code);
  everyoneVotesFor(gm, code, game, nonImpostorId);
  assert(game.phase === 'elimination-results', 'Round 1: non-impostor eliminated');
  gm.continueAfterElimination('host-1', code);

  // Round 2: now vote out the impostor
  submitAllClues(gm, code, game);
  gm.startVoting('host-1', code);
  everyoneVotesFor(gm, code, game, impostorId);

  assert(game.phase === 'impostor-guess', 'Impostor caught → impostor-guess phase');
  assert(game.lastEliminatedId === impostorId, 'Impostor is the last eliminated');

  // Impostor guesses wrong
  gm.guessWord(impostorId, code, 'apple');
  assert(game.phase === 'results', 'Wrong guess → results phase');
  assert(game.impostorGuessCorrect === false, 'Guess marked incorrect');
}

// ==================================================================
// TEST 5: Impostor wins when only 2 players remain
// ==================================================================
section('Test 5: Impostor wins by survival (2 players remaining)');
{
  // 4 players: need to eliminate 1 non-impostor to leave 3, then another to leave 2
  const { gm, game, playerIds, code } = setupEliminationGame(4);
  const impostorId = game.impostorId!;

  // Find two non-impostors (excluding host)
  const nonImpostors = playerIds.filter(id => id !== impostorId);

  // Round 1: eliminate first non-impostor
  const target1 = nonImpostors.find(id => id !== 'host-1')!;
  submitAllClues(gm, code, game);
  gm.startVoting('host-1', code);
  everyoneVotesFor(gm, code, game, target1);

  assert(game.phase === 'elimination-results', 'Round 1: elimination-results (3 remaining)');
  gm.continueAfterElimination('host-1', code);

  // Round 2: eliminate second non-impostor → only 2 left → game ends
  const activePlayers = game.players.filter(p => !p.isEliminated && !p.isSpectator);
  assert(activePlayers.length === 3, '3 active players after first elimination');

  const target2 = activePlayers.find(p => p.id !== impostorId && p.id !== 'host-1')?.id
    ?? activePlayers.find(p => p.id !== impostorId)!.id;

  submitAllClues(gm, code, game);
  gm.startVoting('host-1', code);
  everyoneVotesFor(gm, code, game, target2);

  assert(game.phase === 'results', 'Only 2 players left → straight to results (impostor wins)');
  const remaining = game.players.filter(p => !p.isEliminated && !p.isSpectator);
  assert(remaining.length === 2, '2 players remain');

  // Verify personalized state shows impostor survived message context
  const state = gm.getPersonalizedState(game, 'host-1');
  assert(state.impostorId === impostorId, 'ImpostorId revealed in results');
  assert(state.impostorGuessCorrect === null, 'No guess data (no guess phase for survival win)');
}

// ==================================================================
// TEST 6: Tie vote → no elimination → game continues
// ==================================================================
section('Test 6: Tie vote → no elimination → continue');
{
  const { gm, game, playerIds, code } = setupEliminationGame(4);
  const impostorId = game.impostorId!;

  submitAllClues(gm, code, game);
  gm.startVoting('host-1', code);

  // Create a tie: 2 votes for A, 2 votes for B
  const activePlayers = game.players.filter(p => !p.isEliminated && !p.isSpectator);
  const [p1, p2, p3, p4] = activePlayers;

  // p1 votes for p3, p2 votes for p3, p3 votes for p1, p4 votes for p1 → tie between p1 and p3
  gm.vote(p1.id, code, p3.id);
  gm.vote(p2.id, code, p3.id);
  gm.vote(p3.id, code, p1.id);
  gm.vote(p4.id, code, p1.id);

  assert(game.phase === 'elimination-results', 'Tie → elimination-results phase');
  assert(game.lastEliminatedId === null, 'No one eliminated on tie');
  assert(game.eliminationHistory.length === 0, 'No elimination history entry');

  const allStillActive = game.players.filter(p => !p.isEliminated && !p.isSpectator);
  assert(allStillActive.length === 4, 'All 4 players still active');

  // Host continues
  gm.continueAfterElimination('host-1', code);
  assert(game.phase === 'clues', 'Game continues to clues after tie');
  assert(game.round === 2, 'Round incremented');
}

// ==================================================================
// TEST 7: Play Again resets all elimination state
// ==================================================================
section('Test 7: Play Again resets elimination state');
{
  const { gm, game, playerIds, code } = setupEliminationGame(5);
  const nonImpostorId = playerIds.find(id => id !== game.impostorId && id !== 'host-1')!;

  // Eliminate a player and reach results
  submitAllClues(gm, code, game);
  gm.startVoting('host-1', code);
  everyoneVotesFor(gm, code, game, game.impostorId!);
  // Impostor caught → guess phase → wrong guess → results
  gm.guessWord(game.impostorId!, code, 'wrong');

  assert(game.phase === 'results', 'Game is in results');
  assert(game.eliminationHistory.length === 1, 'Has elimination history');

  // Play again
  gm.playAgain('host-1', code);

  assert(game.phase === 'setup', 'Phase reset to setup');
  assert(game.eliminationHistory.length === 0, 'Elimination history cleared');
  assert(game.lastEliminatedId === null, 'lastEliminatedId cleared');
  assert(game.settings.elimination === true, 'Elimination setting preserved');

  const allPlayers = game.players.filter(p => !p.isSpectator);
  const eliminatedCount = allPlayers.filter(p => p.isEliminated).length;
  assert(eliminatedCount === 0, 'All players un-eliminated');
}

// ==================================================================
// TEST 8: Player disconnection during elimination mode
// ==================================================================
section('Test 8: Player disconnection / removal');
{
  // Test that removing a player in elimination mode checks active (non-eliminated) count
  const { gm, game, playerIds, code } = setupEliminationGame(5);
  const impostorId = game.impostorId!;
  const nonImpostors = playerIds.filter(id => id !== impostorId);

  // Eliminate 2 non-impostors (leaving 3 active)
  // Round 1
  const target1 = nonImpostors.find(id => id !== 'host-1')!;
  submitAllClues(gm, code, game);
  gm.startVoting('host-1', code);
  everyoneVotesFor(gm, code, game, target1);
  gm.continueAfterElimination('host-1', code);

  // Round 2 - eliminate another
  let activePlayers = game.players.filter(p => !p.isEliminated && !p.isSpectator);
  const target2 = activePlayers.find(p => p.id !== impostorId && p.id !== 'host-1')?.id;
  if (target2) {
    submitAllClues(gm, code, game);
    gm.startVoting('host-1', code);
    everyoneVotesFor(gm, code, game, target2);
    // This might go to results if only 2 remain, or elimination-results if 3+
  }

  // Now try removing a non-eliminated player when only a few are left
  // Reset for a cleaner disconnect test
  const gm2 = new GameManager();
  const g2 = gm2.createGame('h1', 's1', 'Host');
  gm2.addPlayer(g2.code, 'p2', 's2', 'P2');
  gm2.addPlayer(g2.code, 'p3', 's3', 'P3');
  gm2.addPlayer(g2.code, 'p4', 's4', 'P4');
  gm2.setElimination('h1', g2.code, true);
  gm2.startGame('h1', g2.code);
  gm2.setWord('h1', g2.code, 'test');
  ['h1', 'p2', 'p3', 'p4'].forEach(id => gm2.markRoleReady(id, g2.code));

  const g = gm2.getGame(g2.code)!;
  assert(g.phase === 'clues', 'Disconnect test: game in clues');

  // Eliminate one player via voting
  const imId = g.impostorId!;
  const nonImp = ['h1', 'p2', 'p3', 'p4'].find(id => id !== imId && id !== 'h1')!;
  submitAllClues(gm2, g2.code, g);
  gm2.startVoting('h1', g2.code);
  everyoneVotesFor(gm2, g2.code, g, nonImp);

  if (g.phase === 'elimination-results') {
    gm2.continueAfterElimination('h1', g2.code);
    // 3 active players now

    // Remove one more non-eliminated player (disconnect) → should end game if < 3 active
    const activeNow = g.players.filter(p => !p.isEliminated && !p.isSpectator);
    const toRemove = activeNow.find(p => p.id !== 'h1' && p.id !== imId);
    if (toRemove) {
      const result = gm2.removePlayer(toRemove.id);
      assert(result.gameEnded === true, 'Game ends when disconnect leaves < 3 active players in elimination mode');
      assert(g.phase === 'results', 'Phase set to results on too-few-players');
    }
  }
}

// ==================================================================
// TEST BONUS: continueAfterElimination validations
// ==================================================================
section('Test Bonus: continueAfterElimination validations');
{
  const gm = new GameManager();
  const game = gm.createGame('host', 'sock', 'Host');

  // Wrong phase
  const r1 = gm.continueAfterElimination('host', game.code);
  assert(r1.error === 'wrong_phase', 'Cannot continue in lobby phase');

  // Not host
  const { gm: gm2, game: game2, code } = setupEliminationGame(5);
  const nonImp = game2.players.find(p => p.id !== game2.impostorId && p.id !== 'host-1')!;
  submitAllClues(gm2, code, game2);
  gm2.startVoting('host-1', code);
  everyoneVotesFor(gm2, code, game2, nonImp.id);
  assert(game2.phase === 'elimination-results', 'In elimination-results phase');

  const r2 = gm2.continueAfterElimination('player-2', code);
  assert(r2.error === 'not_host', 'Non-host cannot continue');
}

// ==================================================================
// TEST BONUS: Standard mode unaffected
// ==================================================================
section('Test Bonus: Standard (non-elimination) mode unaffected');
{
  const gm = new GameManager();
  const game = gm.createGame('host', 'sock', 'Host');
  gm.addPlayer(game.code, 'p2', 's2', 'P2');
  gm.addPlayer(game.code, 'p3', 's3', 'P3');
  // Don't enable elimination
  assert(game.settings.elimination === false, 'Elimination off by default');

  gm.startGame('host', game.code);
  gm.setWord('host', game.code, 'test');
  ['host', 'p2', 'p3'].forEach(id => gm.markRoleReady(id, game.code));

  const g = gm.getGame(game.code)!;
  submitAllClues(gm, game.code, g);
  gm.startVoting('host', game.code);

  // Vote out non-impostor
  const nonImp = ['host', 'p2', 'p3'].find(id => id !== g.impostorId)!;
  everyoneVotesFor(gm, game.code, g, nonImp);

  assert(g.phase === 'results', 'Standard mode: goes to results directly (no elimination-results)');
  assert(g.eliminationHistory.length === 0, 'No elimination history in standard mode');
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
