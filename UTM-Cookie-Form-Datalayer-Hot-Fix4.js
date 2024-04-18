window.addEventListener("load", (event) => {
    const my_utmParameters = [
        "gclid",
        "fbclid",
        "utm_source",
        "utm_medium",
        "utm_campaign"
    ];

    // Function to extract UTM parameters from the URL
    function getUTMParams(url) {
        const params = new URLSearchParams(url.search);
        const utms = {};
        my_utmParameters.forEach(key => {
            if (params.has(key)) {
                utms[key] = params.get(key);
            }
        });
        return utms;
    }

    // Function to get a cookie by name
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // Function to set a cookie
    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`;
    }

    // Read the current UTM parameters from the URL
    const urlUTMParams = getUTMParams(window.location);

    // Check if 'Lead' cookie exists and parse it
    const cookieValue = getCookie('Lead');
    const cookieExist = cookieValue ? JSON.parse(decodeURIComponent(cookieValue)) : null;
    const cookieUTMs = cookieExist ? cookieExist.parameters : {};

    // Compare current UTM params with those stored in the cookie
    function shouldUpdateCookie(cookieUTMs, currentUTMs) {
        return Object.keys(currentUTMs).length > 0 && !my_utmParameters.every(param => cookieUTMs[param] === currentUTMs[param]);
    }

    // Update or create cookie with new UTM data if appropriate
    if (shouldUpdateCookie(cookieUTMs, urlUTMParams)) {
        const lead = { parameters: {...cookieUTMs, ...urlUTMParams} };
        setCookie('Lead', encodeURIComponent(JSON.stringify(lead)), 7);
    }

    // Set or update form UTM values
    function setUTMformValues(doc, utms) {
        my_utmParameters.forEach(param => {
            const utmValue = utms[param] || "";
            const selectors = `input[name*='${param}']`;
            doc.querySelectorAll(selectors).forEach(node => {
                node.value = utmValue;
            });
        });
    }

    // Set UTM form values using the most recent UTM data
    setUTMformValues(document, cookieUTMs);

    function populateData(forms, forceSubmit) {
        for (let form of forms) {
            form.addEventListener('submit', (event) => {
                event.preventDefault(); // prevent page refresh

                let hasEmptyRequiredField = false;
                for (let element of form.elements) {
                    if (element.closest('.always-hidden, .form-field-hidden')) {
                        continue; // Skip this element
                    }

                    if (element.required && !element.value.trim()) {
                        hasEmptyRequiredField = true;
                        break;
                    }
                }

                if (hasEmptyRequiredField) {
                    return;
                }

                let formData = new FormData(form);
                for (let p of formData) {
                    let pair = {};
                    let key = p[0];
                    let value = p[1];
                    if (key.startsWith('q')) {
                        const regex = /^q\d+_(.*)$/;
                        const match = key.match(regex);
                        if (match) {
                            key = match[1];
                        }
                    }
                    pair[key] = value;
                    window.dataLayer.push(pair);
                }

                let eventId = {};
                eventId["event_id"] = Date.now().toString();
                window.dataLayer.push(eventId);

                if (forceSubmit) {
                    form.submit();
                }
            });
        }
    }

    var regularForms = document.getElementsByTagName('form');
    populateData(regularForms, false);
    
});
