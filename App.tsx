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
                {/* SVG Icoon: Laadt direct, geen vertraging */}
                <svg xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0 -960 960 960" width="64" fill="currentColor" className="spin-slow">
                    <path d="M280-160q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35Zm400 0q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM280-370q-12 0-23.5-3t-22.5-10q-21-13-32.5-34.5T190-466l22-64h124q15 23 37.5 36.5T424-480h222l-60 110h-86v60h116l84-156h84q21 0 38.5 12t24.5 32L864-386l-54 22-21-46H696l40-70H424q-22 0-41-11t-31-31l-36-60 52-164q7-21 24.5-34t39.5-13h208v60H438l-34 106h106l15 31h255q20 0 38 10t28 28l58 136q12 28 4.5 56T882-270l-88 38-24-54 54-22-11-28h-80l-28 56H480v-60h190l34-60H426q-34 0-61.5-19.5T324-410l-28 58q-14 30-41 46t-59 16h-4v-60h4q12 0 22-6.5t15-18.5l47-95ZM160-590h-80v-60h102l22 60H160Z"/>
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