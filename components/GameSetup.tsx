import React, { useState, useEffect } from 'react';
import { GameConfig, PlayerSetupConfig } from '../types';
import { AVATARS } from '../constants';

interface GameSetupProps {
  onStart: (config: GameConfig) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStart }) => {
  const [playerCount, setPlayerCount] = useState(2);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [botCount, setBotCount] = useState(1);
  const [includeJokers, setIncludeJokers] = useState(false);
  
  const [playerDetails, setPlayerDetails] = useState<PlayerSetupConfig[]>([]);

  useEffect(() => {
    setPlayerDetails((prev) => {
      const newDetails: PlayerSetupConfig[] = [];
      const humanCount = Math.max(1, playerCount - botCount);

      for (let i = 0; i < playerCount; i++) {
        const isBot = i >= humanCount;
        if (prev[i]) {
          newDetails.push({
            ...prev[i],
            isBot: isBot,
            name: prev[i].name || (isBot ? `Bot ${i + 1 - humanCount}` : `Player ${i + 1}`)
          });
        } else {
          newDetails.push({
            name: isBot ? `Bot ${i + 1 - humanCount}` : `Player ${i + 1}`,
            avatar: AVATARS[i % AVATARS.length],
            isBot: isBot
          });
        }
      }
      return newDetails;
    });
  }, [playerCount, botCount]);

  useEffect(() => {
    if (botCount >= playerCount) {
      setBotCount(playerCount - 1);
    }
  }, [playerCount, botCount]);

  const updatePlayerDetail = (index: number, field: keyof PlayerSetupConfig, value: any) => {
    setPlayerDetails(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const humanCount = playerCount - botCount;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl max-w-lg w-full border-4 border-wood-300 dark:border-slate-600 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <h1 className="text-4xl font-bold text-center text-wood-700 dark:text-wood-300 mb-2">Da Vinci Code</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">Crack the code to win.</p>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                Total Players: {playerCount}
              </label>
              <input
                type="range"
                min="2"
                max="4"
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                className="w-full h-2 bg-wood-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-600 accent-wood-500"
              />
            </div>
            <div>
               <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                Bots: {botCount}
              </label>
              <input
                type="range"
                min="0"
                max={playerCount - 1}
                value={botCount}
                onChange={(e) => setBotCount(Number(e.target.value))}
                className="w-full h-2 bg-wood-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-600 accent-blue-500"
              />
            </div>
          </div>
          
          <div className="text-center py-1 bg-wood-100 dark:bg-slate-700 rounded-full">
            <span className="text-xs font-bold text-wood-800 dark:text-wood-200">
               {humanCount === 1 ? "1 Player Mode (VS Bots)" : `${humanCount} Players Mode`}
            </span>
          </div>

          <div className="flex items-center gap-3 bg-wood-50 dark:bg-slate-900/50 p-3 rounded-lg border border-wood-100 dark:border-slate-700">
              <input 
                type="checkbox" 
                id="jokers"
                checked={includeJokers}
                onChange={(e) => setIncludeJokers(e.target.checked)}
                className="w-5 h-5 text-wood-600 rounded focus:ring-wood-500"
              />
              <label htmlFor="jokers" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  Include Jokers (—)
                  <p className="text-[10px] font-normal text-gray-500">Adds 2 wildcard tiles.</p>
              </label>
          </div>

          <div className="bg-wood-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-3">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Player Details</h3>
            {playerDetails.map((player, idx) => (
              <div key={idx} className="flex items-center gap-3">
                 <button
                   onClick={() => {
                     const currentIdx = AVATARS.indexOf(player.avatar);
                     const nextIdx = (currentIdx + 1) % AVATARS.length;
                     updatePlayerDetail(idx, 'avatar', AVATARS[nextIdx]);
                   }}
                   className="text-xl w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full shadow-sm hover:scale-110 transition-transform"
                 >
                   {player.avatar}
                 </button>

                 <div className="flex-1">
                   <input
                     type="text"
                     value={player.name}
                     onChange={(e) => updatePlayerDetail(idx, 'name', e.target.value)}
                     className="w-full px-3 py-1 text-sm rounded-lg border border-wood-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-wood-400 focus:outline-none"
                     placeholder={`Name`}
                   />
                 </div>

                 {player.isBot && (
                   <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 text-[10px] font-bold rounded">
                     BOT
                   </span>
                 )}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Timer</label>
            <div className="flex gap-2 justify-center">
              {[30, 60, 90, 0].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimerSeconds(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                    timerSeconds === t
                      ? 'bg-wood-500 text-white'
                      : 'bg-wood-100 text-wood-800 dark:bg-slate-700 dark:text-slate-200 hover:bg-wood-200'
                  }`}
                >
                  {t === 0 ? 'Unlimited' : `${t}s`}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onStart({ playerCount, timerSeconds, botCount, playerDetails, includeJokers })}
            className="w-full py-4 bg-gradient-to-r from-wood-500 to-wood-600 hover:scale-105 text-white font-bold rounded-xl shadow-lg transition active:scale-95 text-lg"
          >
            Play Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;