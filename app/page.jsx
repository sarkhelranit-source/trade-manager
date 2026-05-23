'use client';

import { useState, useMemo } from 'react';

const NUM = 20;
const round = (v, d) => { const f = Math.pow(10, d); return Math.round(v * f) / f; };
const roundUp = (v, d) => { const f = Math.pow(10, d); return Math.ceil(v * f) / f; };
const money = (v, sym) => sym + Math.abs(v).toFixed(2);

export default function TradeManager() {
  const [initialCapital, setInitialCapital] = useState(3296.53);
  const [payoutPct, setPayoutPct] = useState(0.92);
  const [sessionProfitTarget, setSessionProfitTarget] = useState(1.0);
  const [stopLossPct, setStopLossPct] = useState(20);
  const [maxLossLimit, setMaxLossLimit] = useState(11);
  const [profitTarget, setProfitTarget] = useState(50);
  const [currency, setCurrency] = useState('USD ($)');
  const [sessionCount, setSessionCount] = useState(1);
  const [results, setResults] = useState(Array(NUM).fill(''));
  const [manualTradeAmts, setManualTradeAmts] = useState(Array(NUM).fill(null));

  const currSymbol = currency.match(/\((.*?)\)/)?.[1] || '$';

  const trades = useMemo(() => {
    const computedTrades = [];
    for (let i = 0; i < NUM; i++) {
      const result = results[i];
      const prev = i > 0 ? computedTrades[i - 1] : null;
      const prevBalance = prev ? prev.balance : initialCapital;
      const prevResult = prev ? prev.result : null;

      let sessionEnded = false;
      if (i > 0 && results[i - 1] === 'W') sessionEnded = true;
      if (i >= maxLossLimit) sessionEnded = true;

      let tradeAmt = null;
      if (!sessionEnded) {
        if (manualTradeAmts[i] !== null) {
          tradeAmt = manualTradeAmts[i];
        } else if (i === 0) {
          tradeAmt = 1.10;
        } else if (prevResult === 'L') {
          tradeAmt = roundUp((prev.sessionLoss + sessionProfitTarget) / payoutPct, 2);
        }
      }

      let ret = null;
      if (result === 'W' && tradeAmt !== null) ret = round(tradeAmt * payoutPct, 2);
      else if (result === 'L' && tradeAmt !== null) ret = -tradeAmt;

      const balance = ret !== null ? round(prevBalance + ret, 2) : prevBalance;

      let sessionLoss = 0;
      if (result === 'L') {
        if (!prev || prevResult !== 'L') {
          sessionLoss = tradeAmt || 0;
        } else {
          sessionLoss = prev.sessionLoss + (prev.sessionLoss + sessionProfitTarget) / payoutPct;
        }
      }
      computedTrades.push({ result, tradeAmt, ret, balance, sessionLoss });
    }
    return computedTrades;
  }, [initialCapital, payoutPct, sessionProfitTarget, maxLossLimit, results, manualTradeAmts]);

  const totalTrades = results.filter(r => r === 'W' || r === 'L').length;
  const winTrades = results.filter(r => r === 'W').length;
  const lossTrades = results.filter(r => r === 'L').length;

  let capitalFinal = initialCapital;
  for (let i = NUM - 1; i >= 0; i--) {
    if (trades[i].ret !== null) { capitalFinal = trades[i].balance; break; }
  }

  const accountGain = capitalFinal - initialCapital;
  const accountGainPct = initialCapital > 0 ? accountGain / initialCapital : 0;
  const stopLoss = round(initialCapital * (1 - stopLossPct / 100), 2);
  const winRate = totalTrades > 0 ? winTrades / totalTrades : 0;
  const lossRate = totalTrades > 0 ? lossTrades / totalTrades : 0;
  const sessionsReq = sessionProfitTarget > 0 ? Math.ceil(profitTarget / sessionProfitTarget) : 0;
  const acctGainGoal = initialCapital > 0 ? profitTarget / initialCapital : 0;

  const handleNewSession = () => {
    setInitialCapital(capitalFinal);
    setResults(Array(NUM).fill(''));
    setManualTradeAmts(Array(NUM).fill(null));
    setSessionCount(c => c + 1);
  };

  const handleClear = () => {
    setResults(Array(NUM).fill(''));
    setManualTradeAmts(Array(NUM).fill(null));
  };

  const updateResult = (idx, val) => {
    const newResults = [...results];
    newResults[idx] = val;
    for (let j = idx + 1; j < NUM; j++) {
      if (newResults[j] !== '') newResults[j] = ''; else break;
    }
    setResults(newResults);
  };

  const updateManualAmt = (idx, valStr) => {
    const val = parseFloat(valStr);
    const newAmts = [...manualTradeAmts];
    if (isNaN(val) || valStr.trim() === '') {
      newAmts[idx] = null;
    } else {
      newAmts[idx] = val;
    }
    setManualTradeAmts(newAmts);
  };

  return (
    <>
      <header className="app-header">
        <div className="brand-title">
          <span>⚔</span> TRADE MANAGER
        </div>
        <button onClick={handleNewSession} className="btn-primary">
          + NEW SESSION
        </button>
      </header>

      <div className="wrap">
        {/* LEFT: Trade Log */}
        <div className="panel" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="text-center" style={{ width: '40px' }}>NO.</th>
                <th className="text-center" style={{ width: '80px' }}>RESULT</th>
                <th className="text-right" style={{ width: '100px' }}>TRADE AMT <span className="edit-tag">✏</span></th>
                <th className="text-right" style={{ width: '90px' }}>RETURN</th>
                <th className="text-right">CUR. BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, i) => {
                const prevResult = i > 0 ? results[i - 1] : 'seed';
                const isSessionEnded = (i > 0 && results[i - 1] === 'W') || (i >= maxLossLimit);
                const canSet = !isSessionEnded && (i === 0 || prevResult === 'L');
                
                const trClass = trade.result === 'W' ? 'tr-win' : trade.result === 'L' ? 'tr-loss' : 'tr-hover';
                const selClass = trade.result === 'W' ? 'res-sel res-win' : trade.result === 'L' ? 'res-sel res-loss' : 'res-sel res-empty';
                
                const retColorClass = trade.ret > 0 ? 'val-success' : trade.ret < 0 ? 'val-danger' : '';
                const retDisplay = trade.ret !== null ? (trade.ret >= 0 ? '+' : '') + money(trade.ret, currSymbol) : '—';
                const isManual = manualTradeAmts[i] !== null;

                return (
                  <tr key={i} className={trClass}>
                    <td className="text-center" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td className="text-center">
                      <select
                        value={trade.result}
                        onChange={e => updateResult(i, e.target.value)}
                        disabled={!canSet}
                        className={selClass}
                        style={{ opacity: canSet ? 1 : 0.4, cursor: canSet ? 'pointer' : 'not-allowed' }}
                      >
                        <option value="">–</option>
                        <option value="W">W ▲</option>
                        <option value="L">L ▼</option>
                      </select>
                    </td>
                    <td className="text-right" style={{ color: isManual ? 'var(--accent-gold)' : '#3b82f6' }}>
                      {trade.tradeAmt !== null ? (
                        <div className="flex-center" style={{ justifyContent: 'flex-end' }}>
                          <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>{currSymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={isManual ? manualTradeAmts[i] : trade.tradeAmt.toFixed(2)}
                            onChange={e => updateManualAmt(i, e.target.value)}
                            className="inline-input text-right"
                            style={{ width: '60px', color: 'inherit' }}
                          />
                        </div>
                      ) : '—'}
                    </td>
                    <td className={`text-right font-mono ${retColorClass}`}>{retDisplay}</td>
                    <td className="text-right val" style={{ color: trade.result ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {currSymbol}{trade.balance.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="text-center" style={{ padding: '20px' }}>
            <button onClick={handleClear} className="btn-secondary">CLEAR LOG</button>
          </div>
        </div>

        {/* MIDDLE: Calculations */}
        <div className="panel">
          <div className="info-banner">
            <span>✏</span>
            <span>Gold-bordered fields are editable — click to change</span>
          </div>

          <div className="card">
            <div className="card-title">Calculations</div>
            <div className="row">
              <span className="lbl">Initial Capital <span className="edit-tag">✏</span></span>
              <div className="flex-center gap-2">
                <span className="font-mono text-muted">{currSymbol}</span>
                <input type="number" className="input-base input-editable input-lg" value={initialCapital} onChange={e => setInitialCapital(parseFloat(e.target.value) || 0)} step="0.01" min="0" />
              </div>
            </div>
            <div className="row"><span className="lbl">Total Trades</span><span className="val">{totalTrades}</span></div>
            <div className="row"><span className="lbl">Win Trades</span><span className="val">{winTrades}</span></div>
            <div className="row">
              <span className="lbl">Payout % <span className="edit-tag">✏</span></span>
              <input type="number" className="input-base input-editable input-sm" value={payoutPct} onChange={e => setPayoutPct(parseFloat(e.target.value) || 0)} step="0.01" min="0.01" max="1" />
            </div>
            <div className="row">
              <span className="lbl">Currency <span className="edit-tag">✏</span></span>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="select-base select-editable">
                <option value="USD ($)">USD ($)</option>
                <option value="EUR (€)">EUR (€)</option>
                <option value="GBP (£)">GBP (£)</option>
                <option value="INR (₹)">INR (₹)</option>
                <option value="AUD (A$)">AUD (A$)</option>
                <option value="CAD (C$)">CAD (C$)</option>
                <option value="JPY (¥)">JPY (¥)</option>
                <option value="BTC (₿)">BTC (₿)</option>
              </select>
            </div>
            {totalTrades > 0 && (
              <div className="text-right" style={{ marginTop: '12px' }}>
                <span className="badge badge-neutral">
                  {Math.round(winRate * 100)}% W/R
                </span>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Session Target</div>
            <div className="row"><span className="lbl">Capital Final</span><span className="val">{currSymbol}{capitalFinal.toFixed(2)}</span></div>
            <div className="row"><span className="lbl">Account Gain</span><span className={`val ${accountGain >= 0 ? 'val-success' : 'val-danger'}`}>{(accountGainPct >= 0 ? '+' : '')}{(accountGainPct * 100).toFixed(2)}%</span></div>
            <div className="row">
              <span className="lbl">Win Profit <span className="edit-tag">✏</span></span>
              <div className="flex-center gap-2" style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: '6px', padding: '4px 8px' }}>
                <span style={{ color: 'var(--success)', fontSize: '12px' }}>{currSymbol}</span>
                <input type="number" value={sessionProfitTarget} onChange={e => setSessionProfitTarget(parseFloat(e.target.value) || 0)} step="0.01" min="0.01" style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', width: '60px', textAlign: 'right', fontSize: '14px', fontWeight: 700, outline: 'none', fontFamily: 'var(--font-mono)' }} />
              </div>
            </div>
            <div className="row">
              <span className="lbl">Stop Loss <span className="edit-tag">✏</span>&nbsp;<span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(% of capital)</span></span>
              <div className="flex-center gap-2">
                <span className="val val-accent" style={{ marginRight: '8px' }}>{currSymbol}{stopLoss.toFixed(2)}</span>
                <input type="number" className="input-base input-editable" value={stopLossPct} onChange={e => setStopLossPct(parseFloat(e.target.value) || 0)} step="1" min="1" max="99" style={{ width: '50px', padding: '6px 4px', textAlign: 'center' }} />
                <span style={{ color: 'var(--text-muted)' }}>%</span>
              </div>
            </div>
            <div className="row">
              <span className="lbl">Max Loss Limit <span className="edit-tag">✏</span></span>
              <input type="number" className="input-base input-editable input-sm" value={maxLossLimit} onChange={e => setMaxLossLimit(parseInt(e.target.value) || 0)} step="1" min="1" />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Session Performance</div>
            <div className="row">
              <span className="lbl">Events Won</span>
              <div className="flex-center gap-3">
                <span className="val">{winTrades.toFixed(2)}</span>
                <span className="badge badge-success">{totalTrades > 0 ? Math.round(winRate * 100) : 0}%</span>
              </div>
            </div>
            <div className="row">
              <span className="lbl">Events Lost</span>
              <div className="flex-center gap-3">
                <span className="val">{lossTrades.toFixed(2)}</span>
                <span className="badge badge-danger">{totalTrades > 0 ? Math.round(lossRate * 100) : 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Counter + Daily Goals */}
        <div className="panel">
          <div className="flex-center gap-2" style={{ marginBottom: '16px' }}>
            <button className="btn-secondary" style={{ flex: 1 }}>LOG SESSION</button>
            <button className="btn-icon">📋</button>
          </div>

          <div className="card text-center" style={{ padding: '32px 24px' }}>
            <div className="card-title">Session Counter</div>
            <div className="counter-text">{sessionCount}</div>
            <div className="counter-controls">
              <button className="btn-icon" onClick={() => setSessionCount(c => Math.max(1, c - 1))}>−</button>
              <button className="btn-icon" onClick={() => setSessionCount(c => c + 1)}>+</button>
            </div>
            <button className="btn-secondary" style={{ marginTop: '16px', fontSize: '10px', padding: '6px 12px' }} onClick={() => setSessionCount(1)}>RESET COUNTER</button>
          </div>

          <div className="card">
            <div className="card-title">Daily Goals <span style={{ textTransform: 'none', fontWeight: 500 }}>(est.)</span></div>
            <div className="row">
              <span className="lbl">Profit Target <span className="edit-tag">✏</span></span>
              <div className="flex-center gap-2">
                <span className="font-mono text-muted">{currSymbol}</span>
                <input type="number" className="input-base input-editable input-sm" value={profitTarget} onChange={e => setProfitTarget(parseFloat(e.target.value) || 0)} step="1" min="0" />
              </div>
            </div>
            <div className="row"><span className="lbl">Daily Goal Format</span><span className="val">{currSymbol}</span></div>
            <div className="row"><span className="lbl">Sessions Required</span><span className="val" style={{ color: '#3b82f6' }}>{sessionsReq}</span></div>
            <div className="row"><span className="lbl">Account Gain</span><span className="val val-success">{(acctGainGoal * 100).toFixed(2)}%</span></div>
            <div className="row"><span className="lbl">Capital Final</span><span className="val val-success">{currSymbol}{(initialCapital + profitTarget).toFixed(2)}</span></div>
          </div>

          <div className="card" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="card-title">Formula Reference</div>
            <div className="formula-ref">
              <div className="formula-item"><div className="formula-dot dot-blue"></div> <span>Trade 1: {currSymbol}1.10 (Fixed)</span></div>
              <div className="formula-item"><div className="formula-dot dot-green"></div> <span>After W: Session Ends</span></div>
              <div className="formula-item"><div className="formula-dot dot-red"></div> <span>After L: ROUNDUP((loss + target) ÷ payout, 2)</span></div>
              <div className="formula-item"><div className="formula-dot dot-gold"></div> <span>Stop Loss: capital × (1 − stop%)</span></div>
              <div className="formula-item"><div className="formula-dot dot-gray"></div> <span>Sessions: ROUNDUP(profit ÷ win profit, 0)</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
