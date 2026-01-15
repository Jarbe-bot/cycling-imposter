import React, { useState, useEffect } from 'react';
import { Quiz, UserStats, Cyclist } from '../types';
import { INITIAL_CYCLISTS } from '../constants';

// --- HULP COMPONENT: COUNTDOWN TIMER ---
const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); 
      
      const diff = tomorrow.getTime() - now.getTime();
      
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft()); 

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#0d1c12] rounded-lg px-4 py-2 inline-block border border-[#22492f]">
        <p className="text-xl md:text-2xl font-mono font-bold text-primary tracking-widest">{timeLeft}</p>
    </div>
  );
};

interface FrontendViewProps {
  quiz: Quiz;
  cyclists: Cyclist[];
  userStats: UserStats;
  updateStats: (score: number) => void;
  onGoAdmin: () => void;
}

const FrontendView: React.FC<FrontendViewProps> = ({ quiz, cyclists, userStats, updateStats, onGoAdmin }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  
  const [showSupportModal, setShowSupportModal] = useState(false);

  const activeCyclistList = cyclists.length > 0 ? cyclists : INITIAL_CYCLISTS;

  // --- NIEUW: CHECK OF ER AL GESPEELD IS VANDAAG ---
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('last_played_date');

    // Als de datum van vandaag overeenkomt met de laatst gespeelde datum
    if (lastDate === today) {
        // Haal de oude gegevens op
        const savedScore = localStorage.getItem('last_played_score');
        const savedSelection = localStorage.getItem('last_played_selection');

        if (savedScore && savedSelection) {
            setScore(parseInt(savedScore));
            setSelectedIds(JSON.parse(savedSelection));
            setIsSubmitted(true); // Blokkeer het spel direct
        }
    }
  }, []);

  const toggleSelect = (id: string) => {
    if (isSubmitted) return; // Je mag niet klikken als je al klaar bent
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    let currentScore = 0;
    quiz.slots.forEach(slot => {
      const isSelected = selectedIds.includes(slot.cyclistId);
      const correctlyIdentified = (isSelected && !slot.isImposter) || (!isSelected && slot.isImposter);
      if (correctlyIdentified) currentScore++;
    });
    
    setScore(currentScore);
    setIsSubmitted(true);
    updateStats(currentScore);
    
    // --- NIEUW: SLA ALLES OP VOOR VANDAAG ---
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('last_played_date', today);
    localStorage.setItem('last_played_score', currentScore.toString());
    localStorage.setItem('last_played_selection', JSON.stringify(selectedIds)); // Sla de keuzes op
    
    createCelebration();
  };

  const handleShare = () => {
    const shareUrl = "https://cyclingimposter.com"; // Hier zetten we nu hard de echte URL
    const text = `🚴 Cycling Imposter\n🏆 Score: ${score}/8\n🔥 Streak: ${userStats.streak}\n\nCan you spot the fake riders?\n👉 Play at: ${shareUrl}`;
    
    navigator.clipboard.writeText(text).then(() => {
        alert("Result copied to clipboard!");
    });
  };

  const createCelebration = () => {
    const emojis = ['🏆', '🎉', '✨', '🥇'];
    const container = document.body;
    for (let i = 0; i < 20; i++) {
      spawnParticle(container, emojis[Math.floor(Math.random() * emojis.length)], 'slow');
    }
  };

  const triggerGigiSprint = () => {
    const items = ['🚴', '💨', '⚡', 'GO GIGI!', 'FULL GAS!', '🔥'];
    const container = document.body;
    for (let i = 0; i < 25; i++) {
        setTimeout(() => {
            spawnParticle(container, items[Math.floor(Math.random() * items.length)], 'fast');
        }, i * 40); 
    }
  };

  const spawnParticle = (container: HTMLElement, content: string, speed: 'slow' | 'fast') => {
    const div = document.createElement('div');
    div.className = 'celebration-emoji'; 
    div.textContent = content;
    
    div.style.left = `${Math.random() * 90 + 5}%`;
    div.style.bottom = '-80px';
    div.style.position = 'fixed';
    div.style.zIndex = '100';
    div.style.pointerEvents = 'none'; 
    div.style.willChange = 'transform, opacity';
    
    const size = Math.random() * 2 + 1.5; 
    div.style.fontSize = `${size}rem`;
    
    if (content.length > 2) {
        div.style.fontSize = `${size * 0.7}rem`;
        div.style.fontWeight = '900';
        div.style.color = '#fff';
        div.style.textShadow = '2px 2px 0px #000';
        div.style.fontFamily = 'system-ui, sans-serif';
        div.style.whiteSpace = 'nowrap';
    }

    const duration = speed === 'fast' ? 1200 + Math.random() * 800 : 2500 + Math.random() * 1000;

    const animation = div.animate([
      { transform: 'translateY(0) scale(0.5)', opacity: 0 },
      { transform: 'translateY(-20vh) scale(1.1)', opacity: 1, offset: 0.15 },
      { transform: `translateY(-110vh) scale(1) rotate(${Math.random() * 40 - 20}deg)`, opacity: 0 }
    ], {
      duration: duration,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    });

    container.appendChild(div);
    animation.onfinish = () => div.remove();
  };

  const maxHistoryValue = Math.max(...Object.values(userStats.history), 1);

  return (
    <div className="flex grow flex-col items-center w-full">
      <header className="sticky top-0 z-40 w-full border-b border-[#22492f] bg-[#102316]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-background-dark shadow-neon">
              <span className="material-symbols-outlined text-2xl">directions_bike</span>
            </div>
            <h1 className="hidden text-xl font-bold tracking-tight text-white sm:block">Cycling Imposter</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSupportModal(true)}
              className="flex size-10 items-center justify-center rounded-full bg-[#1a3322] text-red-400 transition-all hover:bg-red-500/20 hover:scale-110 active:scale-95"
              title="Support the Dev"
            >
              <span className="material-symbols-outlined">favorite</span>
            </button>

            <button 
                onClick={triggerGigiSprint}
                className="group relative flex h-10 items-center justify-center gap-2 overflow-hidden rounded-full bg-[#1a3322] px-5 text-sm font-bold text-primary transition-all hover:bg-primary hover:text-background-dark hover:shadow-neon active:scale-95"
            >
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:rotate-12 group-active:animate-ping">celebration</span>
                <span className="truncate">Go Gigi</span>
                <div className="absolute inset-0 -z-10 translate-y-full bg-gradient-to-t from-primary/20 to-transparent transition-transform duration-300 group-hover:translate-y-0"></div>
            </button>
          </div>
        </div>
      </header>

      <main className="flex grow flex-col items-center w-full pb-12">
        <div className="flex w-full max-w-[960px] flex-col px-4 py-8 sm:px-6 lg:px-8">
          
          <div className="mb-8 flex flex-col items-center justify-center gap-2 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              Daily Challenge
            </div>
            <h2 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              {quiz.statement}
            </h2>
            <p className="mt-2 text-lg font-medium text-gray-400">Select the riders that match the statement.</p>
          </div>

          {/* GRID */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {quiz.slots.map((slot) => {
              const cyclist = activeCyclistList.find(c => c.id === slot.cyclistId);
              
              if (!cyclist) {
                  return <div key={slot.cyclistId} className="aspect-[3/4] bg-[#102216] rounded-xl border border-dashed border-[#22492f] flex items-center justify-center text-xs text-gray-600">Loading...</div>;
              }
              
              const isSelected = selectedIds.includes(cyclist.id);
              const isImposter = slot.isImposter;
              const isCorrect = (isSelected && !isImposter) || (!isSelected && isImposter);
              
              let borderClass = 'hover:shadow-xl';
              let overlayColor = '';
              let statusText = '';
              let statusIcon = '';

              if (isSubmitted) {
                if (isCorrect) {
                    borderClass = 'ring-4 ring-green-500 ring-offset-2 ring-offset-background-dark';
                    overlayColor = 'bg-green-900/60';
                    statusText = isImposter ? 'CORRECTLY AVOIDED' : 'CORRECTLY PICKED';
                    statusIcon = 'check_circle';
                } else {
                    borderClass = 'ring-4 ring-red-500 ring-offset-2 ring-offset-background-dark';
                    overlayColor = 'bg-red-900/60';
                    statusText = isImposter ? 'MISSED IMPOSTER' : 'MISSED RIDER';
                    statusIcon = 'cancel';
                }
              } else if (isSelected) {
                borderClass = 'ring-4 ring-primary ring-offset-2 ring-offset-background-dark shadow-neon';
              }

              return (
                <div 
                  key={cyclist.id}
                  onClick={() => toggleSelect(cyclist.id)}
                  className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl bg-card-dark transition-all hover:-translate-y-1 ${borderClass}`}
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#0d1c12]">
                    <img 
                        src={cyclist.imageUrl} 
                        alt={cyclist.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => (e.currentTarget.src = 'https://placehold.co/400x600?text=No+Image')}
                    />
                    
                    {!isSubmitted && (
                        <div className={`absolute top-3 right-3 z-20 flex size-8 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected ? 'bg-primary border-primary text-background-dark shadow-neon' : 'border-white/30 bg-black/20 opacity-0 group-hover:opacity-100'
                        }`}>
                        <span className="material-symbols-outlined font-bold text-sm">check</span>
                        </div>
                    )}

                    {isSubmitted && (
                        <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-0 ${overlayColor}`}>
                            <span className={`material-symbols-outlined text-4xl mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                {statusIcon}
                            </span>
                            <span className="font-bold text-sm tracking-widest text-white text-center px-2">
                                {statusText}
                            </span>
                        </div>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 z-20 w-full p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                    <p className="text-base font-bold leading-tight text-white">{cyclist.name}</p>
                    <p className="text-xs text-gray-400">{cyclist.team}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {!isSubmitted ? (
            <div className="sticky bottom-6 z-30 mt-8 flex justify-center">
              <button onClick={handleSubmit} className="flex items-center gap-2 bg-primary px-10 py-4 rounded-full font-bold text-xl text-background-dark shadow-neon hover:scale-105 transition-transform">
                SUBMIT ANSWERS <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          ) : (
            // RESULT & STATS SECTION
            <div className="mt-12 flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-[#1a3322] border border-[#22492f] rounded-2xl p-8 w-full max-w-md text-center shadow-2xl relative overflow-hidden mb-8">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                    
                    <span className="material-symbols-outlined text-6xl text-primary mb-4 block">
                        {score === 8 ? 'military_tech' : 'emoji_events'}
                    </span>
                    
                    <h3 className="text-4xl font-black text-white mb-2">{score} / 8</h3>
                    <p className="text-gray-400 mb-6">{score === 8 ? "Perfect Score!" : "Good job!"}</p>

                    <button onClick={handleShare} className="w-full bg-primary hover:bg-primary-dark text-background-dark font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors mb-6">
                        <span className="material-symbols-outlined">share</span> Share Result
                    </button>
                    
                    {/* STATS */}
                    <div className="grid grid-cols-2 gap-4 border-t border-[#22492f] py-6">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Streak</p>
                            <p className="text-2xl font-bold text-white flex items-center justify-center gap-1">
                                {userStats.streak} <span className="text-orange-500 text-lg">🔥</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Total Played</p>
                            <p className="text-2xl font-bold text-white">{userStats.played}</p>
                        </div>
                    </div>

                    {/* COUNTDOWN TIMER */}
                    <div className="border-t border-[#22492f] pt-4">
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Next Challenge In</p>
                        <CountdownTimer />
                    </div>
                </div>

                <div className="w-full max-w-md">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">bar_chart</span>
                        Score Distribution
                    </h3>
                    <div className="flex flex-col gap-2">
                        {[8, 7, 6, 5, 4, 3, 2, 1, 0].map(scoreVal => {
                            const count = userStats.history[scoreVal] || 0;
                            const widthPercentage = (count / maxHistoryValue) * 100;
                            const isCurrentScore = isSubmitted && score === scoreVal;
                            
                            return (
                                <div key={scoreVal} className="flex items-center gap-3">
                                    <span className="w-4 text-right text-xs font-bold text-gray-500">{scoreVal}</span>
                                    <div className="flex-1 h-8 bg-[#0d1c12] rounded-md overflow-hidden relative">
                                        <div 
                                            className={`h-full flex items-center justify-end px-2 transition-all duration-1000 ${isCurrentScore ? 'bg-primary text-background-dark' : 'bg-[#22492f] text-white'}`}
                                            style={{ width: `${Math.max(widthPercentage, count > 0 ? 8 : 0)}%` }}
                                        >
                                            {count > 0 && <span className="text-xs font-bold">{count}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
          )}

          {/* --- DE ECHTE FOOTER (Altijd zichtbaar) --- */}
          <div className="mt-24 mb-8 flex flex-col items-center gap-4 text-center w-full">
            
            <p className="text-xs text-gray-500 opacity-80">
              Proudly presented by the <span className="font-bold text-primary">Georg Zimmermann Community</span>
            </p>

            <div className="flex gap-4 text-xs text-gray-400">
              <a 
                href="https://www.instagram.com/georgzimmermann_fa/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors hover:underline"
              >
                Instagram
              </a>
              <span>•</span>
              <a 
                href="mailto:hello@cyclingimposter.com" 
                className="hover:text-primary transition-colors hover:underline"
              >
                Contact & Bugs
              </a>
            </div>

            <button onClick={onGoAdmin} className="mt-4 opacity-20 hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-gray-500">
                <span className="material-symbols-outlined text-[12px]">lock</span> Admin
            </button>

          </div>
        </div>
      </main>

      {/* SUPPORT MODAL */}
      {showSupportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface-dark border border-[#22492f] w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
                <button 
                    onClick={() => setShowSupportModal(false)}
                    className="absolute top-4 right-4 text-text-muted hover:text-white"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
                
                <div className="flex flex-col items-center text-center">
                    <div className="bg-red-500/10 p-4 rounded-full mb-4">
                        <span className="material-symbols-outlined text-4xl text-red-500">favorite</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Enjoying the Game?</h3>
                    <p className="text-gray-400 text-sm mb-6">
                        Cycling Imposter is a free hobby project. If you'd like to fuel the developer's rides, a coffee is always appreciated! ☕️
                    </p>

                    <a 
                        href="https://buymeacoffee.com/zimmerfann" 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full bg-[#FFDD00] text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all mb-3"
                    >
                        <span className="material-symbols-outlined">coffee</span>
                        Buy me a Coffee
                    </a>
                    
                    <p className="text-xs text-gray-600 mt-4">
                        Thank you for playing & keep riding! 🚴
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default FrontendView;