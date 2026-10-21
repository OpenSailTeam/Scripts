/**
 * UTM Lead Tracking Script
 *
 * Stores tracking parameters (UTMs, click IDs, external referrer) in the "Lead"
 * cookie and copies them into hidden form fields on every page.
 *
 * Setup: include this script. js-cookie is optional (used when present).
 * Forms get hidden inputs for every tracked parameter added automatically;
 * existing hidden inputs whose name contains the parameter are reused.
 *
 * Opt-outs:
 * - Whole site: <script src="...UTM-Cookie-Form-Datalayer.js" data-auto-fields="false"></script>
 * - Single form: <form data-lead-tracking="off">
 *
 * Check which version a page is running: window.LeadTracking.version
 */
(function() {
    'use strict';
    
    const VERSION = '2026.10.19';
    
    // Captured at execution time; document.currentScript is null inside event handlers
    const currentScript = document.currentScript;
    
    // Configuration constants
    const CONFIG = {
        UTM_PARAMETERS: ['gclid', 'gbraid', 'wbraid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign'],
        LEAD_PARAMETERS: ['gclid', 'gbraid', 'wbraid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'http_referer'],
        COOKIE_NAME: 'Lead',
        EMPTY_PARAM_VALUE: '',
        EMPTY_REFERER_VALUE: 'empty',
        HIDDEN_FIELD_SELECTORS: '.always-hidden, .form-field-hidden',
        JOTFORM_CLASS: 'jotform-form',
        AUTO_ADD_FIELDS: !(currentScript && currentScript.getAttribute('data-auto-fields') === 'false'),
        // Forms that never get hidden fields added: opted out, search, Webflow user accounts, Webflow ecommerce
        AUTO_ADD_EXCLUDE_SELECTOR: '[data-lead-tracking="off"], [role="search"], [data-wf-user-form-type], [data-node-type^="commerce"]'
    };
    
    // Utility functions for dependency checking
    function isDependencyAvailable(globalName) {
        return typeof window[globalName] !== 'undefined' && window[globalName] !== null;
    }
    
    function safeParseJSON(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('Failed to parse JSON:', error.message);
            return null;
        }
    }
    
    // URL parameter utilities
    function getUrlParameters() {
        try {
            return Object.fromEntries(new URLSearchParams(window.location.search));
        } catch (error) {
            console.warn('Failed to parse URL parameters:', error.message);
            return {};
        }
    }
    
    function hasTrackingParameters(urlParams) {
        // Only tracked parameters count; unrelated ones (?search=, pagination) must not reset attribution
        return CONFIG.UTM_PARAMETERS.some(param => Object.prototype.hasOwnProperty.call(urlParams, param));
    }
    
    // Cookie utilities - use js-cookie when the site loads it, otherwise document.cookie.
    // Both use path=/ and URI encoding, so cookies written by one are readable by the other.
    function getCookie(name) {
        if (isDependencyAvailable('Cookies')) {
            return Cookies.get(name);
        }
        const prefix = name + '=';
        const entry = document.cookie.split('; ').find(cookie => cookie.indexOf(prefix) === 0);
        if (!entry) {
            return undefined;
        }
        try {
            return decodeURIComponent(entry.slice(prefix.length));
        } catch (error) {
            console.warn('Failed to decode cookie:', error.message);
            return undefined;
        }
    }
    
    function setCookie(name, value, options = {}) {
        try {
            if (isDependencyAvailable('Cookies')) {
                Cookies.set(name, value, options);
            } else {
                document.cookie = name + '=' + encodeURIComponent(value) + '; path=/';
            }
            return true;
        } catch (error) {
            console.warn('Failed to set cookie:', error.message);
            return false;
        }
    }
    
    function removeCookie(name) {
        try {
            if (isDependencyAvailable('Cookies')) {
                Cookies.remove(name);
            } else {
                document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            }
            return true;
        } catch (error) {
            console.warn('Failed to remove cookie:', error.message);
            return false;
        }
    }
    
    // Referer handling utilities
    function getHttpReferer() {
        try {
            const referer = document.referrer;
            return referer || CONFIG.EMPTY_REFERER_VALUE;
        } catch (error) {
            console.warn('Failed to get document referrer:', error.message);
            return CONFIG.EMPTY_REFERER_VALUE;
        }
    }

    function isExternalReferer(refererUrl) {
        if (!refererUrl || refererUrl === CONFIG.EMPTY_REFERER_VALUE) {
            return false;
        }
        
        try {
            const refererDomain = new URL(refererUrl).hostname;
            const currentDomain = window.location.hostname;
            return refererDomain !== currentDomain;
        } catch (error) {
            // If we can't parse the URL, assume it's external to be safe
            return true;
        }
    }
    
    function shouldCaptureReferer(urlParams, existingLead) {
        // Capture referer when:
        // 1. No existing lead data (first visit)
        // 2. UTM parameters have changed (new campaign)
        
        if (!existingLead) {
            return true;
        }
        
        // Check if UTM parameters are different (indicating new campaign)
        for (const param of CONFIG.UTM_PARAMETERS) {
            const urlValue = urlParams[param];
            const existingValue = existingLead.parameters && existingLead.parameters[param];
            
            if (urlValue !== existingValue) {
                return true;
            }
        }
        
        return false;
    }
    
    // Lead data management
    function createLeadData(urlParams, shouldIncludeReferer = true, existingReferer = null) {
        const parameters = {};
        
        // Copy only URL parameters that are actually present and match our tracking parameters
        for (const param of CONFIG.UTM_PARAMETERS) {
            if (urlParams.hasOwnProperty(param) && urlParams[param] !== undefined) {
                parameters[param] = urlParams[param] || CONFIG.EMPTY_PARAM_VALUE;
            }
        }
        
        // Handle referer logic - only capture external referrers to preserve marketing attribution
        if (shouldIncludeReferer) {
            const currentReferer = getHttpReferer();
            if (isExternalReferer(currentReferer)) {
                // External referrer - capture it for marketing attribution
                parameters.http_referer = currentReferer;
            } else if (existingReferer) {
                // Internal navigation - preserve existing external referrer
                parameters.http_referer = existingReferer;
            } else {
                // No external referrer available
                parameters.http_referer = CONFIG.EMPTY_REFERER_VALUE;
            }
        } else if (existingReferer) {
            parameters.http_referer = existingReferer;
        } else {
            parameters.http_referer = CONFIG.EMPTY_REFERER_VALUE;
        }
        
        return { parameters: parameters };
    }
    
    function getExistingLeadData() {
        const cookieValue = getCookie(CONFIG.COOKIE_NAME);
        if (!cookieValue) {
            return null;
        }
        return safeParseJSON(cookieValue);
    }
    
    function saveLeadData(leadData) {
        return setCookie(CONFIG.COOKIE_NAME, JSON.stringify(leadData), {});
    }
    
    function compareUtmParameters(urlParams, cookieParams) {
        if (!cookieParams) {
            return false;
        }
        
        for (const param of CONFIG.UTM_PARAMETERS) {
            const urlValue = urlParams[param];
            const cookieValue = cookieParams[param];
            
            if (urlValue !== cookieValue) {
                return false;
            }
        }
        return true;
    }
    
    // Hidden field creation
    function isSearchForm(form) {
        if (form.querySelector('input[type="search"]')) {
            return true;
        }
        const identifiers = [form.id, form.getAttribute('name'), form.getAttribute('data-name'), form.getAttribute('action')];
        return identifiers.some(value => value && /search/i.test(value));
    }
    
    function shouldAddFieldsToForm(form) {
        return !form.closest(CONFIG.AUTO_ADD_EXCLUDE_SELECTOR) && !isSearchForm(form);
    }
    
    function addMissingTrackingFields(root) {
        if (!CONFIG.AUTO_ADD_FIELDS) {
            return;
        }
        
        const forms = root.tagName === 'FORM' ? [root] : Array.from(root.getElementsByTagName('form'));
        forms.forEach(form => {
            try {
                if (!shouldAddFieldsToForm(form)) {
                    return;
                }
                for (const param of CONFIG.LEAD_PARAMETERS) {
                    // Same matching as populateFormFields, so manually added fields are reused
                    if (form.querySelector(`input[name*='${param}']`)) {
                        continue;
                    }
                    const input = form.ownerDocument.createElement('input');
                    input.type = 'hidden';
                    input.name = param;
                    input.className = param;
                    form.appendChild(input);
                }
            } catch (error) {
                console.warn('Failed to add tracking fields:', error.message);
            }
        });
    }
    
    // Form field population
    function populateFormFields(doc, leadData) {
        if (!leadData || !leadData.parameters) {
            return;
        }
        
        addMissingTrackingFields(doc);
        
        for (const param of CONFIG.LEAD_PARAMETERS) {
            const value = leadData.parameters[param];
            const selector = `input[name*='${param}']`;
            
            try {
                const fields = doc.querySelectorAll(selector);
                fields.forEach(field => {
                    field.value = value || CONFIG.EMPTY_PARAM_VALUE;
                });
            } catch (error) {
                console.warn(`Failed to populate field ${param}:`, error.message);
            }
        }
    }
    
    // DataLayer utilities
    function pushToDataLayer(data) {
        if (typeof window.dataLayer !== 'undefined' && Array.isArray(window.dataLayer)) {
            window.dataLayer.push(data);
        }
    }
    
    function processFormData(formData) {
        const processedData = {};
        
        for (const [key, value] of formData) {
            // Handle JotForm field naming convention
            let processedKey = key;
            if (key.startsWith('q')) {
                const match = key.match(/^q\d+_(.*)$/);
                if (match) {
                    processedKey = match[1];
                }
            }
            processedData[processedKey] = value;
        }
        
        return processedData;
    }
    
    // Form submission handling
    function handleFormSubmission(form, forceSubmit = false) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Validate required fields (excluding hidden ones)
            const hasEmptyRequiredField = Array.from(form.elements).some(element => {
                if (element.closest(CONFIG.HIDDEN_FIELD_SELECTORS)) {
                    return false;
                }
                return element.required && !element.value.trim();
            });
            
            if (hasEmptyRequiredField) {
                return;
            }
            
            // Process and send form data to dataLayer
            try {
                const formData = new FormData(form);
                const processedData = processFormData(formData);
                
                // Push individual field data
                Object.entries(processedData).forEach(([key, value]) => {
                    pushToDataLayer({ [key]: value });
                });
                
                // Push event ID
                pushToDataLayer({ event_id: Date.now().toString() });
                
                if (forceSubmit) {
                    form.submit();
                }
            } catch (error) {
                console.warn('Failed to process form submission:', error.message);
            }
        });
    }
    
    // Document processing
    function processDocument(doc, forceSubmit = false) {
        try {
            const forms = doc.getElementsByTagName('form');
            Array.from(forms).forEach(form => {
                handleFormSubmission(form, forceSubmit);
            });
        } catch (error) {
            console.warn('Failed to process document forms:', error.message);
        }
    }
    
    function processJotForms(doc) {
        try {
            const jotforms = doc.getElementsByClassName(CONFIG.JOTFORM_CLASS);
            Array.from(jotforms).forEach(form => {
                handleFormSubmission(form, true);
            });
        } catch (error) {
            console.warn('Failed to process JotForms:', error.message);
        }
    }
    
    // Enhanced iframe handling with dynamic detection
    /**
     * IframeManager - Handles dynamic iframe detection and form population
     * 
     * BROWSER LIMITATIONS:
     * - Data URLs (data:text/html,<content>): Cannot be accessed due to security restrictions
     * - Cross-origin iframes: Require postMessage communication
     * - Sandboxed iframes: May have restricted access depending on sandbox attributes
     * - Blob URLs: Treated as cross-origin and may not be accessible
     * 
     * SUPPORTED SCENARIOS:
     * - Same-origin iframes (http/https from same domain)
     * - HTTP/HTTPS iframes with appropriate CORS headers
     * - PostMessage communication for cross-origin scenarios
     * 
     * For production use, ensure iframes are either:
     * 1. Same-origin (recommended)
     * 2. Include postMessage handling in iframe content for cross-origin scenarios
     */
    class IframeManager {
        constructor(leadData) {
            this.leadData = leadData;
            this.processedIframes = new WeakSet();
            this.populatedIframes = new WeakSet(); // Track iframes that have been populated
            this.observer = null;
            this.debounceTimer = null;
            this.initializeObserver();
        }

        initializeObserver() {
            // Check if MutationObserver is available
            if (typeof MutationObserver === 'undefined') {
                console.warn('MutationObserver not available, falling back to static iframe processing');
                this.processExistingIframes();
                return;
            }

            this.observer = new MutationObserver((mutations) => {
                // Debounce rapid mutations for performance
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.processMutations(mutations);
                }, 100);
            });

            // Start observing with optimized configuration
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Process existing iframes
            this.processExistingIframes();
        }

        processMutations(mutations) {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.processNewElement(node);
                    }
                });
            });
        }

        processNewElement(element) {
            // Check if element is an iframe
            if (element.tagName === 'IFRAME') {
                this.processIframe(element);
                return;
            }

            // Check for iframes within the element (avoid expensive querySelectorAll when possible)
            if (element.querySelector) {
                const iframes = element.querySelectorAll('iframe');
                iframes.forEach(iframe => this.processIframe(iframe));
            }
        }

        processExistingIframes() {
            const iframes = document.getElementsByTagName('iframe');
            Array.from(iframes).forEach(iframe => this.processIframe(iframe));
        }

        processIframe(iframe) {
            if (this.processedIframes.has(iframe)) {
                return; // Already processed
            }

            this.processedIframes.add(iframe);

            // Check iframe accessibility and readiness
            const readyStatus = this.isIframeReady(iframe);
            
            if (readyStatus === 'inaccessible') {
                this.attemptCrossOriginCommunication(iframe);
                return;
            }
            
            if (readyStatus === true) {
                this.populateAndAttachHandlers(iframe);
            } else {
                // Wait for iframe to load
                iframe.addEventListener('load', () => {
                    const newStatus = this.isIframeReady(iframe);
                    if (newStatus === true) {
                        this.populateAndAttachHandlers(iframe);
                    } else if (newStatus === 'inaccessible') {
                        this.attemptCrossOriginCommunication(iframe);
                    }
                });
                
                // Also check periodically in case load event was missed (max 50 attempts)
                let attempts = 0;
                const maxAttempts = 50;
                const checkReady = () => {
                    attempts++;
                    const status = this.isIframeReady(iframe);
                    
                    if (status === true) {
                        this.populateAndAttachHandlers(iframe);
                    } else if (status === 'inaccessible') {
                        this.attemptCrossOriginCommunication(iframe);
                    } else if (attempts < maxAttempts) {
                        // Check again in a short time
                        setTimeout(checkReady, 100);
                    }
                };
                
                // Start checking after a brief delay
                setTimeout(checkReady, 50);
            }
        }

        isIframeReady(iframe) {
            try {
                const doc = iframe.contentDocument;
                
                // Browser security limitation: data: URLs, cross-origin iframes, and sandboxed iframes
                // cannot be accessed via contentDocument/contentWindow
                if (!doc) {
                    const src = iframe.src || iframe.getAttribute('src') || '';
                    if (src.startsWith('data:') || src.startsWith('blob:') || iframe.hasAttribute('sandbox')) {
                        return 'inaccessible'; // Special status for inaccessible iframes
                    }
                    return false;
                }
                
                const ready = doc.readyState === 'complete' || doc.readyState === 'interactive';
                return ready;
            } catch (error) {
                return 'inaccessible'; // Cross-origin or security restricted iframe
            }
        }

        populateAndAttachHandlers(iframe) {
            // Prevent double-processing
            if (this.populatedIframes.has(iframe)) {
                return;
            }
            
            this.populatedIframes.add(iframe);
            
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                if (!doc) {
                    return;
                }

                // Populate form fields
                populateFormFields(doc, this.leadData);

                // Attach form submission handlers to regular forms
                try {
                    const forms = doc.getElementsByTagName('form');
                    Array.from(forms).forEach(form => {
                        handleFormSubmission(form, false);
                    });
                } catch (error) {
                    console.warn('Failed to process document forms:', error.message);
                }

                // Attach form submission handlers to JotForms
                try {
                    const jotforms = doc.getElementsByClassName(CONFIG.JOTFORM_CLASS);
                    Array.from(jotforms).forEach(form => {
                        handleFormSubmission(form, true);
                    });
                } catch (error) {
                    console.warn('Failed to process JotForms:', error.message);
                }

                // Recursively process nested iframes
                this.processNestedIframes(doc);

            } catch (error) {
                // Cross-origin iframe - attempt postMessage communication
                this.attemptCrossOriginCommunication(iframe);
            }
        }

        processNestedIframes(doc) {
            try {
                const nestedIframes = doc.getElementsByTagName('iframe');
                Array.from(nestedIframes).forEach(nested => {
                    this.processIframe(nested);
                });
            } catch (error) {
                console.warn('Failed to process nested iframes:', error.message);
            }
        }

        attemptCrossOriginCommunication(iframe) {
            if (!iframe.contentWindow) return;

            const message = {
                type: 'utm_populate',
                source: 'utm_tracker',
                data: this.leadData.parameters,
                timestamp: Date.now()
            };

            try {
                iframe.contentWindow.postMessage(message, '*');
            } catch (error) {
                // Silent failure for cross-origin communication
                // This is expected and normal behavior
            }
        }

        destroy() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }
        }
    }

    // Global iframe manager instance
    let globalIframeManager = null;

    // Enhanced iframe processing
    function processIframes(leadData) {
        // Destroy existing manager if present
        if (globalIframeManager) {
            globalIframeManager.destroy();
        }

        // Create new iframe manager
        globalIframeManager = new IframeManager(leadData);
    }

    // Listen for cross-origin iframe responses
    function setupCrossOriginMessageHandler() {
        window.addEventListener('message', function(event) {
            // Validate message origin and structure
            if (!event.data || typeof event.data !== 'object') {
                return;
            }

            switch (event.data.type) {
                case 'utm_form_submit':
                    handleCrossOriginFormSubmission(event.data);
                    break;
                case 'utm_ready':
                    handleCrossOriginIframeReady(event.data, event.source);
                    break;
            }
        });
    }

    function handleCrossOriginFormSubmission(data) {
        if (!data.formData || typeof data.formData !== 'object') {
            return;
        }

        try {
            // Process form data from cross-origin iframe
            Object.entries(data.formData).forEach(([key, value]) => {
                pushToDataLayer({ [key]: value });
            });
            
            pushToDataLayer({ 
                event_id: Date.now().toString(),
                source: 'cross_origin_iframe'
            });
        } catch (error) {
            console.warn('Failed to process cross-origin form submission:', error.message);
        }
    }

    function handleCrossOriginIframeReady(data, source) {
        if (!globalIframeManager || !globalIframeManager.leadData) {
            return;
        }

        const message = {
            type: 'utm_populate',
            source: 'utm_tracker',
            data: globalIframeManager.leadData.parameters,
            timestamp: Date.now()
        };

        try {
            source.postMessage(message, '*');
        } catch (error) {
            console.warn('Failed to respond to cross-origin iframe ready:', error.message);
        }
    }
    
    // Main logic orchestration
    function determineLeadAction(urlParams, existingLead) {
        const hasUrlParams = hasTrackingParameters(urlParams);
        const hasExistingLead = existingLead !== null;
        
        if (!hasUrlParams && !hasExistingLead) {
            // First-time visitor without UTM parameters - still capture referer for attribution backup
            return { action: 'create', data: createLeadData({}, true) };
        }
        
        if (hasUrlParams && !hasExistingLead) {
            // New visitor with UTM parameters - capture referer
            return { action: 'create', data: createLeadData(urlParams, true) };
        }
        
        if (hasUrlParams && hasExistingLead) {
            const paramsMatch = compareUtmParameters(urlParams, existingLead.parameters);
            if (!paramsMatch) {
                // UTM parameters changed - capture new referer (pass existing as fallback)
                const existingReferer = existingLead.parameters && existingLead.parameters.http_referer;
                return { action: 'replace', data: createLeadData(urlParams, true, existingReferer) };
            } else {
                // UTM parameters same - preserve existing referrer unless current is external
                const existingReferer = existingLead.parameters && existingLead.parameters.http_referer;
                const updatedData = createLeadData(urlParams, true, existingReferer);
                return { action: 'replace', data: updatedData };
            }
        }
        
        if (!hasUrlParams && hasExistingLead) {
            // No UTM params but existing lead - preserve UTM data and existing referrer unless current is external
            const existingUtmParams = {};
            for (const param of CONFIG.UTM_PARAMETERS) {
                if (existingLead.parameters && existingLead.parameters.hasOwnProperty(param)) {
                    existingUtmParams[param] = existingLead.parameters[param];
                }
            }
            const existingReferer = existingLead.parameters && existingLead.parameters.http_referer;
            const updatedData = createLeadData(existingUtmParams, true, existingReferer);
            return { action: 'replace', data: updatedData };
        }
        
        return { action: 'none' };
    }
    
    // Lead data for the current page, used to refresh fields at submit time
    let currentLeadData = null;
    
    function setupSubmitRefresh() {
        // Capture phase runs before form-level handlers (Webflow, dataLayer push), so forms
        // added after page load still get fields, and values overwritten by other scripts are restored
        document.addEventListener('submit', function(event) {
            const form = event.target;
            if (!currentLeadData || !form || form.tagName !== 'FORM') {
                return;
            }
            populateFormFields(form, currentLeadData);
        }, true);
    }
    
    function executeLeadAction(action) {
        switch (action.action) {
            case 'create':
            case 'replace':
                if (action.action === 'replace') {
                    removeCookie(CONFIG.COOKIE_NAME);
                }
                saveLeadData(action.data);
                currentLeadData = action.data;
                populateFormFields(document, action.data);
                processIframes(action.data);
                break;
                
            case 'use_existing':
                currentLeadData = action.data;
                populateFormFields(document, action.data);
                processIframes(action.data);
                break;
                
            case 'none':
            default:
                // No action needed
                break;
        }
    }
    
    // Main initialization function
    function initializeLeadTracking() {
        try {
            // Set up cross-origin message handling
            setupCrossOriginMessageHandler();
            setupSubmitRefresh();
            
            // Get current state
            const urlParams = getUrlParameters();
            const existingLead = getExistingLeadData();
            
            // Determine and execute action
            const action = determineLeadAction(urlParams, existingLead);
            executeLeadAction(action);
            
            // Set up form handling for main document
            processDocument(document, false);
            
        } catch (error) {
            console.error('Failed to initialize lead tracking:', error.message);
        }
    }
    
    window.LeadTracking = {
        version: VERSION,
        getLeadData: getExistingLeadData
    };
    
    // Initialize when the page has loaded (immediately if the script was injected after load)
    if (document.readyState === 'complete') {
        initializeLeadTracking();
    } else {
        window.addEventListener('load', initializeLeadTracking);
    }
})();
