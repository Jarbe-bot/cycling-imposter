import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface LeaderboardProps {
    onOpenArchive?: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onOpenArchive }) => {
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'streak'>('daily');
    const [dailyData, setDailyData] = useState<any[]>([]);
    const [weeklyData, setWeeklyData] = useState<any[]>([]);
    const [prevWeekData, setPrevWeekData] = useState<any[]>([]); 
    const [streakData, setStreakData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // STATE VOOR DE STREAK HELP POPUP
    const [showStreakHelpModal, setShowStreakHelpModal] = useState(false);

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
                .eq('quiz_date', today);
            
            if (data) setDailyData(data);
        } else if (activeTab === 'weekly') {
            const { data: currentWeek } = await supabase.from('weekly_leaderboard').select('*');
            const { data: prevWeek } = await supabase.from('previous_week_leaderboard').select('*');
            if (currentWeek) setWeeklyData(currentWeek);
            if (prevWeek) setPrevWeekData(prevWeek);
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
        <div className="bg-[#0d1c12] p-6 rounded-2xl border border-[#22492f] max-w-2xl mx-auto w-full mt-8 relative">
            <h2 className="text-white text-2xl font-black mb-6 text-center uppercase tracking-widest">Leaderboards</h2>
            
            <div className="flex bg-[#102316] p-1 rounded-xl mb-6 border border-[#22492f]">
                <button onClick={() => setActiveTab('daily')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'daily' ? 'bg-primary text-background-dark shadow-neon' : 'text-gray-400 hover:text-white'}`}>Daily</button>
                <button onClick={() => setActiveTab('weekly')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'weekly' ? 'bg-primary text-background-dark shadow-neon' : 'text-gray-400 hover:text-white'}`}>Weekly</button>
                <button onClick={() => setActiveTab('streak')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'streak' ? 'bg-primary text-background-dark shadow-neon' : 'text-gray-400 hover:text-white'}`}>Streaks</button>
            </div>

            <div className="flex flex-col gap-2 min-h-[250px]">
                {isLoading ? (
                    <p className="text-center text-gray-500 py-10">Loading...</p>
                ) : (
                    <>
                        {activeTab === 'daily' && (
                            dailyData.length > 0 ? dailyData.map((player, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-[#1a3322] p-4 rounded-xl border border-[#22492f]">
                                    <div className="flex items-center gap-4">
                                        <span className="text-gray-500 font-bold w-6 text-center">#{idx + 1}</span>
                                        <span className="text-white font-bold">{player.username}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-bold">
                                            {player.score} / 8
                                        </span>
                                        <div className="text-primary font-mono font-bold">{formatTime(player.time_taken_ms)}</div>
                                    </div>
                                </div>
                            )) : <p className="text-center text-gray-500 py-10">No scores yet today.</p>
                        )}

                        {activeTab === 'weekly' && (
                            <div className="flex flex-col gap-4">
                                {/* INFO BANNER */}
                                <div className="bg-[#102316] border border-[#22492f] rounded-xl p-4 text-xs text-gray-300 text-center leading-relaxed">
                                    💡 <strong className="text-white">Playing for the weekly rank?</strong> Missed a day? No problem! Play earlier days of this week via the{' '}
                                    <button 
                                        onClick={onOpenArchive} 
                                        className="text-primary font-bold underline hover:text-green-300 transition-colors cursor-pointer"
                                    >
                                        Archive
                                    </button>
                                    {' '}to still score points for this leaderboard!
                                </div>

                                {/* PODIUM VORIGE WEEK */}
                                {prevWeekData.length > 0 && (
                                    <div className="bg-gradient-to-b from-[#173322] to-[#0f2418] border border-primary/40 rounded-2xl p-5 shadow-xl mb-2">
                                        <div className="flex items-center justify-center gap-2 mb-3">
                                            <span className="material-symbols-outlined text-yellow-400 text-lg">emoji_events</span>
                                            <h3 className="text-white font-black text-xs uppercase tracking-wider">Hall of Fame • Last Week</h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            {prevWeekData.map((player, idx) => {
                                                const medals = ['🥇', '🥈', '🥉'];
                                                const borderColors = ['border-yellow-500/60 bg-yellow-500/5', 'border-gray-400/40 bg-gray-400/5', 'border-amber-700/40 bg-amber-700/5'];
                                                return (
                                                    <div key={idx} className={`border ${borderColors[idx]} rounded-xl p-3 flex flex-col items-center justify-center relative`}>
                                                        <span className="text-2xl mb-1">{medals[idx]}</span>
                                                        <p className="text-white font-bold text-xs truncate w-full">{player.username}</p>
                                                        <p className="text-primary font-mono font-bold text-xs mt-1">{player.total_score} pts</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* HUIDIGE WEEK LIJST */}
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Current Standings</h4>
                                </div>

                                {weeklyData.length > 0 ? weeklyData.map((player, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-[#1a3322] p-4 rounded-xl border border-[#22492f]">
                                        <div className="flex items-center gap-4">
                                            <span className="text-gray-500 font-bold w-6 text-center">#{idx + 1}</span>
                                            <span className="text-white font-bold">{player.username}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-400">({player.games_played} games)</span>
                                            <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold">
                                                {player.total_score} pts
                                            </span>
                                        </div>
                                    </div>
                                )) : <p className="text-center text-gray-500 py-10">No data for this week.</p>}
                            </div>
                        )}

                        {activeTab === 'streak' && (
                            <div className="flex flex-col gap-4">
                                {/* TIP BANNER VOOR STREAK BEHOUD */}
                                <div className="bg-[#102316] border border-[#22492f] rounded-xl p-3 text-xs text-gray-300 flex items-center justify-between px-4">
                                    <span>🔥 How to keep your streak safe?</span>
                                    <button 
                                        onClick={() => setShowStreakHelpModal(true)}
                                        className="text-primary font-bold underline hover:text-green-300 transition-colors cursor-pointer"
                                    >
                                        Read tip
                                    </button>
                                </div>

                                {streakData.length > 0 ? streakData.map((player, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-[#1a3322] p-4 rounded-xl border border-[#22492f]">
                                        <div className="flex items-center gap-4">
                                            <span className="text-gray-500 font-bold w-6 text-center">#{idx + 1}</span>
                                            <span className="text-white font-bold">{player.username}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-orange-400 font-bold">
                                            <span className="material-symbols-outlined text-sm">local_fire_department</span>
                                            {player.current_streak}
                                        </div>
                                    </div>
                                )) : <p className="text-center text-gray-500 py-10">No active streaks found.</p>}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* STREAK HELP POPUP MODAL */}
            {showStreakHelpModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0d1c12] border border-[#22492f] w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-left">
                        <button 
                            onClick={() => setShowStreakHelpModal(false)} 
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-3xl text-orange-400">local_fire_department</span>
                            <h3 className="text-xl font-bold text-white">Protect Your Streak</h3>
                        </div>

                        <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
                            <p>Your daily streak is stored safely in your browser. To prevent your device from accidentally wiping it, keep these things in mind:</p>
                            
                            <div className="bg-[#1a3322] p-3 rounded-xl border border-[#22492f]">
                                <strong className="text-white block mb-1">📱 For iOS (iPhone / iPad):</strong>
                                iOS Safari can occasionally clear website storage and cache automatically to manage device memory, or if opened in Private/Incognito mode. 
                                <span className="text-primary font-bold block mt-1">Fix: Open the site in Safari, tap the Share icon, and select "Add to Home Screen". Playing from that home screen icon gives the app permanent, protected storage!</span>
                            </div>

                            <div className="bg-[#1a3322] p-3 rounded-xl border border-[#22492f]">
                                <strong className="text-white block mb-1">💻 For Android / Windows / Mac:</strong>
                                Browsers keep your data safe by default. However, <span className="text-white">manually clearing browser history, cookies, or site data</span> will wipe your streak. Avoid clearing storage data for this site!
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-[#22492f] text-center">
                            <button 
                                onClick={() => setShowStreakHelpModal(false)} 
                                className="bg-primary text-background-dark font-bold py-2.5 px-6 rounded-xl hover:scale-105 transition-transform text-xs cursor-pointer"
                            >
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};