'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrainCircuit, Heart, Timer, ArrowRight, CheckCircle2, XCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface Concept {
  id: string;
  name: string;
  material_id: string;
}

export default function EnigmaWorkspace({ concept }: { concept: Concept }) {
  const router = useRouter();
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  const [clues, setClues] = useState<string[]>([]);
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>([]);
  
  const [currentClueIndex, setCurrentClueIndex] = useState(0);
  const [strikesLeft, setStrikesLeft] = useState(5);
  const [timeLeft, setTimeLeft] = useState(60);
  const [guess, setGuess] = useState('');
  
  const [isShaking, setIsShaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    generateClues();
  }, [concept.id]);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return 30; // Reset to 30s after timeout strike
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, currentClueIndex, strikesLeft]);

  const generateClues = async () => {
    try {
      const res = await fetch('/api/ai/enigma-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId: concept.id })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate Enigma clues');
      }

      setClues(data.enigma.clues);
      setAcceptedAnswers(data.enigma.accepted_answers);
      setGameState('playing');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to load Enigma game.');
    }
  };

  const handleTimeout = () => {
    if (strikesLeft <= 1) {
      setStrikesLeft(0);
      setGameState('lost');
    } else {
      setStrikesLeft((s) => s - 1);
      if (currentClueIndex < 4) {
        setCurrentClueIndex((i) => i + 1);
      }
    }
  };

  const normalizeText = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const submitGuess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guess.trim() || gameState !== 'playing') return;

    const normalizedGuess = normalizeText(guess);
    const isCorrect = acceptedAnswers.some(ans => normalizeText(ans) === normalizedGuess);

    if (isCorrect) {
      setGameState('won');
    } else {
      // Wrong guess
      triggerShake();
      const newStrikes = strikesLeft - 1;
      
      if (newStrikes <= 0) {
        setStrikesLeft(0);
        setGameState('lost');
      } else {
        setStrikesLeft(newStrikes);
        setTimeLeft((prev) => Math.max(1, prev - 5)); // Penalize 5 seconds
        if (currentClueIndex < 4) {
          setCurrentClueIndex((i) => i + 1);
        }
      }
    }
    setGuess('');
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  if (gameState === 'loading') {
    return (
      <main className="min-h-screen bg-[#111111] flex flex-col items-center justify-center text-white">
        {errorMessage ? (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-xl">
            {errorMessage}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            <BrainCircuit className="w-16 h-16 text-emerald-400 animate-pulse" />
            <h2 className="text-2xl font-bold tracking-widest text-emerald-100 uppercase">Constructing Enigma...</h2>
            <p className="text-gray-400">Diagnosing concept constraints...</p>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] flex flex-col items-center pt-16 px-4 font-sans text-gray-100 relative overflow-hidden">
      
      {/* Top Nav */}
      <div className="absolute top-6 left-6">
        <Link href={`/materials/${concept.material_id}/study`} className="flex items-center text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back to Study
        </Link>
      </div>

      <div className="max-w-2xl w-full space-y-8 z-10 relative">
        
        {/* Header HUD */}
        <div className="flex justify-between items-center bg-gray-900 p-4 rounded-2xl border border-gray-800 shadow-2xl">
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <Heart 
                key={i} 
                className={`w-6 h-6 ${i < strikesLeft ? 'text-red-500 fill-red-500' : 'text-gray-700'}`} 
              />
            ))}
          </div>
          
          <div className="flex flex-col items-end">
            <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xl">
              <Timer className="w-5 h-5" />
              <span>{timeLeft}s</span>
            </div>
            <div className="w-32 h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-1000 ease-linear" 
                style={{ width: `${Math.min(100, (timeLeft / 60) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Clue Feed */}
        <div className="space-y-4">
          {clues.map((clue, idx) => (
            idx <= currentClueIndex && (
              <div 
                key={idx} 
                className="bg-gray-800/80 border border-gray-700 p-6 rounded-2xl shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-500"
              >
                <div className="text-emerald-500 font-bold uppercase tracking-widest text-xs mb-2">
                  {idx === 0 && "Stage 1: The Shadow"}
                  {idx === 1 && "Stage 2: The Constraint"}
                  {idx === 2 && "Stage 3: The Behavior"}
                  {idx === 3 && "Stage 4: The Lens"}
                  {idx === 4 && "Stage 5: The Keystone"}
                </div>
                <p className="text-xl leading-relaxed text-gray-200">{clue}</p>
              </div>
            )
          ))}
        </div>

        {/* Interaction Area */}
        {gameState === 'playing' ? (
          <form onSubmit={submitGuess} className="relative mt-8">
            <style jsx>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-10px); }
                40%, 80% { transform: translateX(10px); }
              }
              .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
            `}</style>
            
            <div className={`relative ${isShaking ? 'animate-shake' : ''}`}>
              <Input
                autoFocus
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Deduce the concept..."
                className="w-full bg-gray-900 border-2 border-gray-700 text-white placeholder:text-gray-500 text-lg py-7 px-6 rounded-2xl shadow-xl focus-visible:ring-emerald-500"
              />
              <Button 
                type="submit" 
                className="absolute right-2 top-2 bottom-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-6"
              >
                Guess <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        ) : (
          <div className={`p-8 rounded-2xl text-center space-y-6 ${gameState === 'won' ? 'bg-emerald-900/30 border border-emerald-500/50' : 'bg-red-900/30 border border-red-500/50'} animate-in zoom-in-95 duration-500`}>
            {gameState === 'won' ? (
              <>
                <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto" />
                <h2 className="text-3xl font-bold text-emerald-100">Diagnosis Correct!</h2>
                <p className="text-emerald-200/80 text-lg">You deduced it in {currentClueIndex + 1} clue{currentClueIndex > 0 ? 's' : ''}.</p>
              </>
            ) : (
              <>
                <XCircle className="w-20 h-20 text-red-400 mx-auto" />
                <h2 className="text-3xl font-bold text-red-100">Diagnosis Failed</h2>
                <p className="text-red-200/80 text-lg">The correct concept was:</p>
                <div className="text-2xl font-bold text-white uppercase tracking-wider">{concept.name}</div>
              </>
            )}
            
            <Button 
              onClick={() => router.push('/assess')}
              className="mt-6 bg-gray-800 hover:bg-gray-700 text-white"
              size="lg"
            >
              Return to Hub
            </Button>
          </div>
        )}

      </div>
    </main>
  );
}
