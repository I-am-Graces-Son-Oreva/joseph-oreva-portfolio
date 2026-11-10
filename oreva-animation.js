(() => {
  'use strict';
  const section = document.getElementById('oreva-film');
  const video = document.getElementById('oreva-animation');
  if (!section || !video) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;

  // Playback and looping are native video behavior. Only attach the source when
  // needed, and keep the static logo for reduced motion or unavailable playback.
  function updateSource() {
    if (motion.matches) {
      video.pause();
      if (video.getAttribute('src')) {
        video.removeAttribute('src');
        video.load();
      }
      section.classList.remove('is-playing');
    } else if (visible && !video.getAttribute('src')) {
      video.muted = true;
      video.src = video.dataset.src;
      video.load();
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
