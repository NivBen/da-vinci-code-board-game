import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  GameState, 
  GamePhase, 
  Player, 
  Tile, 
  GameConfig, 
  ChatMessage, 
  TileColor 
} from './types';
import { createInitialTiles, sortHand, TOTAL_NUMBERS, JOKER_VALUE } from './constants';
import TileComponent from './components/TileComponent';
import GameSetup from './components/GameSetup';

// --- Helper Functions ---

const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- Main Component ---

function App() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [guessModal, setGuessModal] = useState<{ targetPlayerId: string; targetTileIndex: number; targetTileId: string } | null>(null);
  const [showPassScreen, setShowPassScreen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const turnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Initialization ---

  const startGame = (newConfig: GameConfig) => {
    setConfig(newConfig);
    const shuffledTiles = shuffle(createInitialTiles(newConfig.includeJokers));
    const players: Player[] = [];
    const tilesPerPlayer = newConfig.playerCount === 4 ? 3 : 4;
    let pool = [...shuffledTiles];
    
    // Determine how many humans vs bots
    const humanCount = newConfig.playerCount - newConfig.botCount;

    for (let i = 0; i < newConfig.playerCount; i++) {
      const details = newConfig.playerDetails[i];
      let hand = pool.splice(0, tilesPerPlayer).map(t => ({ ...t, ownerId: `p-${i}` }));
      
      // Auto-assign random sort positions for Bot Jokers, keep human jokers at end by default
      if (details.isBot) {
         hand = hand.map(t => {
             if (t.isJoker) {
                 // Random position 0-11
                 return { ...t, sortValue: Math.random() * 12 };
             }
             return t;
         });
      }

      players.push({
        id: `p-${i}`,
        name: details.name,
        isBot: details.isBot,
        hand: sortHand(hand),
        isEliminated: false,
        avatar: details.avatar,
      });
    }

    setGameState({
      players,
      currentTurnPlayerId: players[0].id,
      drawnTile: null,
      pool,
      phase: GamePhase.DRAW,
      winnerId: null,
      turnLog: ['Game Started!'],
      moveNumber: 1,
    });

    setTimeLeft(newConfig.timerSeconds);
    // If local multiplayer (more than 1 human), show pass screen first
    if (humanCount > 1) {
       setShowPassScreen(true);
    }
  };

  const quitGame = () => {
      setShowExitModal(false);
      setConfig(null);
      setGameState(null);
  };

  // --- Confetti Effect ---
  useEffect(() => {
    if (gameState?.phase === GamePhase.GAME_OVER && gameState.winnerId) {
       const duration = 3 * 1000;
       const animationEnd = Date.now() + duration;
       const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

       const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

       const interval: any = setInterval(function() {
         const timeLeft = animationEnd - Date.now();

         if (timeLeft <= 0) {
           return clearInterval(interval);
         }

         const particleCount = 50 * (timeLeft / duration);
         confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
         confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
       }, 250);
    }
  }, [gameState?.phase, gameState?.winnerId]);


  // --- Timer Logic ---
  useEffect(() => {
    if (!gameState || gameState.winnerId || showPassScreen || config?.timerSeconds === 0) return;
    
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
    if(currentPlayer?.isBot) return; // Don't time bots

    if (timeLeft > 0) {
      turnTimerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && config?.timerSeconds !== 0) {
      handleTimeOut();
    }

    return () => {
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
    };
  }, [timeLeft, gameState, showPassScreen, config]);

  const handleTimeOut = () => {
      if (!gameState) return;
      if (gameState.drawnTile) {
          addLog("Time ran out! Drawn tile revealed.");
          endTurn(false);
      } else {
          drawTile();
          setTimeLeft(10); 
      }
  };


  // --- Game Actions ---

  const drawTile = () => {
    if (!gameState || gameState.phase !== GamePhase.DRAW) return;
    
    if (gameState.pool.length === 0) {
        setGameState(prev => ({ ...prev!, phase: GamePhase.GUESS }));
        addLog(`Pool empty. Proceed to guess.`);
        return;
    }

    const newPool = [...gameState.pool];
    const tile = newPool.pop();
    if (!tile) return;

    tile.ownerId = gameState.currentTurnPlayerId;
    
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
    if (currentPlayer?.isBot && tile.isJoker) {
        tile.sortValue = Math.random() * 12;
    }

    setGameState(prev => ({
      ...prev!,
      pool: newPool,
      drawnTile: tile,
      phase: GamePhase.GUESS,
    }));

    addLog(`Player drawn a ${tile.color} tile.`);
  };

  const handleTileClick = (targetPlayerId: string, tileIndex: number, tileId: string) => {
    if (!gameState) return;
    if (gameState.phase !== GamePhase.GUESS) return;
    
    const targetPlayer = gameState.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer || targetPlayer.isEliminated) return;
    if (targetPlayer.id === gameState.currentTurnPlayerId) return; 

    const targetTile = targetPlayer.hand[tileIndex];
    if (targetTile.isRevealed) return; 

    setGuessModal({ targetPlayerId, targetTileIndex: tileIndex, targetTileId: tileId });
  };
  
  const handleDragStart = (e: React.DragEvent, tileId: string) => {
      e.dataTransfer.setData('text/plain', tileId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetTileId: string) => {
      e.preventDefault();
      if (!gameState) return;

      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId === targetTileId) return; 

      const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
      if (!currentPlayer) return;

      const hand = currentPlayer.hand;
      const draggedTile = hand.find(t => t.id === draggedId);
      
      const isDrawnTile = gameState.drawnTile?.id === draggedId;
      const draggedObj = isDrawnTile ? gameState.drawnTile : draggedTile;

      if (!draggedObj || !draggedObj.isJoker || draggedObj.isPlaced) {
          return;
      }

      let newSortValue = 0;
      const targetIndex = hand.findIndex(t => t.id === targetTileId);
      if (targetIndex !== -1) {
          const targetTile = hand[targetIndex];
          if (targetIndex === 0) {
              newSortValue = targetTile.sortValue - 1;
          } else {
              const prevTile = hand[targetIndex - 1];
              if (prevTile.id === draggedId && targetIndex > 1) {
                  const prevPrev = hand[targetIndex - 2];
                  newSortValue = (prevPrev.sortValue + targetTile.sortValue) / 2;
              } else if (prevTile.id === draggedId) {
                   newSortValue = targetTile.sortValue - 0.5;
              } else {
                  newSortValue = (prevTile.sortValue + targetTile.sortValue) / 2;
              }
          }
      } else {
          const lastTile = hand[hand.length - 1];
          if (lastTile) newSortValue = lastTile.sortValue + 1;
      }

      if (isDrawnTile) {
           setGameState(prev => ({
               ...prev!,
               drawnTile: { ...prev!.drawnTile!, sortValue: newSortValue, isPlaced: true }
           }));
      } else {
           const newHand = hand.map(t => {
               if (t.id === draggedId) {
                   return { ...t, sortValue: newSortValue, isPlaced: true };
               }
               return t;
           });
           
           setGameState(prev => ({
               ...prev!,
               players: prev!.players.map(p => p.id === currentPlayer.id ? { ...p, hand: sortHand(newHand) } : p)
           }));
      }
  };


  const submitGuess = (value: number) => {
    if (!gameState || !guessModal) return;

    const { targetPlayerId, targetTileIndex } = guessModal;
    setGuessModal(null); 

    const targetPlayer = gameState.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer) return;

    const targetTile = targetPlayer.hand[targetTileIndex];
    const isCorrect = targetTile.value === value;

    if (isCorrect) {
      const newPlayers = gameState.players.map(p => {
        if (p.id === targetPlayerId) {
          const newHand = [...p.hand];
          newHand[targetTileIndex] = { ...newHand[targetTileIndex], isRevealed: true };
          return { ...p, hand: newHand };
        }
        return p;
      });

      const updatedTargetPlayer = newPlayers.find(p => p.id === targetPlayerId)!;
      const allRevealed = updatedTargetPlayer.hand.every(t => t.isRevealed);
      if (allRevealed) {
          updatedTargetPlayer.isEliminated = true;
          addLog(`${updatedTargetPlayer.name} is eliminated!`);
      }

      setGameState(prev => ({
        ...prev!,
        players: newPlayers,
        phase: GamePhase.RESOLVE 
      }));
      
      addLog(`Correct! It was ${targetTile.isJoker ? 'a Joker' : targetTile.value}.`);
      checkWinner(newPlayers);

    } else {
      addLog(`Wrong guess!`);
      endTurn(false);
    }
  };

  const continueTurn = () => {
      if (gameState?.phase === GamePhase.RESOLVE) {
          setGameState(prev => ({...prev!, phase: GamePhase.GUESS}));
      }
  };

  const endTurn = (wasSuccess = true) => {
    if (!gameState) return;

    let newPlayers = [...gameState.players];
    const currentPlayerIdx = newPlayers.findIndex(p => p.id === gameState.currentTurnPlayerId);
    const currentPlayer = { ...newPlayers[currentPlayerIdx] };
    
    if (gameState.drawnTile) {
        const tileToInsert = { ...gameState.drawnTile };
        if (!wasSuccess) {
            tileToInsert.isRevealed = true; 
            addLog(`Revealed drawn tile: ${tileToInsert.color} ${tileToInsert.isJoker ? 'Joker' : tileToInsert.value}`);
        }
        
        const newHand = [...currentPlayer.hand, tileToInsert];
        currentPlayer.hand = sortHand(newHand);
        newPlayers[currentPlayerIdx] = currentPlayer;
    }

    let nextPlayerIdx = (currentPlayerIdx + 1) % newPlayers.length;
    while(newPlayers[nextPlayerIdx].isEliminated) {
        nextPlayerIdx = (nextPlayerIdx + 1) % newPlayers.length;
    }
    
    const nextPlayerId = newPlayers[nextPlayerIdx].id;

    setGameState({
        players: newPlayers,
        currentTurnPlayerId: nextPlayerId,
        drawnTile: null,
        pool: gameState.pool, 
        phase: GamePhase.DRAW,
        winnerId: gameState.winnerId,
        turnLog: gameState.turnLog,
        moveNumber: gameState.moveNumber + 1
    });

    if (config?.playerCount) {
        const humanCount = config.playerCount - config.botCount;
        const nextPlayerIsBot = newPlayers[nextPlayerIdx].isBot;
        if (humanCount > 1 && !nextPlayerIsBot) {
             setShowPassScreen(true);
        }
    }
    
    setTimeLeft(config?.timerSeconds || 0);
  };

  const checkWinner = (players: Player[]) => {
      const activePlayers = players.filter(p => !p.isEliminated);
      if (activePlayers.length === 1) {
          setGameState(prev => ({...prev!, winnerId: activePlayers[0].id, phase: GamePhase.GAME_OVER}));
          addLog(`${activePlayers[0].name} WINS!`);
      }
  };

  const addLog = (msg: string) => {
    setGameState(prev => {
        if (!prev) return null;
        const newLog = [msg, ...prev.turnLog].slice(0, 50);
        return { ...prev, turnLog: newLog };
    });
  };

  // --- Bot Logic ---
  useEffect(() => {
      if (!gameState || gameState.winnerId || showPassScreen) return;
      
      const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
      if (currentPlayer && currentPlayer.isBot) {
          const timer = setTimeout(() => {
              executeBotMove();
          }, 1500);
          return () => clearTimeout(timer);
      }
  }, [gameState, showPassScreen]);

  const executeBotMove = () => {
      if (!gameState) return;

      if (gameState.phase === GamePhase.DRAW) {
          drawTile();
          return;
      }

      if (gameState.phase === GamePhase.GUESS) {
          const opponents = gameState.players.filter(p => p.id !== gameState.currentTurnPlayerId && !p.isEliminated);
          if(opponents.length === 0) return;
          
          const target = opponents[Math.floor(Math.random() * opponents.length)];
          const hiddenTiles = target.hand.map((t, i) => ({t, i})).filter(item => !item.t.isRevealed);
          
          if (hiddenTiles.length === 0) return; 
          
          const targetTileObj = hiddenTiles[Math.floor(Math.random() * hiddenTiles.length)];
          
          const possibleValues = Array.from({length: TOTAL_NUMBERS}, (_, i) => i);
          if (config?.includeJokers) possibleValues.push(JOKER_VALUE);

          const guessVal = possibleValues[Math.floor(Math.random() * possibleValues.length)];
          
          const targetTile = targetTileObj.t;
          const isCorrect = targetTile.value === guessVal;

          if (isCorrect) {
               addLog(`Bot guessed correctly!`);
                const newPlayers = gameState.players.map(p => {
                    if (p.id === target.id) {
                    const newHand = [...p.hand];
                    newHand[targetTileObj.i] = { ...newHand[targetTileObj.i], isRevealed: true };
                    return { ...p, hand: newHand };
                    }
                    return p;
                });
                const updatedTarget = newPlayers.find(p => p.id === target.id)!;
                if(updatedTarget.hand.every(t => t.isRevealed)) updatedTarget.isEliminated = true;

                setGameState(prev => ({
                    ...prev!,
                    players: newPlayers,
                    phase: GamePhase.DRAW, 
                    currentTurnPlayerId: getNextPlayerId(newPlayers, gameState.currentTurnPlayerId),
                    drawnTile: null 
                }));
                if (gameState.drawnTile) {
                    const botIdx = newPlayers.findIndex(p => p.id === gameState.currentTurnPlayerId);
                    const newHand = sortHand([...newPlayers[botIdx].hand, gameState.drawnTile]);
                    newPlayers[botIdx].hand = newHand;
                }
                
                checkWinner(newPlayers);

          } else {
               addLog(`Bot guessed wrong.`);
               endTurn(false);
          }
      }
      
      if (gameState.phase === GamePhase.RESOLVE) {
          endTurn(true);
      }
  };

  const getNextPlayerId = (players: Player[], currentId: string) => {
      let idx = players.findIndex(p => p.id === currentId);
      idx = (idx + 1) % players.length;
      while(players[idx].isEliminated) idx = (idx + 1) % players.length;
      return players[idx].id;
  }

  // --- Rendering ---

  if (!config) {
    return (
        <div className={darkMode ? 'dark' : ''}>
            <div className="absolute top-4 right-4 z-50 flex gap-2">
                 <button 
                    onClick={() => setShowInstructions(true)} 
                    className="p-2 bg-gray-200 dark:bg-slate-700 rounded-full hover:bg-gray-300 transition-colors"
                    title="Rules"
                 >
                    ❓
                </button>
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-gray-200 dark:bg-slate-700 rounded-full">
                    {darkMode ? '☀️' : '🌙'}
                </button>
            </div>
            <GameSetup onStart={startGame} />
            
            {showInstructions && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto border-4 border-wood-300 dark:border-slate-600 relative">
                    <button 
                        onClick={() => setShowInstructions(false)}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-bold text-xl"
                    >
                        ✕
                    </button>
                    
                    <h2 className="text-3xl font-bold text-wood-700 dark:text-wood-300 mb-6 text-center">How to Play</h2>
                    
                    <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
                        <section>
                            <h3 className="text-xl font-bold text-wood-600 dark:text-wood-400 mb-2">🕵️ Objective</h3>
                            <p>Deduce the secret codes of your opponents to eliminate them. Be the last one standing with unrevealed tiles!</p>
                        </section>
                        
                        <section>
                            <h3 className="text-xl font-bold text-wood-600 dark:text-wood-400 mb-2">🔢 The Code</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>There are 24 tiles: Numbers 0-11 in Black and White.</li>
                                <li>Players' hands are always kept in a specific order:</li>
                                <li className="font-bold">1. Numerical Order (0 to 11)</li>
                                <li className="font-bold">2. If numbers are the same, Black is placed to the left of White.</li>
                            </ul>
                        </section>
                        
                        <section>
                             <h3 className="text-xl font-bold text-wood-600 dark:text-wood-400 mb-2">🃏 The Joker (—)</h3>
                             <p>If enabled, there are 2 Joker tiles (one Black, one White). Jokers can be placed <strong>anywhere</strong> in your hand!</p>
                             <ul className="list-disc pl-5 mt-1 text-sm">
                                 <li>Drag your own Joker to move it to a different position.</li>
                                 <li>You can only move each Joker <strong>once</strong>!</li>
                                 <li>When guessing, select the Dash (—) symbol to identify a Joker.</li>
                             </ul>
                        </section>
                    </div>

                    <div className="mt-8 text-center">
                        <button 
                            onClick={() => setShowInstructions(false)}
                            className="px-8 py-3 bg-wood-500 hover:bg-wood-600 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
                </div>
            )}
        </div>
    );
  }

  const currentPlayer = gameState?.players.find(p => p.id === gameState?.currentTurnPlayerId);

  if (showPassScreen) {
      return (
        <div className={`h-screen flex flex-col items-center justify-center bg-wood-600 dark:bg-slate-900 text-white ${darkMode ? 'dark' : ''}`}>
            <h1 className="text-4xl font-bold mb-4 text-center">Pass the device to {currentPlayer?.name}</h1>
            <div className="text-6xl mb-8">{currentPlayer?.avatar}</div>
            <button 
                onClick={() => setShowPassScreen(false)}
                className="px-8 py-4 bg-wood-400 hover:bg-wood-500 rounded-xl text-xl font-bold shadow-lg"
            >
                I am ready
            </button>
        </div>
      );
  }

  return (
    <div className={`h-screen bg-wood-100 dark:bg-slate-900 transition-colors duration-300 flex flex-col ${darkMode ? 'dark' : ''}`}>
      <header className="bg-wood-500 dark:bg-slate-800 text-white p-3 shadow-md flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
           <h1 className="font-bold text-lg md:text-xl tracking-tight">Da Vinci Code</h1>
           {gameState?.phase !== GamePhase.GAME_OVER && (
               <>
                <div className="bg-black/20 px-3 py-1 rounded-full text-xs md:text-sm font-mono">
                    Move: {gameState?.moveNumber}
                </div>
                <div className="hidden sm:block bg-black/20 px-3 py-1 rounded-full text-xs md:text-sm font-mono">
                    {currentPlayer?.name}'s Turn
                </div>
               </>
           )}
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
             {timeLeft > 0 && gameState?.phase !== GamePhase.GAME_OVER && (
                 <div className={`font-mono font-bold text-lg md:text-xl ${timeLeft < 10 ? 'text-red-300 animate-pulse' : ''}`}>
                     {timeLeft}s
                 </div>
             )}
            
            <button 
                onClick={() => setShowExitModal(true)}
                className="p-2 bg-red-500/80 rounded-full hover:bg-red-600 text-xs md:text-sm font-bold px-3 transition-colors flex items-center gap-1"
                title="Quit Game"
            >
                ✕ <span className="hidden md:inline">Quit</span>
            </button>

            <button 
                onClick={() => setShowInstructions(true)}
                className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-xs md:text-sm font-bold px-3 transition-colors"
                title="Rules"
            >
                ❓ <span className="hidden md:inline">Rules</span>
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                 {darkMode ? '☀️' : '🌙'}
            </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 flex flex-col relative overflow-y-auto p-4 md:p-8">
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-8 min-h-[160px]">
                {gameState?.players.filter(p => p.id !== currentPlayer?.id).map(player => (
                    <div key={player.id} className={`bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl border-2 ${player.isEliminated ? 'opacity-50 border-red-400' : 'border-wood-300 dark:border-slate-600'} transition-all`}>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl md:text-2xl">{player.avatar}</span>
                            <span className="font-bold text-wood-900 dark:text-wood-100 text-sm md:text-base">{player.name}</span>
                            {player.isEliminated && <span className="text-red-600 font-bold text-[10px] uppercase ml-auto">Out</span>}
                        </div>
                        <div className="flex gap-1 md:gap-2 justify-center">
                            {player.hand.map((tile, idx) => (
                                <TileComponent 
                                    key={tile.id} 
                                    tile={tile} 
                                    isHidden={!tile.isRevealed}
                                    isInteractable={!player.isEliminated && gameState?.phase === GamePhase.GUESS && !tile.isRevealed}
                                    onClick={() => handleTileClick(player.id, idx, tile.id)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {gameState?.winnerId && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl text-center transform scale-110">
                        <h2 className="text-4xl font-bold text-wood-600 dark:text-wood-400 mb-2">Game Over</h2>
                        <p className="text-2xl text-gray-700 dark:text-gray-200 mb-6">
                            {gameState.players.find(p => p.id === gameState.winnerId)?.name} Wins!
                        </p>
                        <button 
                            onClick={() => setConfig(null)}
                            className="px-6 py-3 bg-wood-500 text-white rounded-full font-bold shadow-lg hover:bg-wood-600"
                        >
                            New Game
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-auto bg-white dark:bg-slate-800 p-4 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-wood-200 dark:border-slate-700">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl md:text-4xl">{currentPlayer?.avatar}</span>
                            <div>
                                <h2 className="text-lg md:text-xl font-bold dark:text-white">
                                    {currentPlayer?.isBot ? `${currentPlayer.name}'s turn...` : "Your Hand"}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {gameState?.phase === GamePhase.DRAW ? "Time to draw..." : 
                                     gameState?.phase === GamePhase.GUESS ? "Choose a tile to guess." :
                                     gameState?.phase === GamePhase.RESOLVE ? "Correct! Continue or end turn?" :
                                     "Waiting..."}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            {gameState?.phase === GamePhase.DRAW && !currentPlayer?.isBot && (
                                <button 
                                    onClick={drawTile}
                                    className="px-4 md:px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-md font-bold text-sm md:text-base hover:scale-105 transition"
                                >
                                    Draw ({gameState.pool.length})
                                </button>
                            )}
                            {gameState?.phase === GamePhase.RESOLVE && !currentPlayer?.isBot && (
                                <>
                                    <button 
                                        onClick={continueTurn}
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-sm hover:bg-green-600"
                                    >
                                        Again
                                    </button>
                                    <button 
                                        onClick={() => endTurn(true)}
                                        className="px-4 py-2 bg-gray-500 text-white rounded-lg font-bold text-sm hover:bg-gray-600"
                                    >
                                        Finish
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8 justify-center min-h-[80px] md:min-h-[90px]">
                        <div className="flex gap-1 md:gap-2">
                             {currentPlayer?.hand.map((tile, idx) => (
                                <TileComponent 
                                    key={tile.id} 
                                    tile={tile} 
                                    isHidden={currentPlayer.isBot} 
                                    onClick={() => handleTileClick(currentPlayer.id, idx, tile.id)}
                                    draggable={!currentPlayer.isBot && tile.isJoker && !tile.isPlaced && !tile.isRevealed}
                                    onDragStart={(e) => handleDragStart(e, tile.id)}
                                    onDrop={(e) => handleDrop(e, tile.id)}
                                />
                             ))}
                        </div>
                        
                        {gameState?.drawnTile && (
                            <div className="flex flex-col items-center gap-1 border-l-2 pl-4 md:pl-8 border-dashed border-gray-300 dark:border-slate-600">
                                <span className="text-[10px] uppercase font-bold text-blue-500">Drawn</span>
                                <TileComponent 
                                    tile={gameState.drawnTile} 
                                    isNew={true} 
                                    isHidden={currentPlayer?.isBot && !gameState.drawnTile.isRevealed} 
                                    onClick={() => handleTileClick(currentPlayer?.id, -1, gameState.drawnTile!.id)}
                                    draggable={!currentPlayer?.isBot && gameState.drawnTile.isJoker && !gameState.drawnTile.isPlaced}
                                    onDragStart={(e) => handleDragStart(e, gameState.drawnTile!.id)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </main>

      {/* Modal for Exit Confirmation */}
      {showExitModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border-2 border-wood-200 dark:border-slate-600">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Quit Game?</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-8">Current progress will be lost.</p>
                <div className="flex gap-4 justify-center">
                    <button 
                        onClick={() => setShowExitModal(false)}
                        className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-white font-bold rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={quitGame}
                        className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg transition-colors"
                    >
                        Quit
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Modal for Guessing */}
      {guessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-bounce-in">
                <h3 className="text-xl font-bold text-center mb-6 dark:text-white">What number?</h3>
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {config?.includeJokers && (
                        <button
                            onClick={() => submitGuess(JOKER_VALUE)}
                            className="col-span-4 py-2 rounded-xl bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-800 dark:text-purple-100 font-bold border-2 border-purple-300 transition-colors"
                        >
                            JOKER (—)
                        </button>
                    )}
                    {Array.from({ length: TOTAL_NUMBERS }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => submitGuess(i)}
                            className="aspect-square rounded-xl bg-wood-100 dark:bg-slate-700 hover:bg-wood-500 hover:text-white dark:hover:bg-blue-600 transition-colors text-xl font-bold text-wood-900 dark:text-white"
                        >
                            {i}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => setGuessModal(null)}
                    className="w-full py-3 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-sm"
                >
                    Cancel
                </button>
            </div>
        </div>
      )}

      {showInstructions && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto border-4 border-wood-300 dark:border-slate-600 relative">
                <button 
                    onClick={() => setShowInstructions(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-bold text-xl"
                >
                    ✕
                </button>
                <h2 className="text-3xl font-bold text-wood-700 dark:text-wood-300 mb-6 text-center">Rules</h2>
                <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed text-sm md:text-base">
                    <section>
                        <h3 className="font-bold text-wood-600 dark:text-wood-400 mb-1">🕵️ Goal</h3>
                        <p>Find your opponents' hidden numbers to knock them out. Last player standing wins!</p>
                    </section>
                    <section>
                        <h3 className="font-bold text-wood-600 dark:text-wood-400 mb-1">🔢 Hand Order</h3>
                        <p>Hand is always sorted 0 to 11. For same numbers, Black is on the left of White.</p>
                    </section>
                    <section>
                        <h3 className="font-bold text-wood-600 dark:text-wood-400 mb-1">⚔️ Turn</h3>
                        <p>Draw a tile, then guess an opponent's tile. If right, you can guess again or end turn. If wrong, you must reveal the tile you just drew.</p>
                    </section>
                </div>
                <div className="mt-8 text-center">
                    <button 
                        onClick={() => setShowInstructions(false)}
                        className="px-8 py-3 bg-wood-500 text-white font-bold rounded-xl shadow-lg"
                    >
                        Back to Game
                    </button>
                </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default App;