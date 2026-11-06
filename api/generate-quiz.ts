// Vercel serverless function: AI-concepten voor quizzes en uitleg per renner.
// Slaat NIETS op: het resultaat komt als concept in het admin-dashboard, waar een mens nakijkt en opslaat.
//
// Benodigde omgevingsvariabelen in Vercel (Settings → Environment Variables):
//   GEMINI_API_KEY          – sleutel uit Google AI Studio (NIET met VITE_ ervoor, anders belandt hij in de frontend)
//   GEMINI_MODEL            – optioneel, standaard 'gemini-flash-latest'
//   VITE_SUPABASE_URL       – bestaat al
//   VITE_SUPABASE_ANON_KEY  – bestaat al

import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Hoofdmodel en reservemodel (beide in de gratis tier). Overschrijfbaar via Vercel.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash';
const ATTEMPT_TIMEOUT_MS = 80_000; // max 3 pogingen blijven zo onder de 300 s van Vercel

const RULES = `
RULES FOR STATEMENTS
- Statements are short, in English, in the style of the examples (e.g. "10+ Stage Wins TDF", "Won Paris-Roubaix").
- Only use these races: the three Grand Tours (Tour de France, Giro d'Italia, Vuelta a España), the five Monuments
  (Milano-Sanremo, Tour of Flanders, Paris-Roubaix, Liège-Bastogne-Liège, Il Lombardia), the World Championships and the Olympics.
- Generic themes are also fine: nationality, teams a rider has ridden for, Grand Tour jerseys, stage wins in Grand Tours,
  number of Grand Tour participations, being a national champion, career facts that are widely documented.
- Never use smaller races (e.g. Deutschland Tour, Tour of Britain, Tour Down Under, one-day races outside the Monuments).
- Only use facts you are completely certain about. If you are unsure about a rider, do not use that rider.
- Statements must be timeless. Never refer to dates, holidays, national days, anniversaries, birthdays, seasons
  or current events (e.g. no "National holiday of ...!", "Happy birthday ...", "Halloween!"). You do not know on
  which day the puzzle will be published, so such references are always wrong. Ignore this style in older statements.

WRITING STYLE
- Write the statement and all notes in sentence case, like a normal English sentence: capitalize only the first word
  and proper nouns (riders, races, teams, countries). Correct: "Won an Olympic gold medal", "Wore the yellow jersey
  in the Tour de France". Wrong: "Won An Olympic Gold Medal", "Wore The Yellow Jersey".
- Follow this rule even if some older statements below use more capitals.
`;

const parseJson = (text: string) => JSON.parse(text.replace(/```json|```/g, '').trim());

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Eén aanvraag met tijdslimiet, zodat de knop nooit minutenlang blijft hangen
async function callModel(ai: GoogleGenAI, model: string, prompt: string): Promise<string> {
  const request = ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: 'application/json' } });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(Object.assign(new Error('timeout'), { status: 'timeout' })), ATTEMPT_TIMEOUT_MS));
  const res: any = await Promise.race([request, timeout]);
  if (!res.text) throw new Error('Leeg antwoord van het model');
  return res.text;
}

