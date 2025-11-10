// calc.js
// All blocs: per-row GPA + per-bloc mutual MOG & Result.
// Supports per-subject custom weighting via data attributes on the <tr>:
//   data-midw="0.3" data-finw="0.7"
// If not provided, defaults to 0.4 (midterm) and 0.6 (final).

(function () {
  // --- helpers ---
  function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : NaN; }

  function getRowWeights(row) {
    const mw = num(row?.dataset?.midw);
    const fw = num(row?.dataset?.finw);
    if (Number.isFinite(mw) && Number.isFinite(fw) && Math.abs(mw + fw - 1) < 1e-9) {
      return { mw, fw };
    }
    return { mw: 0.4, fw: 0.6 }; // default
  }

  function calcRowGpa(row) {
    const midEl = row.querySelector('input.midterm');
    const finEl = row.querySelector('input.final');
    const gpaEl = row.querySelector('.gpa');

    const midRaw = num(midEl?.value);
    const finRaw = num(finEl?.value);

    const anyEntered = Number.isFinite(midRaw) || Number.isFinite(finRaw);
    if (!anyEntered) {
      if (gpaEl) gpaEl.textContent = '—';
      return { ok: true, result: 0, anyEntered: false };
    }

    const mid = Number.isFinite(midRaw) ? midRaw : 0;
    const fin = Number.isFinite(finRaw) ? finRaw : 0;

    if (mid < 0 || mid > 20 || fin < 0 || fin > 20) {
      if (gpaEl) gpaEl.textContent = 'wrong input';
      return { ok: false, result: 0, anyEntered: true };
    }

    const { mw, fw } = getRowWeights(row);
    const result = mid * mw + fin * fw;

    if (gpaEl) gpaEl.textContent = result.toFixed(1);
    return { ok: true, result, anyEntered: true };
  }

  function updateBloc(blocTbody) {
    const rows = Array.from(blocTbody.querySelectorAll('tr'));
    if (!rows.length) return;

    // mutual cells live in the first row of the bloc
    const firstRow = rows[0];
    const mogEl = firstRow.querySelector('.mog');
    const resEl = firstRow.querySelector('.result');

    // clear mutual cells in other rows
    for (let i = 1; i < rows.length; i++) {
      const m = rows[i].querySelector('.mog');
      const r = rows[i].querySelector('.result');
      if (m) m.textContent = '—';
      if (r) r.textContent = '—';
    }

    // overall ECTS (merged cell inside this bloc)
    const overallCell = blocTbody.querySelector('.overall-cell');
    const overallECTS = num(overallCell?.textContent);

    if (!Number.isFinite(overallECTS) || overallECTS <= 0) {
      if (mogEl) mogEl.textContent = '—';
      if (resEl) resEl.textContent = '—';
      return;
    }

    let invalid = false;
    let anyEnteredInBloc = false;
    let weightedSum = 0;

    rows.forEach((row) => {
      // update each row GPA first
      const { ok, result, anyEntered } = calcRowGpa(row);
      if (anyEntered) anyEnteredInBloc = true;
      if (!ok) { invalid = true; return; }

      const ects = num(row.querySelector('.ects')?.textContent);
      const rowECTS = Number.isFinite(ects) ? ects : 0;
      weightedSum += (anyEntered ? result : 0) * rowECTS;
    });

    if (invalid) {
      if (mogEl) mogEl.textContent = 'wrong input';
      if (resEl) resEl.textContent = 'undecided';
      return;
    }

    if (!anyEnteredInBloc) {
      if (mogEl) mogEl.textContent = 'undecided';
      if (resEl) resEl.textContent = 'undecided';
      return;
    }

    const moduleAvg = weightedSum / overallECTS;
    if (mogEl) mogEl.textContent = moduleAvg.toFixed(1);
    if (resEl) resEl.textContent = moduleAvg > 10 ? 'Passed' : 'Not passed';
  }

  // --- wire up all blocs ---
  function onInput(e) {
    const t = e.target;
    if (!t.matches('input.midterm, input.final')) return;
    const row = t.closest('tr');
    const bloc = t.closest('tbody.bloc');
    if (!row || !bloc) return;

    // only update the affected bloc
    updateBloc(bloc);
  }

  document.addEventListener('input', onInput);

})();
