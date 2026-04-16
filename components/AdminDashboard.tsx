import React, { useState, useEffect, useRef } from 'react';
import { Quiz, Cyclist } from '../types';
import { supabase } from '../supabaseClient';
import { INITIAL_QUIZ } from '../constants';
import html2canvas from 'html2canvas';

interface AdminDashboardProps {
  quiz: Quiz;
  cyclists: Cyclist[];
  setQuiz: React.Dispatch<React.SetStateAction<Quiz>>;
  onNavigateToDatabase: () => void;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ quiz, cyclists, setQuiz, onNavigateToDatabase, onLogout }) => {
  const [localQuiz, setLocalQuiz] = useState<Quiz>(quiz);
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [stats, setStats] = useState({ plays: 0, avgScore: 0, perfectScores: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [quizDates, setQuizDates] = useState<string[]>([]);
  const [dailyStats, setDailyStats] = useState<{date: string, onTime: number, late: number}[]>([]); 

  const [showPicker, setShowPicker] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [showMoveModal, setShowMoveModal] = useState(false); 
  const [moveTargetDate, setMoveTargetDate] = useState('');
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalQuiz(quiz);
  }, [quiz]);

  useEffect(() => {
    fetchQuizDates();
    fetchDailyPlayerStats();
  }, []);

  useEffect(() => {
    fetchQuizForDate(selectedDate);
    fetchStatsForDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (showMoveModal && dateInputRef.current) {
        setTimeout(() => {
            try {
                dateInputRef.current?.showPicker();
            } catch (e) {
                console.log("Browser ondersteunt showPicker niet automatisch");
            }
        }, 100);
    }
  }, [showMoveModal]);

  const fetchQuizDates = async () => {
    const { data } = await supabase.from('daily_quizzes').select('date');
    if (data) {
        setQuizDates(data.map(d => d.date));
    }
  };

  const fetchDailyPlayerStats = async () => {
    const getLocalDateString = (d: Date) => {
      const offset = d.getTimezoneOffset();
      return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    };

    const counts: Record<string, { onTime: number, late: number }> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const oldestDate = getLocalDateString(thirtyDaysAgo);

    for (let i = 29; i >= 0; i--) {
         const d = new Date();
         d.setDate(d.getDate() - i);
         counts[getLocalDateString(d)] = { onTime: 0, late: 0 };
    }

    let allData: any[] = [];
    let hasMore = true;
    let offsetStart = 0;
    const limit = 1000;

    while (hasMore) {
        const { data, error } = await supabase
            .from('game_results')
            .select('quiz_date, created_at')
            .gte('quiz_date', oldestDate)
            .range(offsetStart, offsetStart + limit - 1);

        if (error) {
            console.error("Error loading graph data:", error);
            break;
        }

        if (data && data.length > 0) {
            allData = [...allData, ...data];
            if (data.length < limit) {
                hasMore = false;
            } else {
                offsetStart += limit;
            }
        } else {
            hasMore = false;
        }
    }

    allData.forEach(r => {
        const playedAt = getLocalDateString(new Date(r.created_at));
        const quizDate = r.quiz_date;

        if (counts[quizDate]) {
            if (playedAt === quizDate) {
                counts[quizDate].onTime++; 
            } else {
                counts[quizDate].late++;   
            }
        }
    });

    const statsArray = Object.entries(counts)
        .map(([date, val]) => ({ date, onTime: val.onTime, late: val.late }))
        .sort((a, b) => a.date.localeCompare(b.date));
    
    setDailyStats(statsArray);
  };

  const fetchStatsForDate = async (date: string) => {
    setIsLoadingStats(true);
    try {
        const { data, error } = await supabase
            .from('game_results')
            .select('score')
            .eq('quiz_date', date);

        if (error) throw error;

        if (data && data.length > 0) {
            const totalPlays = data.length;
            const totalScore = data.reduce((acc, curr) => acc + curr.score, 0);
            const avg = totalScore / totalPlays;
            const perfect = data.filter(r => r.score === 8).length;

            setStats({
                plays: totalPlays,
                avgScore: parseFloat(avg.toFixed(1)),
                perfectScores: perfect
            });
        } else {
            setStats({ plays: 0, avgScore: 0, perfectScores: 0 });
        }
    } catch (err) {
        console.error("Error fetching stats:", err);
    } finally {
        setIsLoadingStats(false);
    }
  };

  const fetchQuizForDate = async (date: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_quizzes')
        .select('*')
        .eq('date', date)
        .single();

      if (data) {
        setLocalQuiz({
            id: data.id,
            statement: data.statement,
            slots: data.slots
        });
      } else {
        let randomSlots = INITIAL_QUIZ.slots;
        if (cyclists.length >= 8) {
            const shuffled = [...cyclists].sort(() => 0.5 - Math.random());
            randomSlots = shuffled.slice(0, 8).map(c => ({
                cyclistId: c.id,
                isImposter: false
            }));
        }
        setLocalQuiz({
            ...INITIAL_QUIZ,
            statement: "",
            slots: randomSlots
        });
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const { error } = await supabase.from('daily_quizzes').upsert({
            date: selectedDate,
            statement: localQuiz.statement,
            slots: localQuiz.slots
        }, { onConflict: 'date' });

        if (error) throw error;
        
        if (!quizDates.includes(selectedDate)) {
            setQuizDates([...quizDates, selectedDate]);
        }
        
        alert(`Quiz voor ${selectedDate} opgeslagen!`);
    } catch (error: any) {
        console.error("Save failed:", error);
        alert("Fout bij opslaan: " + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleMoveQuiz = async () => {
    if (!moveTargetDate) return alert("Kies eerst een datum!");

    const { data: existing } = await supabase
      .from('daily_quizzes')
      .select('id')
      .eq('date', moveTargetDate)
      .maybeSingle();

    if (existing) {
      return alert(`⚠️ Pas op: Er staat al een quiz op ${moveTargetDate}. Verwijder die eerst of kies een andere dag.`);
    }

    const { error } = await supabase
      .from('daily_quizzes')
      .update({ date: moveTargetDate })
      .eq('date', selectedDate);

    if (error) {
      console.error(error);
      alert("Er ging iets mis bij het verplaatsen.");
    } else {
      alert(`Quiz succesvol verplaatst naar ${moveTargetDate}! De huidige datum is nu vrij.`);
      setShowMoveModal(false);
      setMoveTargetDate('');
      
      setQuizDates(prev => {
        const filtered = prev.filter(d => d !== selectedDate);
        return [...filtered, moveTargetDate];
      });

      fetchQuizForDate(selectedDate);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!confirm(`Weet je zeker dat je de quiz van ${selectedDate} wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)) {
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('daily_quizzes')
        .delete()
        .eq('date', selectedDate);

      if (error) throw error;

      setQuizDates(prev => prev.filter(d => d !== selectedDate));
      fetchQuizForDate(selectedDate);
      
      alert("Quiz verwijderd!");
    } catch (error: any) {
      console.error("Delete failed:", error);
      alert("Fout bij verwijderen: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalQuiz(prev => ({ ...prev, statement: e.target.value }));
  };

  const toggleSlotImposter = (cyclistId: string) => {
    setLocalQuiz(prev => ({
      ...prev,
      slots: prev.slots.map(s => s.cyclistId === cyclistId ? { ...s, isImposter: !s.isImposter } : s)
    }));
  };

  const changeCyclistInSlot = (slotIndex: number, newCyclistId: string) => {
    setLocalQuiz(prev => {
      const newSlots = [...prev.slots];
      newSlots[slotIndex] = { ...newSlots[slotIndex], cyclistId: newCyclistId, isImposter: false };
      return { ...prev, slots: newSlots };
    });
    setShowPicker(null);
    setPickerSearch('');
  };

  // --- SCREENSHOT FUNCTIE MET DUBBELE PROXY FALLBACK ---
  const downloadShareImage = async () => {
    const element = document.getElementById('hidden-share-template');
    const btn = document.getElementById('download-share-btn');
    if (!element) return alert("Sjabloon niet gevonden!");

    if (btn) btn.innerText = "DOWNLOADING IMAGES...";

    try {
      await document.fonts.ready;

      const imageDivs = Array.from(element.querySelectorAll('.share-cyclist-photo'));
      await Promise.all(imageDivs.map(async (el) => {
          const div = el as HTMLElement;
          const originalSrc = div.getAttribute('data-img-src'); 

          if (originalSrc && originalSrc.startsWith('http') && !originalSrc.startsWith('data:') && !originalSrc.includes(window.location.hostname)) {
              let base64 = '';
              
              try {
                  // POGING 1: Direct ophalen
                  const fetchUrl = originalSrc + (originalSrc.includes('?') ? '&' : '?') + 'notcache=' + new Date().getTime();
                  const res = await fetch(fetchUrl, { mode: 'cors' });
                  
                  const contentType = res.headers.get('content-type');
                  if (!res.ok || !contentType || !contentType.startsWith('image/')) {
                      throw new Error("Directe fetch faalde of gaf geen afbeelding");
                  }

                  const blob = await res.blob();
                  base64 = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.readAsDataURL(blob);
                  });
              } catch (err1) {
                  try {
                      // POGING 2: AllOrigins Proxy (Vaak stabieler)
                      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalSrc)}`;
                      const res = await fetch(proxyUrl);
                      
                      const contentType = res.headers.get('content-type');
                      if (!res.ok || !contentType || !contentType.startsWith('image/')) {
                          throw new Error("AllOrigins faalde");
                      }

                      const blob = await res.blob();
                      base64 = await new Promise<string>((resolve) => {
                          const reader = new FileReader();
                          reader.onloadend = () => resolve(reader.result as string);
                          reader.readAsDataURL(blob);
                      });
                  } catch (err2) {
                      try {
                          // POGING 3: CorsProxy.io (De oude back-up)
                          const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent(originalSrc)}`;
                          const res = await fetch(proxyUrl2);
                          
                          const contentType = res.headers.get('content-type');
                          if (!res.ok || !contentType || !contentType.startsWith('image/')) {
                              throw new Error("CorsProxy faalde");
                          }

                          const blob = await res.blob();
                          base64 = await new Promise<string>((resolve) => {
                              const reader = new FileReader();
                              reader.onloadend = () => resolve(reader.result as string);
                              reader.readAsDataURL(blob);
                          });
                      } catch (err3) {
                          console.error("Alle pogingen faalden voor:", originalSrc);
                          
                          // POGING 4: Fallback icoontje ('?') tekenen
                          const fallbackCanvas = document.createElement('canvas');
                          fallbackCanvas.width = 128; 
                          fallbackCanvas.height = 128;
                          const ctx = fallbackCanvas.getContext('2d');
                          if (ctx) {
                              ctx.fillStyle = '#22492f'; 
                              ctx.fillRect(0, 0, 128, 128);
                              ctx.fillStyle = '#90cba4'; 
                              ctx.font = 'bold 64px sans-serif';
                              ctx.textAlign = 'center'; 
                              ctx.textBaseline = 'middle';
                              ctx.fillText('?', 64, 64);
                              base64 = fallbackCanvas.toDataURL('image/png');
                          }
                      }
                  }
              }

              if (base64) {
                  div.style.backgroundImage = `url("${base64}")`; 
              }
          }
      }));

      if (btn) btn.innerText = "RENDERING...";
      await new Promise(r => setTimeout(r, 2000));

      if (btn) btn.innerText = "CAPTURING...";

      const canvas = await html2canvas(element, {
        backgroundColor: '#102216', 
        scale: 2, 
        useCORS: true, 
        logging: false, 
      });
      
      const link = document.createElement('a');
      link.download = `cycling-imposter-${selectedDate}-share.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Screenshot failed:", err);
      alert("Oeps, screenshot maken mislukt. Bekijk de console.");
    } finally {
      if (btn) btn.innerHTML = '<span class="material-symbols-outlined text-sm">photo_camera</span> DOWNLOAD SHARE IMAGE';
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const filteredPickerCyclists = cyclists.filter(c => 
    c.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    c.team.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const maxGraphValue = Math.max(...dailyStats.map(s => s.onTime + s.late), 5);

  const getShareCyclists = () => {
    return localQuiz.slots.map(slot => {
        return cyclists.find(c => c.id === slot.cyclistId) || { name: 'Unknown', imageUrl: '', team: 'Unknown' };
    });
  };

  return (
    <div className="bg-background-dark min-h-screen flex flex-col">
      
      {/* --- VERBORGEN SCREENSHOT SJABLOON (1080x1350 STRICT FORMAT) --- */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0', width: '1080px', height: '1350px', overflow: 'hidden' }}>
        <div id="hidden-share-template" className="bg-[#102216] p-16 flex flex-col justify-between border-0" style={{ fontFamily: "'Lexend', sans-serif", width: '1080px', height: '1350px' }}>
            
            <div className="flex flex-col gap-10">
                {/* HEADER */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-white text-6xl font-extrabold tracking-tight" style={{ lineHeight: '1.2' }}>{selectedDate}</h1>
                        <p className="text-[#0df259] text-2xl uppercase tracking-widest font-bold mt-2" style={{ lineHeight: '1.2' }}>The Daily Pro Cycling Challenge</p>
                    </div>
                </div>

                {/* STATEMENT BOX */}
                {localQuiz.statement && (
                    <div className="bg-[#183320] p-10 rounded-3xl border border-[#2e5239]">
                        <p className="text-[#0df259] text-2xl font-bold uppercase tracking-widest mb-4 opacity-80" style={{ lineHeight: '1.2' }}>The Criteria:</p>
                        <p className="text-white text-4xl font-light tracking-tight break-words" style={{ lineHeight: '1.5' }}>
                            "{localQuiz.statement}"
                        </p>
                    </div>
                )}

                {/* CYCLIST GRID */}
                <div className="grid grid-cols-2 gap-x-10 gap-y-10">
                    {getShareCyclists().map((c, idx) => (
                        <div key={idx} className="flex items-center gap-8 bg-[#183320] p-6 rounded-3xl border border-[#2e5239]">
                            <div className="relative flex-shrink-0">
                                <span className="absolute -top-4 -left-4 w-12 h-12 flex items-center justify-center bg-[#22492f] text-white rounded-full text-xl font-bold border-4 border-[#183320] z-10">#{idx + 1}</span>
                                {c.imageUrl ? (
                                    <div 
                                        className="share-cyclist-photo w-28 h-28 rounded-full border-4 border-[#0df259] flex-shrink-0" 
                                        data-img-src={c.imageUrl}
                                        style={{ 
                                            backgroundImage: `url('${c.imageUrl}')`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            minWidth: '112px', 
                                            minHeight: '112px'
                                        }}
                                    />
                                ) : (
                                    <div className="w-28 h-28 min-w-[112px] min-h-[112px] rounded-full border-4 border-dashed border-[#22492f] flex items-center justify-center text-[#90cba4] text-5xl font-black">?</div>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-white text-3xl font-bold pb-1 break-words" style={{ lineHeight: '1.2' }}>{c.name}</p>
                                <p className="text-[#90cba4] text-xl font-medium mt-1 pb-1 break-words" style={{ lineHeight: '1.2' }}>{c.team}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FOOTER - ALTIJD ONDERAAN VASTGEMAAKT */}
            <div className="mt-auto pt-10 border-t border-[#2e5239] text-center pb-4">
                <p className="text-white text-3xl font-light" style={{ lineHeight: '1.2' }}>Can you avoid the <strong className="text-[#ef4444] font-bold">Imposters</strong>?</p>
                <p className="text-[#0df259] text-5xl font-black mt-6 tracking-widest uppercase" style={{ lineHeight: '1.2' }}>CYCLINGIMPOSTER.COM</p>
            </div>
        </div>
      </div>
      {/* --- EINDE VERBORGEN SJABLOON --- */}

      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border-dark bg-background-dark/80 backdrop-blur-md px-4 py-4 lg:px-10">
        <div className="flex items-center gap-4 text-white">
          <div className="flex items-center justify-center bg-primary rounded-full size-10 text-background-dark shadow-neon flex-shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">pedal_bike</span>
          </div>
          <div>
            <h2 className="text-white text-lg md:text-xl font-bold leading-tight tracking-tight">Cycling Imposter</h2>
            <p className="text-text-muted text-[10px] md:text-xs font-medium tracking-wide uppercase">Mission Control</p>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 md:gap-4">
          <button onClick={onNavigateToDatabase} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-muted hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <span className="material-symbols-outlined text-[24px] md:text-[20px]">database</span>
            <span className="hidden md:inline">Database</span>
          </button>
          <div className="h-8 w-px bg-border-dark mx-1 md:mx-2"></div>
          <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-white/5">
            <span className="material-symbols-outlined text-[24px] md:text-[20px]">logout</span>
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto p-6 lg:p-10 flex flex-col gap-8 relative z-10">
        
        <div className="sticky top-[73px] z-40 bg-background-dark/95 backdrop-blur-md py-4 border-b border-white/10 -mx-6 px-6 lg:-mx-10 lg:px-10 -mt-2 shadow-xl flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                {selectedDate}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             {quizDates.includes(selectedDate) && (
                <button 
                    onClick={() => setShowMoveModal(true)}
                    className="bg-blue-600/20 text-blue-400 border border-blue-600/50 p-3 rounded-full hover:bg-blue-600/40 transition-colors"
                    title="Verplaats quiz"
                >
                    <span className="material-symbols-outlined">calendar_month</span>
                </button>
             )}

             {quizDates.includes(selectedDate) && (
                <button 
                    onClick={handleDeleteQuiz}
                    className="bg-red-500/20 text-red-400 border border-red-500/50 p-3 rounded-full hover:bg-red-500/40 transition-colors"
                    title="Verwijder quiz"
                >
                    <span className="material-symbols-outlined">delete</span>
                </button>
             )}

             <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary text-background-dark px-6 py-3 rounded-full font-bold hover:bg-primary-dark transition-all shadow-neon flex items-center gap-2 disabled:opacity-50"
             >
                <span className={`material-symbols-outlined ${isSaving ? 'animate-spin' : ''}`}>
                    {isSaving ? 'sync' : 'publish'}
                </span>
                {isSaving ? 'Saving...' : (quizDates.includes(selectedDate) ? 'Update' : 'Publish')}
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-dark p-4 rounded-xl border border-border-dark flex items-center gap-4">
                <div className="size-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <span className="material-symbols-outlined">group</span>
                </div>
                <div>
                    <p className="text-text-muted text-xs uppercase font-bold">Total Plays Today</p>
                    <p className="text-2xl text-white font-bold">{isLoadingStats ? '...' : stats.plays}</p>
                </div>
            </div>
            <div className="bg-surface-dark p-4 rounded-xl border border-border-dark flex items-center gap-4">
                <div className="size-12 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                    <span className="material-symbols-outlined">star</span>
                </div>
                <div>
                    <p className="text-text-muted text-xs uppercase font-bold">Avg Score Today</p>
                    <p className="text-2xl text-white font-bold">{isLoadingStats ? '...' : stats.avgScore} <span className="text-sm text-gray-500">/ 8</span></p>
                </div>
            </div>
            <div className="bg-surface-dark p-4 rounded-xl border border-border-dark flex items-center gap-4">
                <div className="size-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                    <span className="material-symbols-outlined">emoji_events</span>
                </div>
                <div>
                    <p className="text-text-muted text-xs uppercase font-bold">Perfect Scores</p>
                    <p className="text-2xl text-white font-bold">{isLoadingStats ? '...' : stats.perfectScores}</p>
                </div>
            </div>
        </div>

        <div className="bg-surface-dark p-6 rounded-xl border border-border-dark">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-lg font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">monitoring</span>
                    Activity (Last 30 Days)
                </h3>
                <div className="flex gap-4 text-xs font-bold">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-primary rounded-sm"></div> <span className="text-text-muted">On Day</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-sm"></div> <span className="text-text-muted">Catch Up</span></div>
                </div>
            </div>
            
            <div className="w-full h-32 flex items-end gap-1 md:gap-2">
                {dailyStats.map((stat, index) => {
                    const total = stat.onTime + stat.late;
                    const totalHeightPercent = (total / maxGraphValue) * 100;
                    
                    const onTimePercent = total > 0 ? (stat.onTime / total) * 100 : 0;
                    const latePercent = total > 0 ? (stat.late / total) * 100 : 0;

                    const isToday = stat.date === new Date().toISOString().split('T')[0];

                    return (
                        <div key={stat.date} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                            <div className="absolute bottom-full mb-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none border border-white/20">
                                <strong>{stat.date}</strong><br/>
                                On Day: {stat.onTime}<br/>
                                Catch Up: {stat.late}
                            </div>
                            
                            <div 
                                style={{ height: `${Math.max(totalHeightPercent, 2)}%` }} 
                                className="w-full rounded-t-sm flex flex-col-reverse overflow-hidden bg-[#22492f]/30"
                            >
                                <div style={{ height: `${onTimePercent}%` }} className={`w-full transition-all duration-500 ${isToday ? 'bg-primary shadow-neon' : 'bg-primary'}`}></div>
                                <div style={{ height: `${latePercent}%` }} className="w-full bg-yellow-500 transition-all duration-500"></div>
                            </div>
                            
                            <div className="mt-2 h-4 text-[10px] text-gray-500 font-mono hidden md:block rotate-[-45deg] origin-left translate-y-2">
                                {stat.date.slice(5)}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4 flex flex-col">
            <div className="bg-surface-dark rounded-xl p-6 border border-border-dark h-full">
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => {
                    const newDate = new Date(currentMonth);
                    newDate.setDate(1); 
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentMonth(newDate);
                  }} 
                  className="p-2 hover:bg-input-dark rounded-full text-white"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                <h3 className="text-white text-lg font-bold">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>

                <button 
                  onClick={() => {
                    const newDate = new Date(currentMonth);
                    newDate.setDate(1); 
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentMonth(newDate);
                  }} 
                  className="p-2 hover:bg-input-dark rounded-full text-white"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2 text-xs font-bold text-text-muted text-center">
                {['S','M','T','W','T','F','S'].map(d => <div key={d} className="py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[...Array(firstDay)].map((_, i) => <div key={`empty-${i}`} className="aspect-square"></div>)}
                {[...Array(days)].map((_, i) => {
                    const day = i + 1;
                    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day + 1).toISOString().split('T')[0];
                    const isSelected = selectedDate === dateStr;
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const hasQuiz = quizDates.includes(dateStr);

                    return (
                        <button 
                            key={i} 
                            onClick={() => setSelectedDate(dateStr)}
                            className={`aspect-square rounded-full flex flex-col items-center justify-center text-sm transition-all border-2 relative
                                ${isSelected ? 'bg-primary text-background-dark font-bold border-primary' : 'text-text-muted hover:bg-input-dark border-transparent'}
                                ${isToday && !isSelected ? 'border-primary/50 text-white' : ''}
                            `}
                        >
                            {day}
                            {hasQuiz && !isSelected && (
                                <div className="w-1 h-1 rounded-full bg-primary mt-0.5 shadow-neon"></div>
                            )}
                        </button>
                    )
                })}
              </div>
            </div>
          </div>

          <div className="xl:col-span-8 flex flex-col">
            <div className={`bg-surface-dark rounded-xl p-6 md:p-8 border border-border-dark flex-1 flex flex-col relative overflow-hidden transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 text-primary">
                  <span className="material-symbols-outlined">edit_note</span>
                  <h3 className="text-lg font-bold text-white">Statement</h3>
                </div>
              </div>
              
              <textarea 
                className="form-input w-full flex-1 resize-none rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-primary border-none bg-input-dark placeholder:text-text-muted/50 p-6 text-xl md:text-2xl font-light leading-relaxed mb-6"
                placeholder="Type here..."
                value={localQuiz.statement}
                onChange={handleStatementChange}
              />

              <div className="pt-6 border-t border-border-dark flex justify-end">
                <button 
                    id="download-share-btn"
                    onClick={downloadShareImage}
                    className="flex justify-center items-center gap-2 px-6 py-3 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-sm font-bold hover:bg-purple-500/20 transition-all"
                >
                    <span className="material-symbols-outlined text-base">photo_camera</span>
                    DOWNLOAD SHARE IMAGE
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ACTIEVE WERKPLEK */}
        <div className={`transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mt-4 mb-6">
                <h3 className="text-white text-xl font-bold leading-tight flex items-center gap-3">
                    <span className="flex items-center justify-center size-8 rounded-full bg-input-dark text-sm">8</span>
                    Cyclist Grid
                </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {localQuiz.slots.map((slot, idx) => {
                const cyclist = cyclists.find(c => c.id === slot.cyclistId) || { name: 'Unknown', imageUrl: '', team: 'Unknown', id: '?', country: '', status: 'active' };
                return (
                <div key={idx} className={`group relative flex flex-col gap-4 rounded-2xl bg-surface-dark p-5 border border-border-dark transition-all duration-300 ${slot.isImposter ? 'hover:border-red-500/50' : 'hover:border-primary/50'}`}>
                    <div className="absolute top-4 left-4 text-xs font-bold text-text-muted bg-input-dark px-2 py-1 rounded">#{idx + 1}</div>
                    <div className="relative mx-auto mt-2">
                        <div className={`size-28 rounded-full bg-cover bg-center border-4 transition-all ${slot.isImposter ? 'border-input-dark grayscale opacity-80' : 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]'}`} style={{ backgroundImage: `url('${cyclist.imageUrl}')` }}>
                            <button onClick={() => setShowPicker(idx)} className="absolute bottom-0 right-0 p-1.5 bg-input-dark rounded-full border border-border-dark cursor-pointer hover:bg-primary hover:text-background-dark transition-colors text-white z-10"><span className="material-symbols-outlined text-sm block">sync</span></button>
                        </div>
                    </div>
                    <div className="flex-1 text-center">
                        <p className="text-white font-bold truncate">{cyclist.name}</p>
                        <p className="text-xs text-text-muted truncate">{cyclist.team}</p>
                    </div>
                    <div className="pt-2 border-t border-border-dark">
                    <div onClick={() => toggleSlotImposter(cyclist.id)} className={`cursor-pointer p-2 rounded-lg flex items-center justify-between transition-colors ${slot.isImposter ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'}`}>
                        <span className="text-xs font-bold uppercase">{slot.isImposter ? 'Imposter' : 'Correct'}</span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${slot.isImposter ? 'bg-red-500' : 'bg-green-500'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${slot.isImposter ? 'right-0.5' : 'left-0.5'}`}></div></div>
                    </div>
                    </div>
                    {showPicker === idx && (
                    <div className="absolute inset-0 z-20 bg-background-dark flex flex-col rounded-2xl border border-primary overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col bg-primary/10 border-b border-primary/20">
                            <div className="flex items-center justify-between p-3 pb-2"><h4 className="text-xs font-bold uppercase text-primary">Select Replacement</h4><button onClick={() => setShowPicker(null)} className="text-text-muted hover:text-white"><span className="material-symbols-outlined text-sm">close</span></button></div>
                            <div className="px-3 pb-3"><input autoFocus className="w-full bg-background-dark text-white text-xs p-2 rounded border border-border-dark focus:border-primary focus:outline-none" placeholder="Search cyclist..." value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} /></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                            {filteredPickerCyclists.length > 0 ? (filteredPickerCyclists.map(c => (
                                    <button key={c.id} onClick={() => changeCyclistInSlot(idx, c.id)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-dark transition-colors text-left group/item">
                                        <img src={c.imageUrl} className="size-8 rounded-full object-cover border border-border-dark group-hover/item:border-primary" />
                                        <div className="overflow-hidden"><p className="text-xs font-bold text-white truncate">{c.name}</p><p className="text-xs text-text-muted truncate">{c.team}</p></div>
                                    </button>
                            ))) : (<p className="text-center text-xs text-text-muted mt-4">No riders found.</p>)}
                        </div>
                    </div>
                    )}
                </div>
                );
            })}
            </div>
        </div>
      </main>

      {/* --- MODAL VOOR VERPLAATSEN --- */}
      {showMoveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface-dark border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Quiz Verplaatsen</h3>
            <p className="text-gray-400 mb-6">
              Je verplaatst de quiz van <strong>{selectedDate}</strong>. 
              Kies de nieuwe datum:
            </p>
            
            <input 
              ref={dateInputRef}
              type="date" 
              value={moveTargetDate}
              onChange={(e) => setMoveTargetDate(e.target.value)}
              className="w-full bg-input-dark border border-white/10 rounded-lg p-3 text-white mb-6 focus:border-primary outline-none"
            />

            <div className="flex gap-3">
              <button 
                onClick={() => setShowMoveModal(false)}
                className="flex-1 py-3 text-gray-400 hover:text-white"
              >
                Annuleren
              </button>
              <button 
                onClick={handleMoveQuiz}
                disabled={!moveTargetDate}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                Bevestigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;