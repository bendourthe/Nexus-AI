/* Offline presentation lifecycle for retained, independently authored views. */
(() => {
  'use strict';
  const page = document.querySelector('[data-dv-page]');
  const deck = document.querySelector('[data-dv-deck]');
  if (!page || !deck) return;
  const slides = Array.from(deck.querySelectorAll('[data-dv-slide]'));
  const controls = deck.querySelector('[data-dv-controls]');
  const count = deck.querySelector('[data-dv-count]');
  const picker = deck.querySelector('[data-dv-picker]');
  const statuses = document.querySelectorAll('[data-dv-status]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const signal = events.signal;
  let active = false, index = 0, generation = 0, origin = null;
  let scroll = 0, readingURL = location.href, oldOverflow = '';
  let wasFullscreen = false, keepFitted = false, touch = null;
  let fullscreenExitPending = null;
  let animations = [];
  let readingAnimations = [];
  const nativeInput = 'input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[data-dv-native],dialog[open]';
  const on = (target, event, callback, options = {}) =>
    target.addEventListener(event, callback, { ...options, signal });
  const announce = message => { statuses.forEach(status => { status.textContent = message; }); };
  const focusables = () => Array.from(deck.querySelectorAll('button,a[href],input,select,textarea,[tabindex]'))
    .filter(el => !el.disabled && el.tabIndex >= 0 && !el.closest('[hidden],[inert]') && el.getClientRects().length);

  function stopMotion() {
    animations.forEach(animation => animation.cancel());
    animations = [];
    slides.forEach(slide => slide.dispatchEvent(new CustomEvent('dv:deactivate')));
  }

  function play() {
    stopMotion();
    if (!active || document.hidden) return;
    const slide = slides[index];
    slide.dispatchEvent(new CustomEvent('dv:activate', { detail: { reducedMotion: motion.matches } }));
    if (motion.matches) return;
    slide.querySelectorAll('[data-dv-animate]').forEach(el => {
      const step = Math.max(0, Number(el.dataset.dvStep) || 0);
      const delay = el.dataset.dvAnimate === 'process' ? step * 130 : 0;
      const mark = el.hasAttribute('data-dv-mark');
      const frames = mark
        ? [{ clipPath: 'inset(0 100% 0 0)', opacity: 0 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }]
        : [{ opacity: 0 }, { opacity: 1 }];
      animations.push(el.animate(frames, { duration: 550, delay, fill: 'both', easing: 'ease-out' }));
    });
  }

  function fit() {
    if (controls) deck.style.setProperty('--dv-controls-height', `${controls.getBoundingClientRect().height}px`);
    const stage = deck.querySelector('.dv-stage');
    if (stage) {
      const compact = matchMedia('(max-width: 760px)').matches;
      stage.toggleAttribute('data-dv-native', compact);
      stage.tabIndex = compact ? 0 : -1;
      if (compact) stage.setAttribute('aria-label', 'Presentation content, scroll for more');
      else stage.removeAttribute('aria-label');
    }
  }

  function show(next, history = true) {
    if (!active || !Number.isInteger(next)) return;
    index = Math.max(0, Math.min(slides.length - 1, next));
    slides.forEach((slide, i) => {
      slide.hidden = i !== index;
      slide.inert = i !== index;
      slide.setAttribute('aria-hidden', String(i !== index));
    });
    deck.dataset.theme = slides[index].dataset.theme || 'light';
    count.textContent = `${index + 1} / ${slides.length}`;
    if (picker) picker.value = String(index);
    const previous = deck.querySelector('[data-dv-prev]');
    const nextButton = deck.querySelector('[data-dv-next]');
    if (previous) previous.disabled = index === 0;
    if (nextButton) nextButton.disabled = index === slides.length - 1;
    if (history && location.hash !== `#slide-${index + 1}`)
      window.history.pushState(null, '', `#slide-${index + 1}`);
    const heading = slides[index].querySelector('h1,h2,h3');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    play();
    fit();
  }

  async function fullscreen() {
    if (!deck.requestFullscreen || !active) return;
    const request = generation;
    try {
      if (fullscreenExitPending) await fullscreenExitPending;
      if (request !== generation || !active) return;
      await deck.requestFullscreen();
      if (request !== generation || !active) {
        if (document.fullscreenElement === deck && !active) await document.exitFullscreen();
        return;
      }
      wasFullscreen = document.fullscreenElement === deck;
      fit();
    } catch (_) {
      if (active) announce('Fullscreen unavailable. Presentation remains available in this window.');
    }
  }

  function open(next = 0, userGesture = false, history = true) {
    if (!Number.isInteger(next)) { announce('Invalid presentation target.'); return; }
    if (!active) {
      generation += 1;
      origin = document.activeElement;
      scroll = window.scrollY;
      readingURL = location.hash.startsWith('#slide-') ? location.href.split('#')[0] : location.href;
      oldOverflow = document.documentElement.style.overflow;
      active = true;
      deck.hidden = false;
      deck.inert = false;
      page.inert = true;
      page.setAttribute('aria-hidden', 'true');
      readingAnimations = page.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running');
      readingAnimations.forEach(animation => animation.pause());
      page.hidden = true;
      page.dispatchEvent(new CustomEvent('dv:deactivate'));
      document.documentElement.style.overflow = 'hidden';
    }
    show(next, history);
    if (userGesture) void fullscreen();
  }

  function close(history = true) {
    if (!active) return;
    generation += 1;
    const closingGeneration = generation;
    active = false;
    wasFullscreen = false;
    keepFitted = false;
    const fullscreenExit = fullscreenExitPending || (document.fullscreenElement === deck
      ? document.exitFullscreen().catch(() => {}) : null);
    fullscreenExitPending = fullscreenExit;
    stopMotion();
    deck.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    deck.hidden = true;
    deck.inert = true;
    page.inert = false;
    page.hidden = false;
    page.removeAttribute('aria-hidden');
    readingAnimations.forEach(animation => animation.play());
    readingAnimations = [];
    page.dispatchEvent(new CustomEvent('dv:activate', { detail: { reducedMotion: motion.matches } }));
    document.documentElement.style.overflow = oldOverflow;
    if (history) window.history.replaceState(null, '', readingURL);
    const restoreReading = () => {
      if (fullscreenExitPending === fullscreenExit) fullscreenExitPending = null;
      if (active) {
        if (!deck.contains(document.activeElement))
          slides[index].querySelector('h1,h2,h3')?.focus({ preventScroll: true });
        return;
      }
      if (generation !== closingGeneration) return;
      // Returning the reader to their place is a restoration, not a journey. A
      // page that sets scroll-behavior:smooth turns a plain scrollTo into an
      // animation, and the focus() below cancels it mid-flight, stranding the
      // reader partway down. 'instant' opts out of that page-level preference.
      window.scrollTo({ top: scroll, left: 0, behavior: 'instant' });
      if (origin && origin.isConnected) origin.focus({ preventScroll: true });
    };
    if (fullscreenExit) void fullscreenExit.then(restoreReading);
    else restoreReading();
  }

  function fromHash() {
    const match = /^#slide-([1-9]\d*)$/.exec(location.hash);
    if (match && Number(match[1]) <= slides.length) open(Number(match[1]) - 1, false, false);
    else {
      if (active) close(false);
      if (location.hash.startsWith('#slide-')) announce('Unknown slide. The reading page remains available.');
    }
  }

  if (!slides.length || !controls || !count) {
    announce('Presentation is unavailable: the retained storyboard is empty or incomplete.');
    return;
  }
  deck.setAttribute('role', 'dialog');
  deck.setAttribute('aria-modal', 'true');
  deck.setAttribute('aria-label', 'Presentation');
  deck.inert = true;
  slides.forEach((slide, i) => { if (!slide.id) slide.id = `slide-${i + 1}`; });
  document.documentElement.dataset.dvReady = 'true';
  if (picker) slides.forEach((slide, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `${i + 1}. ${slide.dataset.title || slide.querySelector('h1,h2,h3')?.textContent || 'Slide'}`;
    picker.append(option);
  });
  on(document, 'click', event => {
    const trigger = event.target.closest('[data-dv-open],[data-dv-chapter]');
    if (!trigger || trigger.closest('[inert]')) return;
    if (trigger.hasAttribute('data-dv-open')) open(0, true);
    else {
      const target = slides.findIndex(slide => slide.dataset.dvSlide === trigger.dataset.dvChapter);
      if (target >= 0) open(target, true);
      else announce('This chapter has no presentation target.');
    }
  });
  on(deck, 'click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-dv-exit')) close();
    if (button.hasAttribute('data-dv-next')) show(index + 1);
    if (button.hasAttribute('data-dv-prev')) show(index - 1);
    if (button.hasAttribute('data-dv-replay')) play();
    if (button.hasAttribute('data-dv-fullscreen')) {
      if (document.fullscreenElement === deck) {
        keepFitted = true;
        void document.exitFullscreen().catch(() => { keepFitted = false; });
      } else void fullscreen();
    }
  });
  if (picker) on(picker, 'change', () => show(Number(picker.value)));
  on(document, 'keydown', event => {
    if (!active || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const nested = deck.querySelector('dialog[open]');
    if (event.key === 'Escape') {
      event.preventDefault();
      if (nested && document.fullscreenElement !== deck) nested.close();
      else close();
      return;
    }
    if (nested) return;
    if (event.key === 'Tab') {
      const items = focusables();
      const current = items.indexOf(document.activeElement);
      if (items.length && (current < 0 || (event.shiftKey && current === 0) || (!event.shiftKey && current === items.length - 1))) {
        event.preventDefault();
        items[event.shiftKey ? items.length - 1 : 0].focus();
      }
      return;
    }
    if (event.target.closest(nativeInput)) return;
    const delta = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 }[event.key];
    if (delta) { event.preventDefault(); show(index + delta); }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); show(event.key === 'Home' ? 0 : slides.length - 1);
    }
  });
  on(deck, 'pointerdown', event => {
    touch = event.pointerType === 'touch' && !event.target.closest(nativeInput)
      ? { x: event.clientX, y: event.clientY, id: event.pointerId } : null;
  });
  on(deck, 'pointerup', event => {
    if (!touch || event.pointerId !== touch.id) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) show(index + (dx < 0 ? 1 : -1));
  });
  on(deck, 'pointercancel', () => { touch = null; });
  on(document, 'fullscreenchange', () => {
    if (fullscreenExitPending) { fit(); return; }
    if (document.fullscreenElement === deck) wasFullscreen = true;
    else if (wasFullscreen) {
      wasFullscreen = false;
      if (keepFitted) keepFitted = false;
      else close();
    }
    fit();
  });
  on(window, 'hashchange', fromHash);
  on(window, 'popstate', fromHash);
  on(window, 'resize', fit);
  on(document, 'visibilitychange', () => document.hidden ? stopMotion() : play());
  on(motion, 'change', play);
  const resize = new ResizeObserver(fit);
  resize.observe(controls);
  window.NexusDualView = Object.freeze({
    open: next => open(next), close, next: () => show(index + 1), previous: () => show(index - 1), replay: play,
    snapshot: () => ({ active, index, count: slides.length, animations: animations.length, fullscreen: document.fullscreenElement === deck }),
    destroy: () => { close(); events.abort(); resize.disconnect(); delete document.documentElement.dataset.dvReady; }
  });
  fromHash();
})();
