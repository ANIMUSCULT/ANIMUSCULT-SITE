// ANIMUSCULT — background films (gallery, clothes, releases).
// OC_BGFILM(video, 'gallery') plays assets/video/gallery-bg.mp4 (the -lite file on small screens).
// iPhones in Low Power Mode, and links opened inside apps (Instagram, TikTok, Messages), block video:
// there a silent moving picture of the same film (NAME-bg-loop.webp) takes its place, and taps never
// start the video (that made it jump to full screen).
window.OC_BGFILM = (v, name) => {
  const small = Math.min(screen.width, screen.height) < 700 || (navigator.connection && navigator.connection.saveData);
  v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('webkit-playsinline', '');
  v.src = `assets/video/${name}-bg${small ? '-lite' : ''}.mp4`;
  let looped = false;
  const useLoop = () => {
    if (looped) return; looped = true;
    const img = new Image();
    img.alt = ''; img.setAttribute('aria-hidden', 'true');
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
    img.src = `assets/video/${name}-bg-loop.webp`;
    img.onload = () => { v.pause(); v.replaceWith(img); };
  };
  const kick = () => { if (!looped && v.paused) v.play().catch((e) => { if (e && e.name === 'NotAllowedError') useLoop(); }); };
  v.addEventListener('canplay', kick);
  setTimeout(() => { if (v.readyState >= 2 && (v.paused || v.currentTime < 0.1)) useLoop(); }, 4000);
  if (!matchMedia('(pointer: coarse)').matches) ['pointerdown', 'keydown', 'scroll'].forEach((e) => addEventListener(e, kick, { once: true, passive: true }));
  kick();
};
