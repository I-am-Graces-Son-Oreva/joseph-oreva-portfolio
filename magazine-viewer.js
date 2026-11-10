(() => {
  'use strict';
  const press = document.getElementById('press');
  const dialog = document.getElementById('magazine-viewer');
  if (!press || !dialog || typeof dialog.showModal !== 'function') return;

  const image = document.getElementById('magazine-viewer-image');
  const caption = document.getElementById('magazine-viewer-caption');
  const stage = document.getElementById('magazine-viewer-stage');
  const closeButton = document.getElementById('magazine-viewer-close');
  const zoomButton = document.getElementById('magazine-viewer-zoom');
  const previousButton = document.getElementById('magazine-viewer-previous');
  const nextButton = document.getElementById('magazine-viewer-next');
  const position = document.getElementById('magazine-viewer-position');
  // The spread also has a caption link; include each photograph only once.
  const links = Array.from(press.querySelectorAll('a[data-magazine-viewer]'));
  const photographs = links.filter((link, index) =>
    links.findIndex(candidate => candidate.href === link.href) === index);
  let currentIndex = 0;
  let opener;

  function resetZoom() {
    stage.classList.remove('is-zoomed');
    zoomButton.setAttribute('aria-pressed', 'false');
    zoomButton.textContent = 'Zoom in';
    stage.scrollTo(0, 0);
  }

  function showPhotograph(index) {
    currentIndex = (index + photographs.length) % photographs.length;
    const link = photographs[currentIndex];
    const figure = link.closest('figure');
    const thumbnail = figure.querySelector('img');
    const description = figure.querySelector('figcaption > span') || figure.querySelector('figcaption');
    image.src = link.href;
    image.alt = thumbnail.alt;
    caption.textContent = description.textContent.trim();
    position.textContent = `${currentIndex + 1} of ${photographs.length}`;
    resetZoom();
  }

  press.addEventListener('click', event => {
    const link = event.target.closest('a[data-magazine-viewer]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    opener = link;
    showPhotograph(photographs.findIndex(item => item.href === link.href));
    dialog.showModal();
    event.preventDefault();
    document.body.classList.add('magazine-viewer-open');
    closeButton.focus();
  });

  previousButton.addEventListener('click', () => showPhotograph(currentIndex - 1));
  nextButton.addEventListener('click', () => showPhotograph(currentIndex + 1));
  dialog.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhotograph(currentIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    dialog.close();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target === stage) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('magazine-viewer-open');
    resetZoom();
    if (opener) opener.focus({ preventScroll: true });
  });
  zoomButton.addEventListener('click', () => {
    const zoomed = stage.classList.toggle('is-zoomed');
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.textContent = zoomed ? 'Fit image' : 'Zoom in';
    stage.scrollTo(0, 0);
  });
})();
