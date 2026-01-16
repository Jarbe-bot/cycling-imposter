import React, { useState, useEffect } from 'react';
import { Quiz, Cyclist } from '../types';
import { supabase } from '../supabaseClient';
import { GoogleGenAI } from "@google/genai";
import { INITIAL_QUIZ } from '../constants';

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
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Picker states
  const [showPicker, setShowPicker] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState(''); // NIEUW: Zoekterm voor picker

  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Update local state when prop changes (belangrijk voor sync)
  useEffect(() => {
    setLocalQuiz(quiz);
  }, [quiz]);

  useEffect(() => {
    fetchQuizForDate(selectedDate);
  }, [selectedDate]);

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
        alert(`Quiz voor ${selectedDate} opgeslagen!`);
    } catch (error: any) {
        console.error("Save failed:", error);
        alert("Fout bij opslaan: " + error.message);
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
    setPickerSearch(''); // Reset zoekveld na kiezen
  };

  const generateAIStatement = async () => {
    setIsGenerating(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 
      if (!apiKey) return alert("Geen API Key");

      const ai = new GoogleGenAI({ apiKey });
      const currentRiders = localQuiz.slots.map(s => cyclists.find(c => c.id === s.cyclistId)?.name).join(', ');
      
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash", 
        contents: `Create a short, challenging cycling trivia statement (max 60 characters) that applies to some of these riders but not all: ${currentRiders}. Return only the statement text.`,
      });

      if (response.response.text()) {
        const text = response.response.text().replace(/"/g, '').trim();
        setLocalQuiz(prev => ({ ...prev, statement: text }));
      }
    } catch (error) {
      console.error("AI failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Kalender Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // FILTER LOGICA VOOR PICKER
  const filteredPickerCyclists = cyclists.filter(c => 
    c.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    c.team.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div className="bg-background-dark min-h-screen flex flex-col">
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
          {/* DATABASE KNOP: Nu altijd zichtbaar! (flex i.p.v. hidden md:flex) */}
          <button onClick={onNavigateToDatabase} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-muted hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <span className="material-symbols-outlined text-[24px] md:text-[20px]">database</span>
            {/* Tekst verbergen we op mobiel om ruimte te sparen */}
            <span className="hidden md:inline">Database</span>
          </button>
          
          <div className="h-8 w-px bg-border-dark mx-1 md:mx-2"></div>
          
          <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-white/5">
            <span className="material-symbols-outlined text-[24px] md:text-[20px]">logout</span>
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto p-6 lg:p-10 flex flex-col gap-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-border-dark/50">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
                Quiz Editor: {selectedDate}
            </h1>
            <p className="text-text-muted text-base">Selecteer een datum en bereid de quiz voor.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-background-dark px-8 py-3 rounded-full font-bold hover:bg-primary-dark transition-all shadow-neon flex items-center gap-2 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined ${isSaving ? 'animate-spin' : ''}`}>
                {isSaving ? 'sync' : 'publish'}
            </span>
            {isSaving ? 'Saving...' : `Publish to ${selectedDate}`}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* KALENDER */}
          <div className="xl:col-span-4 flex flex-col">
            <div className="bg-surface-dark rounded-xl p-6 border border-border-dark h-full">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-input-dark rounded-full text-white">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h3 className="text-white text-lg font-bold">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-input-dark rounded-full text-white">
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

                    return (
                        <button 
                            key={i} 
                            onClick={() => setSelectedDate(dateStr)}
                            className={`aspect-square rounded-full flex items-center justify-center text-sm transition-all border-2
                                ${isSelected ? 'bg-primary text-background-dark font-bold border-primary' : 'text-text-muted hover:bg-input-dark border-transparent'}
                                ${isToday && !isSelected ? 'border-primary/50 text-white' : ''}
                            `}
                        >
                            {day}
                        </button>
                    )
                })}
              </div>
            </div>
          </div>

          {/* STATEMENT EDITOR */}
          <div className="xl:col-span-8 flex flex-col">
            <div className={`bg-surface-dark rounded-xl p-6 md:p-8 border border-border-dark flex-1 flex flex-col relative overflow-hidden transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 text-primary">
                  <span className="material-symbols-outlined">edit_note</span>
                  <h3 className="text-lg font-bold text-white">Statement</h3>
                </div>
                <button 
                  onClick={generateAIStatement}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-all disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-sm ${isGenerating ? 'animate-spin' : ''}`}>auto_awesome</span>
                  {isGenerating ? 'THINKING...' : 'AI SUGGEST'}
                </button>
              </div>
              <textarea 
                className="form-input w-full flex-1 resize-none rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-primary border-none bg-input-dark placeholder:text-text-muted/50 p-6 text-xl md:text-2xl font-light leading-relaxed"
                placeholder="Type here..."
                value={localQuiz.statement}
                onChange={handleStatementChange}
              />
            </div>
          </div>
        </div>

        {/* GRID */}
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
                            <button 
                            onClick={() => setShowPicker(idx)}
                            className="absolute bottom-0 right-0 p-1.5 bg-input-dark rounded-full border border-border-dark cursor-pointer hover:bg-primary hover:text-background-dark transition-colors text-white z-10"
                            >
                                <span className="material-symbols-outlined text-sm block">sync</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 text-center">
                        <p className="text-white font-bold truncate">{cyclist.name}</p>
                        <p className="text-xs text-text-muted truncate">{cyclist.team}</p>
                    </div>

                    <div className="pt-2 border-t border-border-dark">
                    <div 
                        onClick={() => toggleSlotImposter(cyclist.id)}
                        className={`cursor-pointer p-2 rounded-lg flex items-center justify-between transition-colors ${slot.isImposter ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'}`}
                    >
                        <span className="text-xs font-bold uppercase">{slot.isImposter ? 'Imposter' : 'Correct'}</span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${slot.isImposter ? 'bg-red-500' : 'bg-green-500'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${slot.isImposter ? 'right-0.5' : 'left-0.5'}`}></div>
                        </div>
                    </div>
                    </div>

                    {/* NIEUW: RENNER KIEZER MET ZOEKFUNCTIE */}
                    {showPicker === idx && (
                    <div className="absolute inset-0 z-20 bg-background-dark flex flex-col rounded-2xl border border-primary overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col bg-primary/10 border-b border-primary/20">
                            <div className="flex items-center justify-between p-3 pb-2">
                                <h4 className="text-xs font-bold uppercase text-primary">Select Replacement</h4>
                                <button onClick={() => setShowPicker(null)} className="text-text-muted hover:text-white">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                            {/* ZOEKBALK */}
                            <div className="px-3 pb-3">
                                <input 
                                    autoFocus
                                    className="w-full bg-background-dark text-white text-xs p-2 rounded border border-border-dark focus:border-primary focus:outline-none"
                                    placeholder="Search cyclist..."
                                    value={pickerSearch}
                                    onChange={(e) => setPickerSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                            {filteredPickerCyclists.length > 0 ? (
                                filteredPickerCyclists.map(c => (
                                    <button 
                                    key={c.id}
                                    onClick={() => changeCyclistInSlot(idx, c.id)}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-dark transition-colors text-left group/item"
                                    >
                                        <img src={c.imageUrl} className="size-8 rounded-full object-cover border border-border-dark group-hover/item:border-primary" />
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-bold text-white truncate">{c.name}</p>
                                            <p className="text-[10px] text-text-muted truncate">{c.team}</p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <p className="text-center text-xs text-text-muted mt-4">No riders found.</p>
                            )}
                        </div>
                    </div>
                    )}
                </div>
                );
            })}
            </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;