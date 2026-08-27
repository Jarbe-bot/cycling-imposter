import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const Leaderboard = () => {
    const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'streak'>('daily');
    const [dailyData, setDailyData] = useState<any[]>([]);
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [streakData, setStreakData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboards();
    }, [activeTab]);

    const fetchLeaderboards = async () => {
        setIsLoading(true);
        if (activeTab === 'daily') {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await supabase
                .from('daily_leaderboard')
                .select('*')
                .eq('quiz_date', today); // Filter streng op de datum van vandaag!
            
            if (data) setDailyData(data);
        } else if (activeTab === 'monthly') {
            const { data } = await supabase.from('monthly_leaderboard').select('*');
            if (data) setMonthlyData(data);
        } else if (activeTab === 'streak') {
            const { data } = await supabase.from('user_streaks').select('*').order('current_streak', { ascending: false }).limit(50);
            if (data) setStreakData(data);
        }
        setIsLoading(false);
    };

    const formatTime = (ms: number) => {
        if (!ms) return '-';
        const seconds = (ms / 1000).toFixed(2);
        return `${seconds}s`;
    };

    return (
        <div className="bg-[#0d1c12] p-6 rounded-2xl border border-[#22492f] max-w-2xl mx-auto w-full mt-8">
            <h2 className="text-white text-2xl font-black mb-6 text-center uppercase tracking-widest">Leaderboards</h2>
            
            <div className="flex bg-[#102316] p-1 rounded-xl mb-6 border border-[#22492f]">
                <button onClick={() => setActiveTab('daily')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'daily' ? 'bg-primary text-background-dark shadow-neon' : 'text-gray-400 hover:text-white'}`}>Daily</button>
                <button onClick={() => setActiveTab('monthly')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'monthly' ? 'bg-primary text-background-dark shadow-neon' : 'text-gray-400 hover:text-white'}`}>Monthly</button>
                <button onClick={() => setActiveTab('streak')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'streak' ? 'bg-primary text-background-dark shadow-neon' : 'text-gray-400 hover:text-white'}`}>Streaks</button>
            </div>

            <div className="flex flex-col gap-2 min-h-[250px]">
                {isLoading ? (
                    <p className="text-center text-gray-500 py-10">Loading...</p>
                ) : (
                    <>
                        {activeTab === 'daily' && (
                            dailyData.length > 0 ? dailyData.map((player, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-[#1a3322] p-4 rounded-xl border border-[#22492f]"><div className="flex items-center gap-4"><span className="text-gray-500 font-bold w-6 text-center">#{idx + 1}</span><span className="text-white font-bold">{player.username}</span></div><div className="text-primary font-mono font-bold">{formatTime(player.time_taken_ms)}</div></div>
                            )) : <p className="text-center text-gray-500 py-10">No scores yet today.</p>
                        )}
                        {activeTab === 'monthly' && (
                            monthlyData.length > 0 ? monthlyData.map((player, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-[#1a3322] p-4 rounded-xl border border-[#22492f]"><div className="flex items-center gap-4"><span className="text-gray-500 font-bold w-6 text-center">#{idx + 1}</span><span className="text-white font-bold">{player.username}</span></div><div className="text-green-400 font-bold">{player.total_perfect_games} pt</div></div>
                            )) : <p className="text-center text-gray-500 py-10">No data for this month.</p>
                        )}
                        {activeTab === 'streak' && (
                            streakData.length > 0 ? streakData.map((player, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-[#1a3322] p-4 rounded-xl border border-[#22492f]"><div className="flex items-center gap-4"><span className="text-gray-500 font-bold w-6 text-center">#{idx + 1}</span><span className="text-white font-bold">{player.username}</span></div><div className="flex items-center gap-1 text-orange-400 font-bold"><span className="material-symbols-outlined text-sm">local_fire_department</span>{player.current_streak}</div></div>
                            )) : <p className="text-center text-gray-500 py-10">No active streaks found.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};