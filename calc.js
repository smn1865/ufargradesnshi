// calc.js (simplified & easy to extend)
// Features: per-row GPA, per-bloc MOG & Result, per-row custom weights via data-midw / data-finw.
// Defaults to 0.4 (midterm) and 0.6 (final) if not provided.

(function () {
  const CONFIG = {
    decimals: 1,
    defaults: { midWeight: 0.4, finWeight: 0.6 },
    limits: { min: 0, max: 20 },
    selectors: {
      bloc: 'tbody.bloc',
      row: 'tr',
      mid: 'input.midterm',
      fin: 'input.final',
      gpa: '.gpa',
      ects: '.ects',
      mog: '.mog',
      res: '.result',
      overallCell: '.overall-cell'
    },
    labels: {
      dash: '—',
      wrong: 'wrong input',
      undecided: 'undecided',
      passed: 'Passed',
      notPassed: 'Not passed'
    }
  };

  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : NaN;
  }

  function text(el, val) {
    if (el) el.textContent = val;
  }

  function clampCheck(v, min, max) {
    return !(v < min || v > max);
  }

  function getRowWeights(row) {
    const mw = num(row && row.dataset ? row.dataset.midw : undefined);
    const fw = num(row && row.dataset ? row.dataset.finw : undefined);
    if (Number.isFinite(mw) && Number.isFinite(fw) && Math.abs(mw + fw - 1) < 1e-9) {
      return { mw, fw };
    }
    return { mw: CONFIG.defaults.midWeight, fw: CONFIG.defaults.finWeight };
  }

  function calcRowGpa(row) {
    const midEl = row.querySelector(CONFIG.selectors.mid);
    const finEl = row.querySelector(CONFIG.selectors.fin);
    const gpaEl = row.querySelector(CONFIG.selectors.gpa);

    const midRaw = num(midEl && midEl.value);
    const finRaw = num(finEl && finEl.value);

    const anyEntered = Number.isFinite(midRaw) || Number.isFinite(finRaw);
    if (!anyEntered) {
      text(gpaEl, CONFIG.labels.dash);
      return { ok: true, result: 0, anyEntered: false };
    }

    const mid = Number.isFinite(midRaw) ? midRaw : 0;
    const fin = Number.isFinite(finRaw) ? finRaw : 0;
    const { min, max } = CONFIG.limits;

    if (!clampCheck(mid, min, max) || !clampCheck(fin, min, max)) {
      text(gpaEl, CONFIG.labels.wrong);
      return { ok: false, result: 0, anyEntered: true };
    }

    const { mw, fw } = getRowWeights(row);
    const result = mid * mw + fin * fw;
    text(gpaEl, result.toFixed(CONFIG.decimals));
    return { ok: true, result, anyEntered: true };
  }

  // --- per-bloc MOG & Result ---
  function updateBloc(blocTbody) {
    const rows = Array.from(blocTbody.querySelectorAll(CONFIG.selectors.row));
    if (!rows.length) return;

    const firstRow = rows[0];
    const mogEl = firstRow.querySelector(CONFIG.selectors.mog);
    const resEl = firstRow.querySelector(CONFIG.selectors.res);

    // clear mutual cells in other rows
    for (let i = 1; i < rows.length; i++) {
      const m = rows[i].querySelector(CONFIG.selectors.mog);
      const r = rows[i].querySelector(CONFIG.selectors.res);
      text(m, CONFIG.labels.dash);
      text(r, CONFIG.labels.dash);
    }

    // overall ECTS for this bloc (merged cell)
    const overallCell = blocTbody.querySelector(CONFIG.selectors.overallCell);
    const overallECTS = num(overallCell && overallCell.textContent);

    if (!Number.isFinite(overallECTS) || overallECTS <= 0) {
      text(mogEl, CONFIG.labels.dash);
      text(resEl, CONFIG.labels.dash);
      return;
    }

    let invalid = false;
    let anyEnteredInBloc = false;
    let weightedSum = 0;

    rows.forEach((row) => {
      const { ok, result, anyEntered } = calcRowGpa(row);
      if (anyEntered) anyEnteredInBloc = true;
      if (!ok) { invalid = true; return; }

      const ectsEl = row.querySelector(CONFIG.selectors.ects);
      const ects = num(ectsEl && ectsEl.textContent);
      const rowECTS = Number.isFinite(ects) ? ects : 0;
      weightedSum += (anyEntered ? result : 0) * rowECTS;
    });

    if (invalid) {
      text(mogEl, CONFIG.labels.wrong);
      text(resEl, CONFIG.labels.undecided);
      return;
    }

    if (!anyEnteredInBloc) {
      text(mogEl, CONFIG.labels.undecided);
      text(resEl, CONFIG.labels.undecided);
      return;
    }

    const moduleAvg = weightedSum / overallECTS;
    text(mogEl, moduleAvg.toFixed(CONFIG.decimals));
    text(resEl, moduleAvg >= 10 ? CONFIG.labels.passed : CONFIG.labels.notPassed);
  }

  // --- wiring ---
  function onInput(e) {
    const t = e.target;
    if (!t || !(t.matches && t.matches(`${CONFIG.selectors.mid}, ${CONFIG.selectors.fin}`))) return;
    const bloc = t.closest(CONFIG.selectors.bloc);
    if (bloc) updateBloc(bloc);
  }

  function recalcAll() {
    document.querySelectorAll(CONFIG.selectors.bloc).forEach(updateBloc);
  }

  // public API for easy extension
  window.GradeCalc = {
    CONFIG,
    recalcAll,
    updateBloc,
    calcRowGpa
  };

  document.addEventListener('input', onInput);
  document.addEventListener('DOMContentLoaded', recalcAll);
})();
