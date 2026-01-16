import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Cyclist, Quiz, UserStats } from './types';
import { INITIAL_CYCLISTS, INITIAL_QUIZ } from './constants';
import { supabase } from './supabaseClient';
import FrontendView from './components/FrontendView';
import AdminDashboard from './components/AdminDashboard';
import AdminDatabase from './components/AdminDatabase';
import LoginView from './components/LoginView';

const AppContent: React.FC = () => {
  // We beginnen met de standaard data
  const [cyclists, setCyclists] = useState<Cyclist[]>(INITIAL_CYCLISTS);
  const [quiz, setQuiz] = useState<Quiz>(INITIAL_QUIZ);
  
  // NIEUW: Een 'Laad-status' om te voorkomen dat we halve data tonen
  const [isLoading, setIsLoading] = useState(true);
  
  // STATS: Laad uit localStorage
  const [userStats, setUserStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('cycling_imposter_stats');
    return saved ? JSON.parse(saved) : {
      played: 0,
      streak: 0,
      history: { 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 }
    };
  });

  const navigate = useNavigate();

  // STARTUP: Haal data uit Supabase
  useEffect(() => {
    fetchLiveData();
  }, []);

  const fetchLiveData = async () => {
    console.log("🔄 Warming up engines...");
    setIsLoading(true); // Zeker weten dat we laden

    try {
        // STAP 1: Haal ALLE renners op
        const { data: cyclistData } = await supabase.from('cyclists').select('*');
        
        if (cyclistData && cyclistData.length > 0) {
            const formattedCyclists = cyclistData.map((c: any) => ({
                ...c,
                imageUrl: c.image_url || c.imageUrl
            }));
            setCyclists(formattedCyclists);
        }

        // STAP 2: Haal de Quiz van VANDAAG op
        const today = new Date().toISOString().split('T')[0];
        
        const { data: quizData } = await supabase
            .from('daily_quizzes')
            .select('*')
            .eq('date', today)
            .single();

        if (quizData) {
            console.log("✅ Live quiz found for today!");
            setQuiz({
                id: quizData.id,
                statement: quizData.statement,
                slots: quizData.slots
            });
        }
    } catch (error) {
        console.error("Oeps, foutje met laden:", error);
    } finally {
        // BELANGRIJK: Dit gebeurt ALTIJD als alles klaar is (of gefaald)
        // Hier zetten we het licht op groen en tonen we de app.
        setTimeout(() => setIsLoading(false), 800); // Kleine kunstmatige vertraging voor soepele animatie
    }
  };

  const updateUserStats = (score: number) => {
    setUserStats(prev => {
      const newStats = {
        played: prev.played + 1,
        streak: score >= 4 ? prev.streak + 1 : 0, 
        history: {
          ...prev.history,
          [score]: (prev.history[score] || 0) + 1
        }
      };
      localStorage.setItem('cycling_imposter_stats', JSON.stringify(newStats));
      return newStats;
    });
  };

// NIEUW: HET LAADSCHERM MET SVG (Geen tekst-flits meer!)
  if (isLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a160e] text-primary">
            <div className="flex flex-col items-center animate-pulse gap-4">
               {/* HET PREMIUM SVG ICOON (Exact dezelfde als eerst, maar dan direct geladen!) */}
                <svg xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0 0 24 24" width="64" fill="currentColor" className="spin-slow">
                    <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.9-.6-4-1.5l-2.5 2.5c-.3.3-.8.3-1.1 0l-1.9-1.9c-.3-.3-.3-.8 0-1.1l1.2-1.2zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
                </svg>
                
                <h2 className="text-xl font-bold tracking-widest text-white mt-2">LOADING STAGE...</h2>
                <p className="text-xs text-gray-500">Checking tire pressure</p>
            </div>
        </div>
    );
  }

  // DE ECHTE APP (Wordt pas getoond als isLoading false is)
  return (
    <div className="min-h-screen flex flex-col bg-background-dark text-white">
      <Routes>
        <Route path="/" element={
          <FrontendView 
            quiz={quiz} 
            cyclists={cyclists} 
            userStats={userStats} 
            updateStats={updateUserStats} 
            onGoAdmin={() => navigate('/login')} 
          />
        } />

        <Route path="/login" element={
          <LoginView 
            onSuccess={() => navigate('/admin/dashboard')} 
            onBack={() => navigate('/')}
          />
        } />

        <Route path="/admin/dashboard" element={
          <AdminDashboard 
            quiz={quiz} 
            cyclists={cyclists} 
            setQuiz={setQuiz}
            onNavigateToDatabase={() => navigate('/admin/database')}
            onLogout={() => navigate('/')}
          />
        } />
        
        <Route path="/admin/database" element={
          <AdminDatabase 
            cyclists={cyclists} 
            setCyclists={setCyclists} 
            onNavigateToDashboard={() => navigate('/admin/dashboard')}
            onLogout={() => navigate('/')}
          />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;