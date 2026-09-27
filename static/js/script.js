/**
 * Before/after image slider.
 *
 * The "before" image sits in a fixed-width inset inside a clipped wrapper, so
 * revealing it is a matter of changing the wrapper's width while the image
 * underneath stays put. The inset therefore has to track the container's width.
 *
 * A ResizeObserver keeps it in step. The previous version did this with
 * `window.onresize =`, an assignment rather than a listener, so each slider
 * clobbered the one before it and only the last on the page ever resized — and
 * it missed container changes that were not window resizes.
 */
class BeforeAfter {
    constructor(entryObject) {
        // Accepts either a selector string or the element itself. The sliders are
        // now discovered by class and handed straight in, and passing an element to
        // querySelector throws — which silently left every slider inert: rendered,
        // shadowed, but unresponsive to the pointer.
        const container = typeof entryObject.id === "string"
            ? document.querySelector(entryObject.id)
            : entryObject.id;
        if (!container) return;

        const before = container.querySelector('.bal-before');
        const inset = container.querySelector('.bal-before-inset');
        const afterText = container.querySelector('.bal-afterPosition');
        const handle = container.querySelector('.bal-handle');
        if (!before || !inset || !handle) return;

        const syncInset = () => {
            inset.style.width = container.offsetWidth + 'px';
        };

        if ('ResizeObserver' in window) {
            new ResizeObserver(syncInset).observe(container);
        } else {
            window.addEventListener('resize', syncInset);
        }
        syncInset();

        before.style.width = '50%';
        handle.style.left = '50%';
        if (afterText) afterText.style.zIndex = '1';

        // Clamp so the handle cannot be dragged off either end, which would
        // leave one image entirely hidden and the handle stranded at the edge.
        /* The rect is cached rather than read per event. `setPosition` reads geometry and
           then writes two styles, so reading it on every `mousemove` forced a layout
           flush per pointer event — and splatsure carries twelve of these sliders. The
           rect only changes when the layout does, so it is invalidated on resize and on
           re-entry instead. */
        let rect = null;
        const setPosition = (clientX) => {
            if (!rect) rect = container.getBoundingClientRect();
            if (!rect.width) { rect = null; return; }
            const pct = Math.max(0, Math.min(100,
                ((clientX - rect.left) / rect.width) * 100));
            before.style.width = pct + '%';
            handle.style.left = pct + '%';
        };

        // Touch: only claim the gesture when it starts near the handle, so a
        // vertical scroll that begins on the image still scrolls the page.
        let dragging = false;

        container.addEventListener('touchstart', (e) => {
            const rect = container.getBoundingClientRect();
            const handleX = rect.left + rect.width * (parseFloat(before.style.width) / 100);
            dragging = Math.abs(e.touches[0].clientX - handleX) < 44;
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!dragging) return;
            if (e.cancelable) e.preventDefault();
            setPosition(e.touches[0].clientX);
        }, { passive: false });

        container.addEventListener('touchend', () => { dragging = false; });

        // Mouse: follow the pointer directly, which is what makes these feel
        // immediate on desktop — no click needed.
        container.addEventListener('mouseenter', () => { rect = null; });
        container.addEventListener('mousemove', (e) => setPosition(e.clientX),
            { passive: true });
        window.addEventListener('resize', () => { rect = null; }, { passive: true });
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Every before/after slider on the page, found by class. These used to be
    // constructed by an inline <script> between two <section>s that listed ids by
    // hand — a list that had drifted out of sync with the markup, and that put
    // page-init code in the middle of the document flow. Discovering them by class
    // cannot drift.
    document.querySelectorAll('.bal-container-small')
        .forEach(function (el) { new BeforeAfter({ id: el }); });

    const copyBtn = document.getElementById('copy-btn');
    const bibtexContent = document.getElementById('bibtex-content');

    if (copyBtn && bibtexContent) {
        copyBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const text = bibtexContent.textContent;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () {
                    showNotification();
                }).catch(function (err) {
                    fallbackCopy(text);
                });
            } else {
                fallbackCopy(text);
            }
        });
    }

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            showNotification();
        } catch (err) {
            console.error('Fallback copy failed: ', err);
        }
        document.body.removeChild(textarea);
    }

    let copyTimeout;

    function showNotification() {
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';

        if (copyTimeout) clearTimeout(copyTimeout);

        copyTimeout = setTimeout(function () {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<i class="fa fa-copy"></i>';
        }, 2000);
    }
});
