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
  // We beginnen met de standaard data (zodat de app nooit leeg is)
  const [cyclists, setCyclists] = useState<Cyclist[]>(INITIAL_CYCLISTS);
  const [quiz, setQuiz] = useState<Quiz>(INITIAL_QUIZ);
  
  // STATS: Laad uit localStorage (geheugen van de browser)
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
    console.log("🔄 Checking for live updates...");

    // STAP 1: Haal ALLE renners op (zodat we de juiste foto's hebben)
    const { data: cyclistData } = await supabase.from('cyclists').select('*');
    
    if (cyclistData && cyclistData.length > 0) {
        // Zorg dat image_url (database) gemapt wordt naar imageUrl (app)
        const formattedCyclists = cyclistData.map((c: any) => ({
            ...c,
            imageUrl: c.image_url || c.imageUrl
        }));
        setCyclists(formattedCyclists);
    }

    // STAP 2: Haal de Quiz van VANDAAG op
    const today = new Date().toISOString().split('T')[0]; // Format: 2024-05-21
    
    const { data: quizData, error } = await supabase
        .from('daily_quizzes')
        .select('*')
        .eq('date', today)
        .single(); // .single() betekent: we verwachten max 1 resultaat

    if (quizData) {
        console.log("✅ Live quiz found for today!", quizData);
        setQuiz({
            id: quizData.id,
            statement: quizData.statement,
            slots: quizData.slots // Dit komt als JSON uit de DB en past direct in ons type
        });
    } else {
        console.log("ℹ️ No live quiz found for today (" + today + "), using default/fallback.");
        // Hier zou je eventueel een melding kunnen tonen of een 'random' quiz genereren
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

  return (
    <div className="min-h-screen flex flex-col bg-background-dark text-white">
      <Routes>
        {/* HOME: De Quiz */}
        <Route path="/" element={
          <FrontendView 
  quiz={quiz} 
  cyclists={cyclists} // <--- DIT IS DE BELANGRIJKE WIJZIGING
  userStats={userStats} 
  updateStats={updateUserStats} 
  onGoAdmin={() => navigate('/login')} 
/>
        } />

        {/* LOGIN */}
        <Route path="/login" element={
          <LoginView 
            onSuccess={() => navigate('/admin/dashboard')} 
            onBack={() => navigate('/')}
          />
        } />

        {/* ADMIN DASHBOARD (Kalender & Quiz Maken) */}
        <Route path="/admin/dashboard" element={
          <AdminDashboard 
            quiz={quiz} 
            cyclists={cyclists} 
            setQuiz={setQuiz}
            onNavigateToDatabase={() => navigate('/admin/database')}
            onLogout={() => navigate('/')}
          />
        } />
        
        {/* ADMIN DATABASE (Renners beheren) */}
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