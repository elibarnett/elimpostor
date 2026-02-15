import { useState, useMemo } from 'react';
import { LanguageContext, useLanguageProvider } from './hooks/useLanguage';
import { useGameState } from './hooks/useGameState';
import HomeScreen from './screens/HomeScreen';
import CreateScreen from './screens/CreateScreen';
import JoinScreen from './screens/JoinScreen';
import LobbyScreen from './screens/LobbyScreen';
import SetupScreen from './screens/SetupScreen';
import RevealScreen from './screens/RevealScreen';
import CluesScreen from './screens/CluesScreen';
import VotingScreen from './screens/VotingScreen';
import PlayingScreen from './screens/PlayingScreen';
import ImpostorGuessScreen from './screens/ImpostorGuessScreen';
import EliminationResultsScreen from './screens/EliminationResultsScreen';
import ResultsScreen from './screens/ResultsScreen';
import LeaveButton from './components/LeaveButton';
import SpectatorBanner from './components/SpectatorBanner';

function getInitialJoinCode(): string {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('join');
  if (code) {
    // Clean the URL without reloading
    window.history.replaceState({}, '', window.location.pathname);
    return code.toUpperCase().slice(0, 4);
  }
  return '';
}

const initialJoinCode = getInitialJoinCode();

export default function App() {
  const lang = useLanguageProvider();
  const game = useGameState(initialJoinCode ? 'join' : undefined);
  const [joinCode] = useState(initialJoinCode);

  const isSpectator = game.gameState?.isSpectator ?? false;
  const isEliminated = game.gameState?.players.find((p) => p.id === game.gameState?.playerId)?.isEliminated ?? false;

  const renderScreen = () => {
    // If in a game, show the phase-appropriate screen
    if (game.screen === 'game' && game.gameState) {
      const gs = game.gameState;
      switch (gs.phase) {
        case 'lobby':
          return (
            <LobbyScreen
              gameState={gs}
              startGame={game.startGame}
              setMode={game.setMode}
              setElimination={game.setElimination}
              updateSettings={game.updateSettings}
              convertToPlayer={game.convertToPlayer}
            />
          );
        case 'setup':
          return <SetupScreen gameState={gs} setWord={game.setWord} />;
        case 'reveal':
          return <RevealScreen gameState={gs} markRoleReady={game.markRoleReady} />;
        case 'clues':
          return (
            <CluesScreen
              gameState={gs}
              submitClue={game.submitClue}
              nextRound={game.nextRound}
              startVoting={game.startVoting}
              skipMyTurn={game.skipMyTurn}
            />
          );
        case 'voting':
          return <VotingScreen gameState={gs} vote={game.vote} />;
        case 'playing':
          return (
            <PlayingScreen
              gameState={gs}
              revealImpostor={game.revealImpostor}
            />
          );
        case 'impostor-guess':
          return (
            <ImpostorGuessScreen
              gameState={gs}
              guessWord={game.guessWord}
            />
          );
        case 'elimination-results':
          return (
            <EliminationResultsScreen
              gameState={gs}
              continueAfterElimination={game.continueAfterElimination}
            />
          );
        case 'results':
          return (
            <ResultsScreen
              gameState={gs}
              playAgain={game.playAgain}
              endGame={game.endGame}
              transferHost={game.transferHost}
            />
          );
      }
    }

    // Pre-game screens
    switch (game.screen) {
      case 'create':
        return (
          <CreateScreen
            setScreen={game.setScreen}
            createGame={game.createGame}
            error={game.error}
          />
        );
      case 'join':
        return (
          <JoinScreen
            setScreen={game.setScreen}
            joinGame={game.joinGame}
            watchGame={game.watchGame}
            error={game.error}
            initialCode={joinCode}
          />
        );
      default:
        return <HomeScreen setScreen={game.setScreen} />;
    }
  };

  const isHome = game.screen === 'home';

  // Auto-discover all bg-*.jpg at build time — just drop new files in src/assets/backgrounds/
  const bgModules = import.meta.glob('./assets/backgrounds/bg-*.jpg', { eager: true, query: '?url', import: 'default' });
  const BACKGROUNDS = Object.values(bgModules) as string[];
  const randomBg = useMemo(
    () => BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)],
    [],
  );

  return (
    <LanguageContext.Provider value={lang}>
      {/* Global background image — randomized per session */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${randomBg})`,
          backgroundColor: '#0f0a1a',
        }}
      />
      <div className={isHome ? 'relative' : 'max-w-md mx-auto relative'}>
        {/* Connection status banner */}
        {!game.connected && game.screen === 'game' && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-rose-600 text-white text-center text-sm py-2 px-4 animate-fade-in">
            {lang.t('connection.reconnecting')}
          </div>
        )}
        {/* Spectator / eliminated banner */}
        {game.screen === 'game' && (isSpectator || isEliminated) && (
          <SpectatorBanner
            canConvert={game.gameState?.phase === 'lobby'}
            onConvert={game.convertToPlayer}
            isEliminated={isEliminated}
          />
        )}
        {/* Leave button on all game screens */}
        {game.screen === 'game' && game.gameState && (
          <LeaveButton
            isHost={game.gameState.isHost}
            onLeave={game.leaveGame}
          />
        )}
        {renderScreen()}
      </div>
    </LanguageContext.Provider>
  );
}
