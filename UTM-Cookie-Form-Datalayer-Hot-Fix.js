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
        params.forEach((value, key) => {
            if (my_utmParameters.includes(key)) {
                utms[key] = value;
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

    // Function to delete a cookie
    function deleteCookie(name) {
        document.cookie = `${name}=; Max-Age=-99999999; path=/`;
    }

    // Check if 'Lead' cookie exists and parse it
    const cookieValue = getCookie('Lead');
    const cookieExist = cookieValue ? JSON.parse(decodeURIComponent(cookieValue)) : null;
    const utmParams = cookieExist ? cookieExist.parameters : getUTMParams(window.location);

    // Function to create or update the lead cookie
    function createLead(utms) {
        const lead = { parameters: utms };
        setCookie('Lead', encodeURIComponent(JSON.stringify(lead)), 7);
    }

    // Compare current UTM params with those stored in the cookie
    function areUTMsEqual(cookieUTMs, currentUTMs) {
        for (let param of my_utmParameters) {
            if (cookieUTMs[param] !== currentUTMs[param]) {
                return false;
            }
        }
        return true;
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

    // Logic to create or update cookies based on UTM presence and comparison
    if (!jQuery.isEmptyObject(utmParams) && cookieExist) {
        const cookieUTMs = cookieExist.parameters;
        if (!areUTMsEqual(cookieUTMs, utmParams)) {
            deleteCookie('Lead'); // Remove old cookie
            createLead(utmParams); // Create new cookie with new UTM data
        }
    } else if (!jQuery.isEmptyObject(utmParams) && !cookieExist) {
        createLead(utmParams); // Create new cookie if none exists
    }

    // Set UTM form values on main document and iframes
    setUTMformValues(document, utmParams);

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
