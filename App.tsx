
import React, { useState, useCallback } from 'react';
import PoolTable from './components/PoolTable';
import { GameMode, GameStatus } from './types';
import { initAudio } from './engine/audio';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [mode, setMode] = useState<GameMode>(GameMode.PvP);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [winner, setWinner] = useState<number | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState(0.1);

  const startGame = useCallback((selectedMode: GameMode) => {
    initAudio();
    setMode(selectedMode);
    setScores([0, 0]);
    setWinner(null);
    setCurrentPlayer(0);
    setAiDifficulty(0.1);
    setStatus(GameStatus.PLAYING);
  }, []);

  const handleGameOver = useCallback((winningPlayer: number) => {
    setWinner(winningPlayer);
    setStatus(GameStatus.GAMEOVER);
  }, []);

  const handleScoreUpdate = useCallback((newScores: [number, number]) => {
    setScores(newScores);
  }, []);

  const handleTurnChange = useCallback((newPlayer: number) => {
    setCurrentPlayer(newPlayer);
  }, []);

  const handleDifficultyChange = useCallback((diff: number) => {
    setAiDifficulty(diff);
  }, []);

  const getDifficultyLabel = (diff: number) => {
    if (diff < 0.3) return 'Beginner';
    if (diff < 0.6) return 'Advanced';
    if (diff < 0.9) return 'Expert';
    return 'Master';
  };

  return (
    <div className="fixed inset-0 bg-[#020617] text-slate-100 flex flex-col items-center select-none overflow-hidden touch-none font-sans">
      <div className="w-full max-w-5xl px-4 py-2 sm:py-4 flex justify-between items-center z-10 shrink-0 h-12 sm:h-20">
        <h1 className="text-sm sm:text-2xl font-black tracking-widest text-emerald-400">
          ZENITH<span className="text-slate-500 font-light">POOL</span>
        </h1>
        
        {status === GameStatus.PLAYING && (
          <div className="flex flex-col items-center">
            <div className="flex gap-2 sm:gap-6 items-center bg-white/5 backdrop-blur-md px-3 sm:px-6 py-1 sm:py-2 rounded-full border border-white/10 shadow-xl">
              <div className={`flex items-center gap-2 transition-all duration-300 ${currentPlayer === 0 ? 'scale-110' : 'opacity-40 scale-90'}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_emerald]"></div>
                <span className="text-xs sm:text-lg font-bold">P1: {scores[0]}</span>
              </div>
              <div className="w-px h-4 bg-white/20"></div>
              <div className={`flex items-center gap-2 transition-all duration-300 ${currentPlayer === 1 ? 'scale-110' : 'opacity-40 scale-90'}`}>
                <span className="text-xs sm:text-lg font-bold">
                  {mode === GameMode.PvE ? 'AI' : mode === GameMode.EvE ? 'AI2' : 'P2'}: {scores[1]}
                </span>
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_indigo]"></div>
              </div>
            </div>
            {mode !== GameMode.PvP && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[8px] uppercase text-slate-500 tracking-widest font-bold">Adaptive AI: {getDifficultyLabel(aiDifficulty)}</span>
                <div className="w-16 sm:w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${aiDifficulty * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <button 
          onClick={() => setStatus(GameStatus.MENU)}
          className="text-[10px] sm:text-sm px-2 py-1 sm:px-4 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 transition-colors"
        >
          {status === GameStatus.MENU ? 'Reset' : 'Quit'}
        </button>
      </div>

      <div className="flex-1 w-full flex items-center justify-center relative px-2">
        {status === GameStatus.MENU && (
          <div className="w-full max-w-sm bg-slate-900/90 backdrop-blur-2xl p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-emerald-400 tracking-widest uppercase">Zenith Hall</h2>
              <p className="text-slate-500 text-xs">Proprietary Physics Simulation</p>
            </div>
            <div className="grid gap-4">
              {[
                { m: GameMode.PvP, t: 'Local Duel', d: 'Peer-to-Peer match' },
                { m: GameMode.PvE, t: 'AI Challenge', d: 'Dynamic strengthening AI' },
                { m: GameMode.EvE, t: 'Spectator', d: 'Zero-player simulation' }
              ].map((item) => (
                <button 
                  key={item.m}
                  onClick={() => startGame(item.m)}
                  className="w-full text-left p-4 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/50 rounded-xl transition-all group"
                >
                  <h3 className="font-bold text-lg group-hover:text-emerald-400">{item.t}</h3>
                  <p className="text-xs text-slate-500">{item.d}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {status === GameStatus.PLAYING && (
          <div className="w-full h-full flex flex-col items-center justify-center">
             <PoolTable 
               mode={mode} 
               onGameOver={handleGameOver}
               onScoreUpdate={handleScoreUpdate}
               onTurnChange={handleTurnChange}
               onAIDifficultyChange={handleDifficultyChange}
             />
             <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-500 hidden sm:block">
                Original Vector Engine • Pull Back to Shoot
             </div>
          </div>
        )}

        {status === GameStatus.GAMEOVER && (
          <div className="max-w-xs w-full bg-slate-900/95 backdrop-blur-2xl p-8 rounded-3xl border border-emerald-500/50 shadow-2xl text-center space-y-6">
            <h2 className="text-3xl font-black text-emerald-400 tracking-tighter uppercase italic">Victory</h2>
            <div className="text-xl font-bold">
              {winner === 0 ? 'SIDE ALPHA' : 'SIDE BETA'} WINS
            </div>
            <button 
              onClick={() => setStatus(GameStatus.MENU)}
              className="w-full py-4 bg-emerald-500 text-slate-950 font-black rounded-xl hover:bg-emerald-400 transition-transform active:scale-95"
            >
              NEW SIMULATION
            </button>
          </div>
        )}
      </div>

      <div className="h-6 sm:h-10 text-[8px] sm:text-[10px] text-slate-600 flex items-center uppercase tracking-[0.2em] font-light">
        © 2024 Zenith Physics Lab • Independent Asset-Free Implementation
      </div>
    </div>
  );
};

export default App;
