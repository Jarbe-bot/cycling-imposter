import React, { useState, useEffect, useRef } from 'react';
import { Quiz, Cyclist } from '../types';

interface SwipeGameProps {
  quiz: Quiz;
  cyclists: Cyclist[];
  onComplete: (matchIds: string[]) => void; // IDs die de speler als 'Match' indeelde
}

const SWIPE_THRESHOLD = 100; // px die je moet slepen voor een keuze telt
const FEEDBACK_MS = 1100;    // hoe lang 'Correct'/'Wrong' in beeld blijft (zonder uitleg)
const PLACEHOLDER = 'https://placehold.co/400x600?text=No+Image';

type Decision = { cyclistId: string; saidMatch: boolean; correct: boolean; isImposter: boolean; note?: string };

const SwipeGame: React.FC<SwipeGameProps> = ({ quiz, cyclists, onComplete }) => {
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir, setExitDir] = useState<1 | -1 | null>(null);
  const [feedback, setFeedback] = useState<Decision | null>(null);
  const [flashVisible, setFlashVisible] = useState(false);
  const startXRef = useRef<number | null>(null);

  const slots = quiz.slots;
  const slot = slots[index];
  const findCyclist = (id?: string) => cyclists.find(c => c.id === id);
  const current = findCyclist(slot?.cyclistId);
  const next = findCyclist(slots[index + 1]?.cyclistId);

  const advance = (list: Decision[]) => {
    if (index + 1 >= slots.length) {
      onComplete(list.filter(d => d.saidMatch).map(d => d.cyclistId));
      return;
    }
    setIndex(i => i + 1);
    setDragX(0);
    setExitDir(null);
    setFeedback(null);
  };

  const decide = (saidMatch: boolean) => {
    if (!slot || feedback) return;
    const d: Decision = {
      cyclistId: slot.cyclistId,
      saidMatch,
      correct: saidMatch === !slot.isImposter,
      isImposter: slot.isImposter,
      note: slot.note,
    };
    const list = [...decisions, d];
    setDecisions(list);
    setExitDir(saidMatch ? 1 : -1);
    setFeedback(d);
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 250);
    // Met uitleg wacht de speler zelf op 'Next', anders gaan we automatisch verder
    if (!slot.note) setTimeout(() => advance(list), FEEDBACK_MS);
  };

  // Pijltjestoetsen op desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') decide(true);
      if (e.key === 'ArrowLeft') decide(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // --- Slepen (touch + muis) ---
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (feedback) return;
    startXRef.current = e.clientX;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startXRef.current === null) return;
    setDragX(e.clientX - startXRef.current);
  };
  const onPointerUp = () => {
    if (startXRef.current === null) return;
    startXRef.current = null;
    setIsDragging(false);
    if (Math.abs(dragX) > SWIPE_THRESHOLD) decide(dragX > 0);
    else setDragX(0);
  };

  const dragStrength = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);
  const cardTransform = exitDir !== null
    ? `translateX(${exitDir * 600}px) rotate(${exitDir * 30}deg)`
    : `translateX(${dragX}px) rotate(${dragX / 15}deg)`;

  const renderCard = (c?: Cyclist) => (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-card-dark border border-[#22492f] shadow-2xl select-none">
      <img
        src={c?.imageUrl || PLACEHOLDER}
        alt={c?.name || ''}
        draggable={false}
        className="h-full w-full object-cover pointer-events-none"
        onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
      />
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <p className="text-xl font-bold leading-tight text-white">{c?.name || 'Loading...'}</p>
        <p className="text-sm text-gray-400">{c?.team}</p>
      </div>
    </div>
  );

  return (
    <div className="flex w-full flex-col items-center overflow-hidden pb-4">
      {/* Gekleurde rand tijdens het slepen: links rood (imposter), rechts groen (match) */}
      <div className="pointer-events-none fixed inset-y-0 left-0 z-20 w-1/3 bg-gradient-to-r from-red-500/50 to-transparent transition-opacity"
           style={{ opacity: dragX < 0 && !feedback ? dragStrength : 0 }} />
      <div className="pointer-events-none fixed inset-y-0 right-0 z-20 w-1/3 bg-gradient-to-l from-green-500/50 to-transparent transition-opacity"
           style={{ opacity: dragX > 0 && !feedback ? dragStrength : 0 }} />

      {/* Flits bij een keuze: groen = juist, rood = fout */}
      <div className={`pointer-events-none fixed inset-0 z-40 transition-opacity duration-300 ${feedback?.correct ? 'bg-green-500/25' : 'bg-red-500/25'}`}
           style={{ opacity: flashVisible ? 1 : 0 }} />

      <p className="mb-3 text-sm font-bold text-gray-400">{Math.min(index + 1, slots.length)} / {slots.length}</p>

      {/* KAARTENSTAPEL */}
      <div className="relative aspect-[3/4] w-full max-w-[260px] sm:max-w-[320px]">
        {next && (
          <div className="absolute inset-0 scale-95 opacity-60">{renderCard(next)}</div>
        )}
        {slot && (
          <div
            key={slot.cyclistId} // nieuwe renner = nieuw element, dus geen terugschuif-animatie
            className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
            style={{
              transform: cardTransform,
              transition: isDragging ? 'none' : 'transform 0.35s ease-out',
              touchAction: 'pan-y',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {renderCard(current)}
            {/* Stempels tijdens het slepen */}
            <div className="absolute left-4 top-6 z-20 -rotate-12 rounded-lg border-4 border-green-400 px-3 py-1 text-2xl font-black text-green-400"
                 style={{ opacity: dragX > 0 ? dragStrength : 0 }}>MATCH</div>
            <div className="absolute right-4 top-6 z-20 rotate-12 rounded-lg border-4 border-red-400 px-3 py-1 text-2xl font-black text-red-400"
                 style={{ opacity: dragX < 0 ? dragStrength : 0 }}>IMPOSTER</div>
          </div>
        )}

        {/* FEEDBACK */}
        {feedback && (
          <div className="absolute inset-x-0 top-1/2 z-30 mx-2 -translate-y-1/2 rounded-2xl border border-[#22492f] bg-[#0d1c12]/95 p-5 text-center shadow-2xl">
            <p className={`text-3xl font-black ${feedback.correct ? 'text-green-400' : 'text-red-400'}`}>
              {feedback.correct ? 'Correct!' : 'Wrong!'}
            </p>
            <p className="mt-1 text-sm text-gray-300">
              {feedback.isImposter ? 'This rider is an imposter.' : 'This rider matches the statement.'}
            </p>
            {feedback.note && <p className="mt-3 text-sm font-medium text-white">{feedback.note}</p>}
            {feedback.note && (
              <button onClick={() => advance(decisions)} className="mt-4 w-full rounded-xl bg-primary py-3 font-bold text-background-dark">
                {index + 1 >= slots.length ? 'See results' : 'Next rider'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* KNOPPEN */}
      <div className="mt-6 flex w-full max-w-[320px] gap-4">
        <button onClick={() => decide(false)} disabled={!!feedback}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-red-500 py-3 font-bold text-red-400 transition-all hover:bg-red-500/10 active:scale-95 disabled:opacity-40">
          <span className="material-symbols-outlined">close</span> Imposter
        </button>
        <button onClick={() => decide(true)} disabled={!!feedback}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-green-500 py-3 font-bold text-green-400 transition-all hover:bg-green-500/10 active:scale-95 disabled:opacity-40">
          <span className="material-symbols-outlined">favorite</span> Match
        </button>
      </div>

      {/* VOORTGANG: al beoordeelde renners */}
      <div className="mt-6 flex gap-2">
        {slots.map((s, i) => {
          const d = decisions[i];
          const c = findCyclist(s.cyclistId);
          if (d) {
            return <img key={s.cyclistId} src={c?.imageUrl || PLACEHOLDER} alt={c?.name || ''}
                        className={`size-8 rounded-full object-cover ring-2 ${d.correct ? 'ring-green-500' : 'ring-red-500'}`}
                        onError={(e) => (e.currentTarget.src = PLACEHOLDER)} />;
          }
          return <div key={s.cyclistId} className={`size-8 rounded-full border-2 ${i === index ? 'border-primary' : 'border-[#22492f]'}`} />;
        })}
      </div>
    </div>
  );
};

export default SwipeGame;
