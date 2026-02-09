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
import ResultsScreen from './screens/ResultsScreen';

export default function App() {
  const lang = useLanguageProvider();
  const game = useGameState();

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
            error={game.error}
          />
        );
      default:
        return <HomeScreen setScreen={game.setScreen} />;
    }
  };

  const isHome = game.screen === 'home';

  return (
    <LanguageContext.Provider value={lang}>
      <div className={isHome ? 'relative' : 'max-w-md mx-auto relative'}>
        {/* Connection status banner */}
        {!game.connected && game.screen === 'game' && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-rose-600 text-white text-center text-sm py-2 px-4 animate-fade-in">
            Reconectando...
          </div>
        )}
        {renderScreen()}
      </div>
    </LanguageContext.Provider>
  );
}