// Hoofdmodel; bij drukte (503) na een korte pauze nog eens; daarna het reservemodel.
// (Google Search zit niet in de gratis tier, daarom zonder.)
async function ask(ai: GoogleGenAI, prompt: string): Promise<string> {
  try {
    return await callModel(ai, MODEL, prompt);
  } catch (e: any) {
    console.warn(`${MODEL} faalde (${e?.status}):`, e?.message);
    if (e?.status === 503) {
      await sleep(3000);
      try {
        return await callModel(ai, MODEL, prompt);
      } catch (e2: any) {
        console.warn(`${MODEL} faalde opnieuw (${e2?.status}):`, e2?.message);
      }
    }
  }
  try {
    return await callModel(ai, FALLBACK_MODEL, prompt);
  } catch (e: any) {
    console.error(`${FALLBACK_MODEL} faalde ook (${e?.status}):`, e?.message);
    throw new Error('Gemini is momenteel te druk of het gratis quotum is op. Probeer het over enkele minuten opnieuw.');
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY ontbreekt in Vercel' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string);

  try {
    const { data: cyclists, error } = await supabase.from('cyclists').select('id, name, country, team, status');
    if (error || !cyclists) throw new Error('Kon renners niet laden');
    const byId = new Map(cyclists.map((c: any) => [String(c.id), c]));

    // ---------- MODUS 1: volledige quiz voorstellen ----------
    if (body.mode === 'create') {
      const { data: recent } = await supabase
        .from('daily_quizzes').select('statement').order('date', { ascending: false }).limit(60);
      const recentStatements = (recent || []).map((r: any) => `- ${r.statement}`).join('\n');
      const riderList = cyclists.map((c: any) => `${c.id} | ${c.name} | ${c.country} | ${c.team} | ${c.status}`).join('\n');

      const prompt = `You create puzzles for "Cycling Imposter", a daily cycling trivia game.
The player sees a statement and 8 riders. Each rider either MATCHES the statement or is an IMPOSTER (does not match).
${RULES}
PUZZLE RULES
- Pick exactly 8 different riders from the list below, using their id.
- Use between 2 and 5 imposters. Imposters must be plausible (similar era, type of rider or nationality), not obvious.
- Do not repeat or closely copy any of the recent statements.
- For every rider write a short factual note (max 12 words) explaining why they match or not,
  e.g. "Won in 2011", "Never won; 2nd in 2019", "Belgian, but never rode for Lotto".
${body.theme ? `- Theme requested by the admin: ${body.theme}` : ''}

RECENT STATEMENTS (style examples, do not repeat):
${recentStatements}

RIDERS (id | name | country | current team | status):
${riderList}

Answer with ONLY this JSON, no other text:
{"statement": "...", "slots": [{"cyclistId": "...", "isImposter": false, "note": "..."}]}`;

      const draft = parseJson(await ask(ai, prompt));

      // Controle: 8 unieke, bestaande renners en een redelijk aantal imposters
      const slots = (draft.slots || []).filter((s: any) => byId.has(String(s.cyclistId)));
      const unique = new Set(slots.map((s: any) => String(s.cyclistId)));
      const imposters = slots.filter((s: any) => s.isImposter).length;
      if (!draft.statement || slots.length !== 8 || unique.size !== 8 || imposters < 1 || imposters > 7) {
        return res.status(422).json({ error: 'AI gaf geen geldige quiz terug, probeer opnieuw.' });
      }
      // Willekeurige volgorde (Fisher-Yates): het model zet anders vaak alle matches vooraan
      for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
      }
      return res.status(200).json({
        statement: draft.statement,
        // cyclistId terug in de originele vorm uit de database (tekst of getal)
        slots: slots.map((s: any) => ({ cyclistId: byId.get(String(s.cyclistId)).id, isImposter: !!s.isImposter, note: String(s.note || '') })),
      });
    }

    // ---------- MODUS 2: uitleg bij een bestaande (manuele) quiz ----------
    if (body.mode === 'explain') {
      const riders = (body.slots || []).map((s: any) => {
        const c: any = byId.get(String(s.cyclistId));
        return `${s.cyclistId} | ${c?.name || 'unknown'} | marked as ${s.isImposter ? 'IMPOSTER' : 'MATCH'}`;
      }).join('\n');

      const prompt = `You write explanations for "Cycling Imposter", a daily cycling trivia game.
Statement: "${body.statement}"
The admin marked each rider as MATCH (fits the statement) or IMPOSTER (does not fit).
For every rider write a short factual note (max 12 words) explaining why, e.g. "Won in 2011", "Never won; 2nd in 2019".
If you believe the admin's marking is wrong, set "agrees" to false and explain the correct fact in the note.
Only state facts you are certain about; if unsure, write an empty note and set "agrees" to true.
Write notes in sentence case: capitalize only the first word and proper nouns (riders, races, teams, countries).

RIDERS (id | name | marking):
${riders}

Answer with ONLY this JSON, no other text:
{"notes": [{"cyclistId": "...", "note": "...", "agrees": true}]}`;

      const result = parseJson(await ask(ai, prompt));
      return res.status(200).json({ notes: result.notes || [] });
    }

    return res.status(400).json({ error: "mode moet 'create' of 'explain' zijn" });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Onbekende fout' });
  }
}
