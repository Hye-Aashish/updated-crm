(function (window, document) {
    'use strict';

    // Configuration - Logic to find API Base URL
    const getApiBase = () => {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            if (scripts[i].src && scripts[i].src.includes('tracker.js')) {
                const url = new URL(scripts[i].src);
                return url.origin;
            }
        }
        return 'http://localhost:5000'; // Fallback
    };

    const API_BASE = getApiBase();
    const ENDPOINTS = {
        INIT: `${API_BASE}/api/tracking/init`,
        EVENT: `${API_BASE}/api/tracking/event`,
        PULSE: `${API_BASE}/api/tracking/pulse`,
        IDENTIFY: `${API_BASE}/api/tracking/identify`
    };

    // State
    const STORAGE_KEY_VISITOR = 'crm_visitor_uid';
    let sessionId = null;
    let visitorId = localStorage.getItem(STORAGE_KEY_VISITOR);
    let isInitialized = false;
    let lastHeartbeat = Date.now();

    // --- Helpers ---
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const getUTMParams = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const utm = {};
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
            if (urlParams.has(param)) {
                utm[param] = urlParams.get(param);
            }
        });
        return utm;
    };

    // --- Core Functions ---
    const initTracker = async () => {
        if (isInitialized) return;

        if (!visitorId) {
            visitorId = generateUUID();
            localStorage.setItem(STORAGE_KEY_VISITOR, visitorId);
        }

        const payload = {
            visitor_unique_id: visitorId,
            referrer: document.referrer,
            url: window.location.href,
            utm_params: getUTMParams(),
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        try {
            const response = await fetch(ENDPOINTS.INIT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.session_id) {
                sessionId = data.session_id;
                isInitialized = true;
                startPulse();
                setupEventListeners();
                console.log('CRM Tracker Initalized:', sessionId);

                // Track automatic identify if email is in URL (for email campaigns)
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('email')) {
                    identifyVisitor(urlParams.get('email'));
                }
            }
        } catch (error) {
            console.error('CRM Tracker Init Failed:', error);
        }
    };

    const trackEvent = async (type, data = {}) => {
        if (!sessionId) return;
        try {
            await fetch(ENDPOINTS.EVENT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    type,
                    url: window.location.href,
                    data
                })
            });
        } catch (error) { }
    };

    const identifyVisitor = async (email, name = null) => {
        if (!sessionId || !email) return;
        try {
            await fetch(ENDPOINTS.IDENTIFY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    email,
                    name
                })
            });
            console.log('CRM Visitor Identified:', email);
        } catch (error) { }
    };

    // --- Heartbeat ---
    const startPulse = () => {
        const startTime = Date.now();
        setInterval(() => {
            const duration = Math.round((Date.now() - startTime) / 1000);
            fetch(ENDPOINTS.PULSE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, duration })
            }).catch(() => { });
        }, 30000); // Pulse every 30s (reduced from 10s)
    };

    // --- Event Listeners ---
    const setupEventListeners = () => {
        // 1. Clicks (Heatmap + Analytics) - Filtered to keep DB light
        document.addEventListener('click', (e) => {
            const interactive = e.target.closest('a, button, input[type="submit"], input[type="button"]');

            // Only track interactive clicks OR deep heatmap samples (throttled logic could go here)
            if (!interactive) return;

            const clickData = {
                x: e.pageX,
                y: e.pageY,
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight,
                selector: interactive.id ? `#${interactive.id}` : interactive.className ? `.${interactive.className.split(' ')[0]}` : interactive.tagName.toLowerCase(),
                element_id: interactive.id,
                element_text: (interactive.innerText || interactive.value || '').trim().slice(0, 50),
                href: interactive.href
            };

            trackEvent('click', clickData);
        }, true);

        // 2. Form Submissions (Automatic Identify)
        document.addEventListener('submit', (e) => {
            const formData = new FormData(e.target);
            let emailCaptured = null;
            let nameCaptured = null;

            for (let [key, value] of formData.entries()) {
                const k = key.toLowerCase();
                if (k.includes('email') && typeof value === 'string' && value.includes('@')) {
                    emailCaptured = value;
                }
                if (k.includes('name') && typeof value === 'string') {
                    nameCaptured = value;
                }
            }

            if (emailCaptured) {
                identifyVisitor(emailCaptured, nameCaptured);
            }

            trackEvent('form_submit', {
                form_id: e.target.id || 'unknown_form',
                has_email: !!emailCaptured
            });
        });
    };

    // Initialize
    if (document.readyState === 'complete') {
        initTracker();
    } else {
        window.addEventListener('load', initTracker);
    }

    // Export Global API
    window.CRMTracker = {
        track: trackEvent,
        identify: identifyVisitor
    };

})(window, document);
