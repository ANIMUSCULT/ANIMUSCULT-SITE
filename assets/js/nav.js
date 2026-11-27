// ANIMUSCULT — the top bar. One bar for every page, always on screen, so you can leave any page in one tap.
// Load it right after <body>. Pages can use var(--nav-h) to keep things clear of it.
(() => {
  const LINKS = [
    ['home.html', 'HOME'], ['machine.html', 'PLAYER'], ['videos.html', 'VIDEOS'],
    ['gallery.html', 'GALLERY'], ['releases.html', 'RELEASES'], ['clothes.html', 'CLOTHES'],
  ];
  const here = location.pathname.split('/').pop() || 'home.html';

  const css = document.createElement('style');
  css.textContent = `
    :root { --nav-h: 56px; }
    .oc-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 60; height: var(--nav-h); display: flex; align-items: center; justify-content: space-between; gap: 20px;
      padding: 0 26px; padding-top: env(safe-area-inset-top); box-sizing: content-box;
      font-family: "VT323", ui-monospace, monospace; font-size: 21px; letter-spacing: .08em; color: #ebe5d9;
      background: rgba(6,2,2,.9); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255,42,31,.28); box-shadow: 0 1px 18px rgba(255,30,20,.12); }
    .oc-nav .mark { font-family: "Cormorant Garamond", serif; font-weight: 600; font-size: 20px; letter-spacing: .22em; text-decoration: none; color: #ebe5d9; white-space: nowrap; }
    .oc-nav nav { display: flex; gap: 22px; overflow-x: auto; scrollbar-width: none; }
    .oc-nav nav::-webkit-scrollbar { display: none; }
    .oc-nav nav a { text-decoration: none; color: rgba(235,229,217,.62); white-space: nowrap; padding: 10px 0; }
    .oc-nav nav a:hover { color: #ebe5d9; }
    .oc-nav nav a[aria-current] { color: #ff6b55; text-shadow: 0 0 8px rgba(255,42,31,.8); }
    .oc-nav nav a[aria-current]::before { content: "▶ "; }
    .oc-nav a:focus-visible { outline: 1px solid #ff2a1f; outline-offset: 4px; }
    @media (max-width: 860px) {
      :root { --nav-h: 48px; }
      .oc-nav { padding-left: 12px; padding-right: 12px; font-size: clamp(15px, 4.2vw, 19px); letter-spacing: .04em; }
      .oc-nav .mark { display: none; }
      .oc-nav nav { gap: clamp(6px, 2.4vw, 16px); width: 100%; justify-content: space-between; }
      .oc-nav nav a[aria-current]::before { content: "▶"; margin-right: 2px; }
    }`;
  document.head.appendChild(css);

  const bar = document.createElement('header');
  bar.className = 'oc-nav';
  const mark = document.createElement('a');
  mark.className = 'mark'; mark.href = 'home.html'; mark.dataset.channel = ''; mark.textContent = 'ANIMUSCULT';
  const nav = document.createElement('nav'); nav.setAttribute('aria-label', 'Pages');
  for (const [href, label] of LINKS) {
    const a = document.createElement('a'); a.href = href; a.textContent = label;
    if (href === here) a.setAttribute('aria-current', 'page'); else a.dataset.channel = '';
    nav.appendChild(a);
  }
  bar.append(mark, nav);
  document.body.prepend(bar);
  // on phones, keep the current page's link in view
  const cur = nav.querySelector('[aria-current]');
  if (cur) requestAnimationFrame(() => { nav.scrollLeft = cur.offsetLeft - nav.clientWidth / 2 + cur.offsetWidth / 2; });
})();
