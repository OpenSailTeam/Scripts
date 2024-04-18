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

    // Read the current UTM parameters from the URL
    const urlUTMParams = getUTMParams(window.location);

    // Check if 'Lead' cookie exists and parse it
    const cookieValue = getCookie('Lead');
    const cookieUTMs = cookieValue ? JSON.parse(decodeURIComponent(cookieValue)).parameters : null;

    // Compare current UTM params with those stored in the cookie
    function areUTMsEqual(cookieUTMs, currentUTMs) {
        return my_utmParameters.every(param => cookieUTMs[param] === currentUTMs[param]);
    }

    // Function to create or update the lead cookie
    function updateLeadCookie() {
        if (cookieUTMs && areUTMsEqual(cookieUTMs, urlUTMParams)) {
            // Cookie exists and UTM parameters match, no action needed
        } else {
            // Either no cookie or UTM parameters do not match
            createLead(urlUTMParams); // Update or create new cookie with current UTM data
        }
    }

    // Create or update the cookie with new UTM data
    function createLead(utms) {
        const lead = { parameters: utms };
        setCookie('Lead', encodeURIComponent(JSON.stringify(lead)), 7);
    }

    // Invoke cookie update logic
    updateLeadCookie();

    // Set UTM form values
    function setUTMformValues(doc, utms) {
        my_utmParameters.forEach(param => {
            const utmValue = utms[param] || "";
            const selectors = `input[name*='${param}']`;
            doc.querySelectorAll(selectors).forEach(node => {
                node.value = utmValue;
            });
        });
    }

    // Apply UTM values to forms from the current URL parameters or the cookie if the URL parameters match the cookie
    setUTMformValues(document, cookieUTMs || urlUTMParams);

    // Additional code for handling form submissions omitted for brevity
});
