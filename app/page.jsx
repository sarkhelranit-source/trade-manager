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
      <div style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#f0f6fc', fontSize: '15px', fontWeight: 700, letterSpacing: '2px' }}>⚔ RANIT SARKHEL TRADE MANAGER</div>
        <button onClick={handleNewSession} style={{ background: '#d29922', color: '#0d1117', border: 'none', padding: '6px 13px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.5px' }}>+ NEW SESSION</button>
      </div>

      <div className="wrap">
        {/* LEFT: Trade Log */}
        <div className="panel" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '28px' }}>NO.</th>
                <th style={{ textAlign: 'center', width: '68px' }}>RESULT</th>
                <th style={{ textAlign: 'right', width: '82px' }}>TRADE AMT <span className="edit-tag">✏</span></th>
                <th style={{ textAlign: 'right', width: '78px' }}>RETURN</th>
                <th style={{ textAlign: 'right' }}>CUR. BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, i) => {
                const prevResult = i > 0 ? results[i - 1] : 'seed';
                const isSessionEnded = (i > 0 && results[i - 1] === 'W') || (i >= maxLossLimit);
                const canSet = !isSessionEnded && (i === 0 || prevResult === 'L');
                const rowBg = trade.result === 'W' ? '#0f2a1a' : trade.result === 'L' ? '#2a0f0f' : 'transparent';
                const retColor = trade.ret > 0 ? '#3fb950' : trade.ret < 0 ? '#f85149' : '#484f58';
                const balColor = trade.result ? '#f0f6fc' : '#6e7681';
                const selBg = trade.result === 'W' ? '#238636' : trade.result === 'L' ? '#da3633' : '#21262d';
                const retDisplay = trade.ret !== null ? (trade.ret >= 0 ? '+' : '') + money(trade.ret, currSymbol) : '—';
                const isManual = manualTradeAmts[i] !== null;

                return (
                  <tr key={i} style={{ background: rowBg, borderBottom: '1px solid #161b22' }}>
                    <td style={{ padding: '5px 8px', color: '#484f58', textAlign: 'center', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                      <select
                        value={trade.result}
                        onChange={e => updateResult(i, e.target.value)}
                        disabled={!canSet}
                        className="res-sel"
                        style={{ background: selBg, color: '#f0f6fc', opacity: canSet ? 1 : 0.35, cursor: canSet ? 'pointer' : 'not-allowed' }}
                      >
                        <option value="">–</option>
                        <option value="W">W ▲</option>
                        <option value="L">L ▼</option>
                      </select>
                    </td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', color: '#79c0ff' }}>
                      {trade.tradeAmt !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <span style={{ color: '#484f58', marginRight: '2px', fontSize: '11px' }}>{currSymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={isManual ? manualTradeAmts[i] : trade.tradeAmt.toFixed(2)}
                            onChange={e => updateManualAmt(i, e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: isManual ? '#d29922' : '#79c0ff', textAlign: 'right', width: '55px', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 700, outline: 'none', borderBottom: '1px dashed #30363d', padding: 0 }}
                          />
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', color: retColor }}>{retDisplay}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: balColor, fontWeight: trade.result ? 700 : 400 }}>{currSymbol}{trade.balance.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px', textAlign: 'center' }}>
            <button onClick={handleClear} style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d', padding: '5px 18px', fontSize: '11px', letterSpacing: '1px' }}>CLEAR</button>
          </div>
        </div>

        {/* MIDDLE: Calculations */}
        <div className="panel" style={{ padding: '10px 9px' }}>
          <div style={{ background: '#21262d', borderRadius: '4px', padding: '5px 10px', marginBottom: '9px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#d29922', border: '1px solid #d2992240' }}>
            <span>✏</span><span>Gold-bordered fields are editable — click to change</span>
          </div>

          <div className="card">
            <div className="card-title">Calculations</div>
            <div className="row">
              <span className="lbl">Initial Capital <span className="edit-tag">✏</span></span>
              <input type="number" className="edt edt-lg" value={initialCapital} onChange={e => setInitialCapital(parseFloat(e.target.value) || 0)} step="0.01" min="0" />
            </div>
            <div className="row"><span className="lbl">Total Trades</span><span className="val">{totalTrades}</span></div>
            <div className="row"><span className="lbl">Win Trades</span><span className="val">{winTrades}</span></div>
            <div className="row">
              <span className="lbl">Payout % <span className="edit-tag">✏</span></span>
              <input type="number" className="edt edt-sm" value={payoutPct} onChange={e => setPayoutPct(parseFloat(e.target.value) || 0)} step="0.01" min="0.01" max="1" />
            </div>
            <div className="row">
              <span className="lbl">Currency <span className="edit-tag">✏</span></span>
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ background: '#1c2128', color: '#f0f6fc', border: '1px solid #d29922', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, outline: 'none' }}>
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
            <div style={{ textAlign: 'right', marginTop: '6px' }}>
              <span style={{ background: '#21262d', color: '#8b949e', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', display: totalTrades > 0 ? 'inline' : 'none' }}>
                {Math.round(winRate * 100)}% W/R
              </span>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Session Target</div>
            <div className="row"><span className="lbl">Capital Final</span><span className="val">{currSymbol}{capitalFinal.toFixed(2)}</span></div>
            <div className="row"><span className="lbl">Account Gain</span><span className="val" style={{ color: accountGain >= 0 ? '#3fb950' : '#f85149' }}>{(accountGainPct >= 0 ? '+' : '')}{(accountGainPct * 100).toFixed(2)}%</span></div>
            <div className="row">
              <span className="lbl">Win Profit <span className="edit-tag">✏</span></span>
              <div style={{ background: '#238636', borderRadius: '4px', padding: '1px 8px', display: 'flex', alignItems: 'center', gap: '3px', border: '1px solid #3fb950' }}>
                <span style={{ color: '#f0f6fc', fontSize: '12px' }}>{currSymbol}</span>
                <input type="number" value={sessionProfitTarget} onChange={e => setSessionProfitTarget(parseFloat(e.target.value) || 0)} step="0.01" min="0.01" style={{ background: 'transparent', color: '#f0f6fc', border: 'none', width: '58px', textAlign: 'right', fontSize: '13px', fontWeight: 700, outline: 'none' }} />
              </div>
            </div>
            <div className="row">
              <span className="lbl">Stop Loss <span className="edit-tag">✏</span>&nbsp;<span style={{ fontSize: '9px', color: '#8b949e' }}>(% of capital)</span></span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="val" style={{ color: '#d29922' }}>{currSymbol}{stopLoss.toFixed(2)}</span>
                <input type="number" className="edt" value={stopLossPct} onChange={e => setStopLossPct(parseFloat(e.target.value) || 0)} step="1" min="1" max="99" style={{ width: '52px', fontSize: '12px', padding: '3px 5px' }} />
                <span style={{ color: '#8b949e', fontSize: '11px' }}>%</span>
              </div>
            </div>
            <div className="row">
              <span className="lbl">Max Loss Limit <span className="edit-tag">✏</span></span>
              <input type="number" className="edt edt-sm" value={maxLossLimit} onChange={e => setMaxLossLimit(parseInt(e.target.value) || 0)} step="1" min="1" />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Session Performance</div>
            <div className="row">
              <span className="lbl">Events Won</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="val">{winTrades.toFixed(2)}</span>
                <span style={{ background: '#0f2a1a', color: '#3fb950', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>{totalTrades > 0 ? Math.round(winRate * 100) : 0}%</span>
              </div>
            </div>
            <div className="row">
              <span className="lbl">Events Lost</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="val">{lossTrades.toFixed(2)}</span>
                <span style={{ background: '#2a0f0f', color: '#f85149', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>{totalTrades > 0 ? Math.round(lossRate * 100) : 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Counter + Daily Goals */}
        <div className="panel" style={{ padding: '10px 9px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '9px' }}>
            <button style={{ flex: 1, background: '#21262d', color: '#8b949e', border: '1px solid #30363d', padding: '7px', fontSize: '11px', letterSpacing: '0.5px' }}>LOG SESSION</button>
            <button style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d', padding: '7px 12px', fontSize: '11px' }}>CB</button>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <div className="card-title">Session Counter</div>
            <div style={{ fontSize: '80px', fontWeight: 700, color: '#f0f6fc', lineHeight: 1, letterSpacing: '-2px' }}>{sessionCount}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px' }}>
              <button onClick={() => setSessionCount(c => Math.max(1, c - 1))} style={{ background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', width: '40px', height: '34px', fontSize: '14px' }}>▼</button>
              <button onClick={() => setSessionCount(c => c + 1)} style={{ background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', width: '40px', height: '34px', fontSize: '14px' }}>▲</button>
            </div>
            <button onClick={() => setSessionCount(1)} style={{ marginTop: '8px', background: 'transparent', color: '#484f58', border: '1px solid #21262d', padding: '3px 12px', fontSize: '10px', letterSpacing: '1px' }}>RESET</button>
          </div>

          <div className="card">
            <div className="card-title">Daily Goals <span style={{ fontSize: '8px', letterSpacing: '0.3px' }}>(est.)</span></div>
            <div className="row">
              <span className="lbl">Profit Target <span className="edit-tag">✏</span></span>
              <input type="number" className="edt edt-sm" value={profitTarget} onChange={e => setProfitTarget(parseFloat(e.target.value) || 0)} step="1" min="0" />
            </div>
            <div className="row"><span className="lbl">Daily Goal Format</span><span className="val">{currSymbol}</span></div>
            <div className="row"><span className="lbl">Sessions Required</span><span className="val" style={{ color: '#79c0ff' }}>{sessionsReq}</span></div>
            <div className="row"><span className="lbl">Account Gain</span><span className="val" style={{ color: '#3fb950' }}>{(acctGainGoal * 100).toFixed(2)}%</span></div>
            <div className="row"><span className="lbl">Capital Final</span><span className="val" style={{ color: '#3fb950' }}>{currSymbol}{(initialCapital + profitTarget).toFixed(2)}</span></div>
          </div>

          <div className="card" style={{ borderColor: '#21262d' }}>
            <div className="card-title" style={{ marginBottom: '8px' }}>Formula Reference</div>
            <div style={{ fontSize: '10px', color: '#484f58', lineHeight: 1.8 }}>
              <div>• <span style={{ color: '#79c0ff' }}>Trade 1:</span> {currSymbol}1.10 (Fixed)</div>
              <div>• <span style={{ color: '#3fb950' }}>After W:</span> Session Ends</div>
              <div>• <span style={{ color: '#f85149' }}>After L:</span> ROUNDUP((loss + target) ÷ payout, 2)</div>
              <div>• <span style={{ color: '#d29922' }}>Stop Loss:</span> capital × (1 − stop%)</div>
              <div>• <span style={{ color: '#8b949e' }}>Sessions:</span> ROUNDUP(profit ÷ win profit, 0)</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
