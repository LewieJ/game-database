/**
 * Feedback Modal — self-contained module
 * Injects modal HTML into the page and wires up all event handlers.
 * Requires: #feedbackNavBtn button in the navbar, feedback CSS in style.css
 */
(function () {
    'use strict';

    var openBtn = document.getElementById('feedbackNavBtn');
    if (!openBtn) return; // no trigger button on this page

    /* ── Inject modal HTML ─────────────────────────────────────── */
    var wrapper = document.createElement('div');
    wrapper.innerHTML =
        '<div class="feedback-overlay" id="feedbackOverlay">' +
            '<div class="feedback-modal">' +
                '<div class="feedback-header">' +
                    '<div class="feedback-header-left">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="var(--neon)" stroke-width="2" width="20" height="20">' +
                            '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
                        '</svg>' +
                        '<h2>Send Feedback</h2>' +
                    '</div>' +
                    '<button class="feedback-close" id="feedbackClose" title="Close">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">' +
                            '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
                        '</svg>' +
                    '</button>' +
                '</div>' +
                '<p class="feedback-description">Help us improve MarathonDB. Bug reports, feature ideas, content requests — we read everything.</p>' +
                '<form id="feedbackForm" autocomplete="off">' +
                    '<div class="feedback-field">' +
                        '<label for="feedbackTitle">Subject <span class="feedback-required">*</span></label>' +
                        '<input type="text" id="feedbackTitle" maxlength="200" placeholder="What\'s this about?" required>' +
                        '<span class="feedback-char-count"><span id="titleCharCount">0</span>/200</span>' +
                    '</div>' +
                    '<div class="feedback-field">' +
                        '<label for="feedbackBody">Message <span class="feedback-required">*</span></label>' +
                        '<textarea id="feedbackBody" maxlength="5000" rows="5" placeholder="Tell us what you think…" required></textarea>' +
                        '<span class="feedback-char-count"><span id="bodyCharCount">0</span>/5,000</span>' +
                    '</div>' +
                    '<div class="feedback-field">' +
                        '<label for="feedbackEmail">Email <span class="feedback-optional">(optional — only if you\'d like a reply)</span></label>' +
                        '<input type="email" id="feedbackEmail" maxlength="320" placeholder="you@example.com">' +
                    '</div>' +
                    '<div class="feedback-error" id="feedbackError"></div>' +
                    '<div class="feedback-success" id="feedbackSuccess"></div>' +
                    '<div class="feedback-footer">' +
                        '<span class="feedback-counter" id="feedbackCounter"></span>' +
                        '<button type="submit" class="feedback-submit" id="feedbackSubmit">' +
                            'Send Feedback ' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">' +
                                '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' +
                            '</svg>' +
                        '</button>' +
                    '</div>' +
                '</form>' +
            '</div>' +
        '</div>';

    document.body.appendChild(wrapper.firstChild);

    /* ── Cache DOM refs ────────────────────────────────────────── */
    var overlay   = document.getElementById('feedbackOverlay');
    var closeBtn  = document.getElementById('feedbackClose');
    var form      = document.getElementById('feedbackForm');
    var titleIn   = document.getElementById('feedbackTitle');
    var bodyIn    = document.getElementById('feedbackBody');
    var emailIn   = document.getElementById('feedbackEmail');
    var errorEl   = document.getElementById('feedbackError');
    var successEl = document.getElementById('feedbackSuccess');
    var submitBtn = document.getElementById('feedbackSubmit');
    var titleCC   = document.getElementById('titleCharCount');
    var bodyCC    = document.getElementById('bodyCharCount');
    var counterEl = document.getElementById('feedbackCounter');

    var SEND_SVG  = 'Send Feedback <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">' +
                    '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

    /* ── Community counter ─────────────────────────────────────── */
    (function loadCount() {
        fetch('https://helpbot.marathondb.gg/api/feedback/count')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success && counterEl) {
                    counterEl.textContent = d.data.total_feedback.toLocaleString() + ' messages sent by the community';
                }
            })
            .catch(function () {});
    })();

    /* ── Open / Close ──────────────────────────────────────────── */
    function openModal()  {
        // Close any open nav dropdowns before opening the modal
        document.querySelectorAll('.nav-dropdown.active').forEach(function (d) { d.classList.remove('active'); });
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeModal() { overlay.classList.remove('active'); document.body.style.overflow = ''; }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
    });

    /* ── Character counters ────────────────────────────────────── */
    titleIn.addEventListener('input', function () { titleCC.textContent = titleIn.value.length; });
    bodyIn.addEventListener('input',  function () { bodyCC.textContent  = bodyIn.value.length; });

    /* ── Validation ────────────────────────────────────────────── */
    function validate(title, body, email) {
        if (!title.trim()) return 'Please enter a subject';
        if (title.trim().length > 200) return 'Subject is too long (200 char max)';
        if (!body.trim()) return 'Please enter a message';
        if (body.trim().length > 5000) return 'Message is too long (5,000 char max)';
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email';
        return null;
    }

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
        successEl.style.display = 'none';
    }

    function showSuccess(msg) {
        successEl.textContent = msg;
        successEl.style.display = 'block';
        errorEl.style.display = 'none';
    }

    /* ── Submit ─────────────────────────────────────────────────── */
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var title = titleIn.value;
        var body  = bodyIn.value;
        var email = emailIn.value;

        var err = validate(title, body, email);
        if (err) { showError(err); return; }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        fetch('https://helpbot.marathondb.gg/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title.trim(),
                body: body.trim(),
                email: email.trim() || undefined
            })
        })
        .then(function (res) {
            return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (result) {
            if (!result.ok) {
                showError(result.data.error || result.data.message || 'Something went wrong');
                submitBtn.disabled = false;
                submitBtn.innerHTML = SEND_SVG;
                return;
            }

            showSuccess('Thanks for your feedback! We appreciate you helping us improve.');
            titleIn.value = ''; bodyIn.value = ''; emailIn.value = '';
            titleCC.textContent = '0'; bodyCC.textContent = '0';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sent ✓';
            setTimeout(function () {
                submitBtn.disabled = false;
                submitBtn.innerHTML = SEND_SVG;
            }, 3000);
        })
        .catch(function () {
            showError('Failed to send feedback. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = SEND_SVG;
        });
    });
})();
