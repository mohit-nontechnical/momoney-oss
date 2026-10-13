"use client";
import { useEffect, useRef, useState } from "react";
import type { AskHistoryTurn } from "@/lib/types";
import { useAskDrawer } from "./AskDrawerProvider";
import AskAnswer from "./AskAnswer";
interface Turn {
    q: string;
    a: string;
    sources?: {
        date: string;
        payee: string;
        amount: number;
        account: string;
    }[];
    dataDate?: string;
}
const MAX_QUESTION_LEN = 500;
const MAX_HISTORY_TURNS = 4;
export default function AskDrawer() {
    const { open, setOpen } = useAskDrawer();
    const [question, setQuestion] = useState("");
    const [turns, setTurns] = useState<Turn[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    const conversation = useRef<HTMLDivElement>(null);
    useEffect(() => { if (open)
        input.current?.focus(); }, [open]);
    useEffect(() => { conversation.current?.scrollTo({ top: conversation.current.scrollHeight }); }, [turns, loading]);
    useEffect(() => { function escape(e: KeyboardEvent) { if (e.key === 'Escape')
        setOpen(false); } if (open)
        window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [open, setOpen]);
    async function ask() {
        const q = question.trim();
        if (!q || loading)
            return;
        if (q.length > MAX_QUESTION_LEN) {
            setError(`Question must be ${MAX_QUESTION_LEN} characters or fewer.`);
            return;
        }
        setLoading(true);
        setError(null);
        const historyPayload: AskHistoryTurn[] = turns
            .slice(-MAX_HISTORY_TURNS)
            .map((t) => ({ q: t.q, a: t.a }));
        try {
            const res = await fetch("/api/ask", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ question: q, history: historyPayload }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setError(data.error || `Ask failed (${res.status})`);
                return;
            }
            setTurns((cur) => [...cur, { q, a: data.answer, sources: data.sources, dataDate: data.data_date }]);
            setQuestion("");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Ask failed");
        }
        finally {
            setLoading(false);
        }
    }
    return (<>
    <button className="ask-floating" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="money-chat">{open ? 'Close Ask' : 'Ask MoMoney'} <span aria-hidden="true">{open ? '×' : '↗'}</span></button>
    {open && (<div className="ask-drawer" id="money-chat" role="dialog" aria-label="Ask MoMoney">
      <div className="ask-head">
        <span>Ask MoMoney</span>
        <button type="button" className="ask-close" onClick={() => setOpen(false)} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="ask-convo" ref={conversation} aria-live="polite">
        {!turns.length && !loading && !error && (<p className="fn">Ask about your spending, fees, subscriptions, or net worth.</p>)}
        {turns.map((t, i) => (<div key={i} className="ask-turn">
            <p className="ask-q">{t.q}</p>
            
            <div className="ask-a amt-block">
              <AskAnswer text={t.a}/>
            </div>
            {t.dataDate && <p className="fn">Data updated {new Date(t.dataDate).toLocaleDateString()}</p>}
            {!!t.sources?.length && <details className="ask-sources"><summary>Transactions behind this answer</summary>{t.sources.map((s, j) => <p key={j} className="amt-block">{s.date} · {s.payee} · ${Math.abs(s.amount).toFixed(2)}<br /><small>{s.account}</small></p>)}</details>}
          </div>))}
        {loading && <p className="fn">Thinking…</p>}
        {error && <p className="ask-error">{error}</p>}
      </div>
      <div className="ask-input-row">
        <textarea ref={input} aria-label="Your finance question" className="ask-input" placeholder="What's my biggest recurring cost?" value={question} maxLength={MAX_QUESTION_LEN} rows={2} disabled={loading} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask();
                }
            }}/>
        <button type="button" className="btn ask-send" disabled={loading || !question.trim()} onClick={ask}>
          Send
        </button>
      </div>
    </div>)}
    </>);
}
