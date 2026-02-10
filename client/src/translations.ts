const translations = {
  es: {
    // Home
    'app.title': 'EL IMPOSTOR',
    'app.subtitle': 'El juego de fiesta',
    'home.create': 'Crear Partida',
    'home.join': 'Unirse',

    // Create
    'create.title': 'Crear Partida',
    'create.name': 'Tu nombre',
    'create.button': 'Crear',

    // Join
    'join.title': 'Unirse a Partida',
    'join.code': 'Código de sala',
    'join.name': 'Tu nombre',
    'join.button': 'Unirse',
    'join.watch': 'Observar',

    // Lobby
    'lobby.players': 'jugadores',
    'lobby.spectators': '{count} observando',
    'lobby.start': 'Comenzar',
    'lobby.waiting': 'Esperando a que {host} inicie la partida...',
    'lobby.minPlayers': 'Se necesitan al menos 3 jugadores',
    'lobby.share': 'Compartir',
    'lobby.copied': 'Copiado!',
    'lobby.tapToCopy': 'Toca para copiar',
    'lobby.mode': 'Modo de juego',
    'lobby.modeOnline': 'Online',
    'lobby.modeLocal': 'Presencial',

    // Setup
    'setup.title': '¿Cuál es la palabra secreta?',
    'setup.placeholder': 'Escribe la palabra...',
    'setup.helper': 'Puede ser una persona, objeto, lugar, película...',
    'setup.button': 'Asignar',
    'setup.waiting': '{host} está eligiendo la palabra...',

    // Reveal
    'reveal.tapToSee': 'Toca para ver tu rol',
    'reveal.tapToHide': 'Toca para ocultar',
    'reveal.impostor': '¡ERES EL IMPOSTOR!',
    'reveal.impostorHint': 'No conoces la palabra. Descúbrela sin que te descubran.',
    'reveal.wordHint': 'Recuerda la palabra. No la digas en voz alta.',
    'reveal.ready': 'Listo',
    'reveal.playersReady': '{count}/{total} jugadores listos',
    'reveal.allReady': '¡Todos listos, empezar!',

    // Clues
    'clues.round': 'Ronda {n}',
    'clues.yourTurn': '¡Es tu turno!',
    'clues.placeholder': 'Di una palabra...',
    'clues.submit': 'Enviar',
    'clues.turnOf': 'Es el turno de {name}...',
    'clues.goToVoting': 'Ir a votación',
    'clues.anotherRound': 'Otra ronda',
    'clues.waiting': 'Esperando a que {host} continúe...',
    'clues.skipped': 'Pasó',

    // Voting
    'voting.title': '¿Quién es el impostor?',
    'voting.vote': 'Votar',
    'voting.voted': '{count}/{total} han votado',
    'voting.waiting': 'Esperando a los demás...',

    // Playing (local mode)
    'playing.title': '¡A jugar!',
    'playing.hint': 'Den pistas, discutan y voten en persona',
    'playing.reveal': 'Revelar impostor',
    'playing.waiting': 'Jugando en persona...',

    // Results
    'results.impostorWas': 'El impostor era...',
    'results.wordWas': 'La palabra era:',
    'results.caught': '¡Lo atraparon! 🎉',
    'results.won': '¡El impostor ganó! 🕵️',
    'results.playAgain': 'Jugar otra vez',
    'results.backHome': 'Volver al inicio',
    'results.votedFor': 'votó por',
    'results.pickHost': 'Elegir próximo host',
    'results.pickHostHint': '¿Quién elige la siguiente palabra?',
    'results.confirm': 'Confirmar',

    // Spectator
    'spectator.banner': 'Estás observando',
    'spectator.joinAsPlayer': 'Unirse como jugador',
    'spectator.watching': 'Observando la partida...',

    // Connection
    'connection.reconnecting': 'Reconectando...',

    // Errors
    'error.room_not_found': 'Sala no encontrada',
    'error.game_in_progress': 'La partida ya comenzó',
    'error.name_taken': 'Ese nombre ya está en uso',
    'error.room_full': 'La sala está llena',
    'error.name_required': 'Ingresa tu nombre',
    'error.code_required': 'Ingresa el código de sala',
    'error.not_enough_players': 'Se necesitan al menos 3 jugadores',
    'error.empty_word': 'Ingresa una palabra',
    'error.empty_clue': 'Ingresa una pista',
    'error.not_your_turn': 'No es tu turno',
    'error.cannot_vote_self': 'No puedes votar por ti mismo',
    'error.disconnected': 'La partida terminó',

    // Leave
    'leave.confirm': '¿Salir de la partida?',
    'leave.hostWarning': 'Si sales, la partida terminará para todos.',
    'leave.playerWarning': 'Serás removido de la partida.',
    'leave.yes': 'Salir',
    'leave.cancel': 'Cancelar',
  },
  en: {
    // Home
    'app.title': 'EL IMPOSTOR',
    'app.subtitle': 'The Party Game',
    'home.create': 'Create Game',
    'home.join': 'Join Game',

    // Create
    'create.title': 'Create Game',
    'create.name': 'Your name',
    'create.button': 'Create',

    // Join
    'join.title': 'Join Game',
    'join.code': 'Room code',
    'join.name': 'Your name',
    'join.button': 'Join',
    'join.watch': 'Watch',

    // Lobby
    'lobby.players': 'players',
    'lobby.spectators': '{count} watching',
    'lobby.start': 'Start',
    'lobby.waiting': 'Waiting for {host} to start the game...',
    'lobby.minPlayers': 'At least 3 players needed',
    'lobby.share': 'Share',
    'lobby.copied': 'Copied!',
    'lobby.tapToCopy': 'Tap to copy',
    'lobby.mode': 'Game mode',
    'lobby.modeOnline': 'Online',
    'lobby.modeLocal': 'In Person',

    // Setup
    'setup.title': 'What\'s the secret word?',
    'setup.placeholder': 'Type the word...',
    'setup.helper': 'Can be a person, object, place, movie...',
    'setup.button': 'Assign',
    'setup.waiting': '{host} is choosing the word...',

    // Reveal
    'reveal.tapToSee': 'Tap to see your role',
    'reveal.tapToHide': 'Tap to hide',
    'reveal.impostor': 'YOU ARE THE IMPOSTOR!',
    'reveal.impostorHint': 'You don\'t know the word. Figure it out without getting caught.',
    'reveal.wordHint': 'Remember the word. Don\'t say it out loud.',
    'reveal.ready': 'Ready',
    'reveal.playersReady': '{count}/{total} players ready',
    'reveal.allReady': 'Everyone ready, start!',

    // Clues
    'clues.round': 'Round {n}',
    'clues.yourTurn': 'It\'s your turn!',
    'clues.placeholder': 'Say a word...',
    'clues.submit': 'Submit',
    'clues.turnOf': 'It\'s {name}\'s turn...',
    'clues.goToVoting': 'Go to voting',
    'clues.anotherRound': 'Another round',
    'clues.waiting': 'Waiting for {host} to continue...',
    'clues.skipped': 'Skipped',

    // Voting
    'voting.title': 'Who is the impostor?',
    'voting.vote': 'Vote',
    'voting.voted': '{count}/{total} have voted',
    'voting.waiting': 'Waiting for others...',

    // Playing (local mode)
    'playing.title': 'Let\'s play!',
    'playing.hint': 'Give clues, discuss and vote in person',
    'playing.reveal': 'Reveal impostor',
    'playing.waiting': 'Playing in person...',

    // Results
    'results.impostorWas': 'The impostor was...',
    'results.wordWas': 'The word was:',
    'results.caught': 'Caught! 🎉',
    'results.won': 'The impostor wins! 🕵️',
    'results.playAgain': 'Play again',
    'results.backHome': 'Back to home',
    'results.votedFor': 'voted for',
    'results.pickHost': 'Pick next host',
    'results.pickHostHint': 'Who picks the next word?',
    'results.confirm': 'Confirm',

    // Spectator
    'spectator.banner': 'You are spectating',
    'spectator.joinAsPlayer': 'Join as player',
    'spectator.watching': 'Watching the game...',

    // Connection
    'connection.reconnecting': 'Reconnecting...',

    // Errors
    'error.room_not_found': 'Room not found',
    'error.game_in_progress': 'Game already in progress',
    'error.name_taken': 'That name is already taken',
    'error.room_full': 'Room is full',
    'error.name_required': 'Enter your name',
    'error.code_required': 'Enter the room code',
    'error.not_enough_players': 'At least 3 players needed',
    'error.empty_word': 'Enter a word',
    'error.empty_clue': 'Enter a clue',
    'error.not_your_turn': 'Not your turn',
    'error.cannot_vote_self': 'You can\'t vote for yourself',
    'error.disconnected': 'The game ended',

    // Leave
    'leave.confirm': 'Leave the game?',
    'leave.hostWarning': 'If you leave, the game will end for everyone.',
    'leave.playerWarning': 'You will be removed from the game.',
    'leave.yes': 'Leave',
    'leave.cancel': 'Cancel',
  },
} as const;

export type TranslationKey = keyof typeof translations.es;
export type Language = 'es' | 'en';

export default translations;
