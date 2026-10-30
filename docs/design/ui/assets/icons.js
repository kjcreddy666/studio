/* Studio icon set: 16 px stroke icons, drawn for this design (no external icon library). */
(function () {
  'use strict';

  const P = {
    folder: '<path d="M2 4.5h4l1.5 1.5H14v6.5H2z"/>',
    structure: '<path d="M2.5 3.5h11M5 8h8.5M7.5 12.5h6"/>',
    branch: '<circle cx="4.5" cy="3.5" r="1.5"/><circle cx="4.5" cy="12.5" r="1.5"/><circle cx="11.5" cy="5" r="1.5"/><path d="M4.5 5v6M11.5 6.5c0 3-7 2-7 4.5"/>',
    agent: '<path d="M8 2l5 6-5 6-5-6z"/>',
    book: '<path d="M2.5 3.5H7c.4 0 .8.2 1 .5.2-.3.6-.5 1-.5h4.5v9H9c-.6 0-1 .4-1 1 0-.6-.4-1-1-1H2.5zM8 4v9.5"/>',
    terminal: '<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M4.5 6.5l2 1.5-2 1.5M8 10h3.5"/>',
    play: '<path d="M5 3.5v9l7-4.5z" fill="currentColor" stroke="none"/>',
    stop: '<rect x="3.5" y="3.5" width="9" height="9" rx="1.5" fill="currentColor" stroke="none"/>',
    rerun: '<path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3"/>',
    problems: '<path d="M8 2.5l6 10.5H2z"/><path d="M8 6.5v3M8 11.3v.2"/>',
    console: '<path d="M2.5 3.5h11v7.5H7l-3 2.5V11H2.5z"/>',
    changes: '<path d="M5 2.5v6M2 5.5h6M9.5 10.5h4.5M2.5 13.5h11"/>',
    inbox: '<path d="M2 9l2-5.5h8L14 9v3.5H2zM2 9h3.5l1 1.5h3l1-1.5H14"/>',
    notes: '<path d="M3.5 2.5h6l3 3v8h-9zM9.5 2.5v3h3"/>',
    preview: '<path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>',
    search: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>',
    sparkle: '<path d="M8 2.5l1.4 4.1L13.5 8l-4.1 1.4L8 13.5l-1.4-4.1L2.5 8l4.1-1.4z"/>',
    tray: '<path d="M2.5 9l1.8-5.5h7.4L13.5 9v3.5h-11zM2.5 9h3l1 1.5h3l1-1.5h3"/>',
    chevronDown: '<path d="M5 6l3 3 3-3"/>',
    chevronLeft: '<path d="M10 3L5 8l5 5"/>',
    chevronRight: '<path d="M6 3l5 5-5 5"/>',
    close: '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>',
    check: '<path d="M3 8.5l3 3 7-7"/>',
    more: '<circle cx="3.5" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1" fill="currentColor" stroke="none"/>',
    gear: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v1.8M8 12.4v1.8M1.8 8h1.8M12.4 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M3.6 12.4l1.3-1.3M11.1 4.9l1.3-1.3"/>',
    code: '<path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5"/>',
    keyboard: '<rect x="1.5" y="4" width="13" height="8" rx="1.5"/><path d="M4 6.5h.01M6.5 6.5h.01M9 6.5h.01M11.5 6.5h.01M4.5 9.5h7"/>',
    bell: '<path d="M4 11V7.5a4 4 0 1 1 8 0V11l1 1.5H3zM6.5 13.5a1.5 1.5 0 0 0 3 0"/>',
    lock: '<rect x="3" y="7" width="10" height="6.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>',
    plus: '<path d="M8 3v10M3 8h10"/>',
    external: '<path d="M9 2.5h4.5V7M13.5 2.5L7.5 8.5M12 9.5v4H2.5V4h4"/>',
    pause: '<path d="M5.5 3.5v9M10.5 3.5v9"/>',
    undo: '<path d="M5 6.5H10a3 3 0 0 1 0 6H6M5 6.5L7.5 4M5 6.5L7.5 9"/>',
    window: '<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 6h12"/>'
  };

  function svg(name, cls) {
    const body = P[name] || P.more;
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /* Replace <i data-icon="name" data-size="sm|md"></i> placeholders in static markup. */
  function hydrate(root) {
    (root || document).querySelectorAll('i[data-icon]').forEach(function (el) {
      el.outerHTML = svg(el.getAttribute('data-icon'), el.getAttribute('data-size') || '');
    });
  }

  window.StudioIcons = { svg: svg, hydrate: hydrate, names: Object.keys(P) };
})();
