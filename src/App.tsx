import React, { useEffect, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { SnakeScene } from './game/SnakeScene';
import { Volume2, VolumeX, RotateCcw, Play, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('snake-muted');
    return saved === 'true';
  });

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 400,
      height: 400,
      physics: { default: 'arcade' },
      scene: SnakeScene,
      backgroundColor: '#0f172a',
      transparent: true,
    };

    const game = new Phaser.Game(config);

    const onScoreUpdate = (e: any) => setScore(e.detail.score);
    const onGameOver = () => setIsGameOver(true);

    window.addEventListener('scoreUpdate', onScoreUpdate);
    window.addEventListener('gameOver', onGameOver);

    return () => {
      game.destroy(true);
      window.removeEventListener('scoreUpdate', onScoreUpdate);
      window.removeEventListener('gameOver', onGameOver);
    };
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake-high-score', score.toString());
    }
  }, [score, highScore]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('snake-muted', next.toString());
    window.dispatchEvent(new CustomEvent('toggleMute', { detail: { isMuted: next } }));
  };

  const startGame = () => {
    setIsStarted(true);
    setIsGameOver(false);
    setScore(0);
    window.dispatchEvent(new CustomEvent('startGame'));
  };

  const sendMove = (direction: string) => {
    window.dispatchEvent(new CustomEvent('moveSnake', { detail: { direction } }));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 select-none">
      
      {/* HUD */}
      <div className="w-full max-w-[400px] flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-emerald-500 italic tracking-tighter leading-none mb-1">
            NEON<span className="text-slate-100">SNAKE</span>
          </h1>
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Trophy size={16} className="text-amber-400" />
            <span>BEST: {highScore}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={toggleMute}
            className="p-2 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors border border-slate-800 text-slate-400"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <div className="text-4xl font-mono font-bold bg-slate-900 px-4 py-1 rounded-xl border-b-4 border-emerald-900 shadow-inner">
            {score.toString().padStart(3, '0')}
          </div>
        </div>
      </div>

      {/* Viewport */}
      <div className="relative group p-1 bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        <div 
          id="game-container" 
          className="rounded-xl overflow-hidden bg-slate-900"
        />

        {/* Screens */}
        <AnimatePresence>
          {!isStarted && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10"
            >
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-emerald-500 rounded-2xl rotate-12 animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.4)]" />
                <div className="absolute top-2 left-2 w-20 h-20 bg-emerald-600/50 rounded-2xl -rotate-6" />
              </div>
              <button
                onClick={startGame}
                className="group relative flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-4 px-10 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_8px_0_rgb(5,150,105)]"
              >
                <Play size={24} fill="currentColor" />
                PLAY NOW
              </button>
            </motion.div>
          )}

          {isGameOver && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-rose-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20"
            >
              <h2 className="text-5xl font-black mb-2 text-white drop-shadow-lg">CRASHED!</h2>
              <p className="text-xl mb-8 text-rose-200 font-bold opacity-80 uppercase tracking-widest">Score: {score}</p>
              <button
                onClick={startGame}
                className="flex items-center gap-3 bg-white text-rose-600 font-black py-4 px-10 rounded-2xl hover:bg-rose-50 transition-all transform hover:scale-105 active:scale-95 shadow-[0_8px_0_rgb(225,225,225)]"
              >
                <RotateCcw size={24} strokeWidth={3} />
                RETRY
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Controls */}
      <div className="mt-10 grid grid-cols-3 gap-3 md:hidden">
        <div />
        <ControlButton icon={<ArrowUp />} onClick={() => sendMove('UP')} />
        <div />
        <ControlButton icon={<ArrowLeft />} onClick={() => sendMove('LEFT')} />
        <ControlButton icon={<ArrowDown />} onClick={() => sendMove('DOWN')} />
        <ControlButton icon={<ArrowRight />} onClick={() => sendMove('RIGHT')} />
      </div>

      <div className="hidden md:flex mt-10 gap-8 text-slate-500 text-sm font-bold tracking-widest uppercase">
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-lg border border-slate-800">
          <span className="text-slate-300">WASD</span>
          <span>TO MOVE</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-lg border border-slate-800">
          <span className="text-slate-300">SPACE</span>
          <span>PAUSE</span>
        </div>
      </div>
    </div>
  );
};

const ControlButton = ({ icon, onClick }: { icon: React.ReactNode, onClick: () => void }) => (
  <button 
    onPointerDown={onClick}
    className="w-16 h-16 bg-slate-800/50 backdrop-blur-sm rounded-2xl flex items-center justify-center active:bg-emerald-500 active:text-slate-900 active:scale-90 transition-all border-b-4 border-slate-900 active:border-b-0 text-slate-400"
  >
    {icon}
  </button>
);

export default App;