(() => {
  'use strict';
  const section = document.getElementById('oreva-film');
  const video = document.getElementById('oreva-animation');
  if (!section || !video) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let playbackAttempt = 0;

  function configureVideo() {
    video.autoplay = true;
    video.defaultMuted = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = false;
  }
  configureVideo();

  // Keep native looping, but explicitly request playback once per source load.
  // A blocked request leaves the static logo; no timers or readiness-event retries.
  function updateSource() {
    if (motion.matches) {
      playbackAttempt++;
      video.pause();
      if (video.getAttribute('src')) {
        video.removeAttribute('src');
        video.load();
      }
      section.classList.remove('is-playing');
    } else if (visible && !video.getAttribute('src')) {
      configureVideo();
      const attempt = ++playbackAttempt;
      video.src = video.dataset.src;
      video.load();
      const fallback = () => {
        if (attempt === playbackAttempt) section.classList.remove('is-playing');
      };
      try {
        const playback = video.play();
        if (playback && typeof playback.catch === 'function') playback.catch(fallback);
      } catch {
        fallback();
      }
    }
  }

  video.addEventListener('playing', () => {
    if (motion.matches) { updateSource(); return; }
    section.classList.add('is-playing');
  });
  video.addEventListener('error', () => section.classList.remove('is-playing'));
  motion.addEventListener('change', updateSource);

  if ('IntersectionObserver' in window) {
    const observer = new window.IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        visible = true;
        updateSource();
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(section);
  } else {
    visible = true;
    updateSource();
  }
})();
