/* Spec page: token tables with live contrast, contents highlighting, screen previews, small demos. */
(function () {
  'use strict';

  window.StudioIcons.hydrate(document);

  /* ---------------- Contrast (WCAG 2.x) ---------------- */
  function rgb(value) {
    const v = value.trim();
    if (v[0] === '#') {
      const h = v.length === 4 ? v.slice(1).split('').map((c) => c + c).join('') : v.slice(1, 7);
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    }
    const m = v.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
  }
  function lum(value) {
    return rgb(value).map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); })
      .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
  }
  function contrast(a, b) {
    const x = lum(a);
    const y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  /* Read both appearances from tokens.css: :root is dark; a probe element carries data-appearance="light". */
  const rootStyle = getComputedStyle(document.documentElement);
  const probe = document.createElement('div');
  probe.setAttribute('data-appearance', 'light');
  probe.hidden = true;
  document.body.appendChild(probe);
  const lightStyle = getComputedStyle(probe);
  const dark = (name) => rootStyle.getPropertyValue(name).trim();
  const light = (name) => lightStyle.getPropertyValue(name).trim();

  // Roles: text (4.5:1 against the given surfaces), graphic (3:1), fill (white label 4.5:1), under-text (primary text on it 4.5:1), none.
  const GROUPS = {
    surfaces: [
      ['--surface-canvas', 'none', 'Editor and diff bodies'],
      ['--surface-panel', 'none', 'Tool windows'],
      ['--surface-chrome', 'none', 'Toolbar, stripes, status bar; vibrancy material where available'],
      ['--surface-elevated', 'none', 'Cards, popovers, sheets'],
      ['--surface-hover', 'none', 'Hovered rows'],
      ['--surface-selected', 'under-text', 'Selected rows'],
      ['--line-hairline', 'none', 'Decorative separators only'],
      ['--line-control', 'graphic', 'Input and control borders'],
      ['--focus-ring', 'graphic', 'Keyboard focus, 2 px']
    ],
    text: [
      ['--text-primary', 'text', 'Body text and titles'],
      ['--text-secondary', 'text', 'Supporting text'],
      ['--text-tertiary', 'text', 'Captions, metadata, line numbers'],
      ['--accent-text', 'text', 'Links and active states (the macOS accent replaces it when contrast allows)'],
      ['--accent-fill', 'fill', 'Primary buttons with a white label']
    ],
    status: [
      ['--success', 'text', 'Passed checks, added lines'],
      ['--warning', 'text', 'Needs you, risk, contested'],
      ['--danger', 'text', 'Failures, removed lines, interrupt'],
      ['--info', 'text', 'Informational states'],
      ['--actor-you', 'text', 'You: circle glyph, solid gutter bar'],
      ['--actor-ai', 'text', 'Agent: diamond glyph, notched gutter bar'],
      ['--actor-external', 'text', 'External: triangle glyph, hatched bar'],
      ['--actor-studio', 'text', 'Studio automation: square glyph, hollow bar'],
      ['--hue-violet', 'graphic', 'Agent session hue 1'],
      ['--hue-pink', 'graphic', 'Agent session hue 2'],
      ['--hue-cyan', 'graphic', 'Agent session hue 3'],
      ['--hue-lime', 'graphic', 'Agent session hue 4'],
      ['--hue-orange', 'graphic', 'Agent session hue 5']
    ],
    diff: [
      ['--diff-add-bg', 'under-text', 'Added lines (the + sign is always shown too)'],
      ['--diff-del-bg', 'under-text', 'Removed lines (the − sign is always shown too)'],
      ['--diff-ai-tint', 'under-text', 'Agent lines inside a mixed hunk'],
      ['--line-ai-tint', 'under-text', 'Agent lines in the editor, AI-only view'],
      ['--line-you-tint', 'under-text', 'Your lines in the editor, Mine view']
    ]
  };

  function ratioCell(value, min) {
    const ok = value >= min;
    return `<span class="ratio ${ok ? 'pass' : 'fail'}">${value.toFixed(1)} : 1 ${ok ? '✓' : '✕'}</span>`;
  }
  function ratios(name, role, get, surfaces, textToken) {
    const v = get(name);
    if (role === 'none') return '<span class="muted">—</span>';
    if (role === 'fill') return ratioCell(contrast('#FFFFFF', v), 4.5);
    if (role === 'under-text') return ratioCell(contrast(get(textToken), v), 4.5);
    const min = Math.min.apply(null, surfaces.map((s) => contrast(v, get(s))));
    return ratioCell(min, role === 'text' ? 4.5 : 3);
  }
  document.querySelectorAll('[data-token-table]').forEach((host) => {
    const rows = GROUPS[host.getAttribute('data-token-table')];
    const darkSurfaces = ['--surface-canvas', '--surface-panel', '--surface-elevated'];
    const lightSurfaces = ['--surface-canvas', '--surface-panel', '--surface-chrome'];
    host.innerHTML = `<table class="t"><thead><tr><th scope="col">Token</th><th scope="col">Dark</th><th scope="col">Contrast</th><th scope="col">Light</th><th scope="col">Contrast</th><th scope="col">Use</th></tr></thead><tbody>${rows.map(([name, role, use]) => {
      const d = dark(name);
      const l = light(name);
      return `<tr><td><code>${name}</code></td>
        <td class="nowrap"><span class="swatch" style="background:${d}"></span> <span class="hex">${d}</span></td>
        <td>${ratios(name, role, dark, darkSurfaces, '--text-primary')}</td>
        <td class="nowrap"><span class="swatch" style="background:${l}"></span> <span class="hex">${l}</span></td>
        <td>${ratios(name, role, light, lightSurfaces, '--text-primary')}</td>
        <td>${use}</td></tr>`;
    }).join('')}</tbody></table>`;
  });
  probe.remove();

  /* ---------------- Contents: highlight the section in view ---------------- */
  const links = Array.from(document.querySelectorAll('.toc a'));
  const byId = {};
  links.forEach((a) => { byId[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
      let best = null;
      document.querySelectorAll('.content > section[id]').forEach((s) => { if (!best && (seen.get(s.id) || 0) > 0) best = s.id; });
      if (best) links.forEach((a) => a.setAttribute('aria-current', String(a === byId[best])));
    }, { rootMargin: '-70px 0px -55% 0px', threshold: [0, 0.01] });
    document.querySelectorAll('.content > section[id]').forEach((s) => io.observe(s));
  }

  /* ---------------- Screen previews: scale the 1440 x 900 prototype into each card ---------------- */
  const fit = (frame) => frame.style.setProperty('--s', String(frame.clientWidth / 1440));
  const frames = document.querySelectorAll('.shot .frame');
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver((entries) => entries.forEach((e) => fit(e.target)));
    frames.forEach((f) => ro.observe(f));
  } else {
    frames.forEach(fit);
    window.addEventListener('resize', () => frames.forEach(fit));
  }

  /* ---------------- Demos ---------------- */
  document.querySelectorAll('[data-demo="seg"]').forEach((group) => {
    const out = group.parentElement.querySelector('[data-demo-out]');
    group.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (out && b.dataset.say) out.textContent = b.dataset.say;
    });
  });
  document.querySelectorAll('[data-demo="chip"]').forEach((btn) => {
    btn.addEventListener('click', () => { const chip = btn.closest('.chip'); if (chip) chip.remove(); });
  });
  document.querySelectorAll('[data-demo="hunk"]').forEach((hunk) => {
    hunk.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-say]');
      if (!b) return;
      const right = hunk.querySelector('.decide');
      right.innerHTML = `<span class="${b.dataset.say === 'Rejected' ? 'state-no' : 'state-ok'}">${b.dataset.say}</span>`;
    });
  });
})();
