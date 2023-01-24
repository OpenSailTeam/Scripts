window.dataLayer = window.dataLayer || [];

window.onload = main;

function main() {

    let forms = document.getElementsByTagName('form');

    for (let form of forms) {
        (function() {
            form.addEventListener('submit', (event) => {
                event.preventDefault(); // prevent page refresh
                let formData = new FormData(form);
                for (let p of formData) {
                    let pair = {};
                    pair[p[0]] = p[1];
                    window.dataLayer.push(pair);
                }
                let eventId = {};
                eventId["event_id"] = Date.now().toString();
                window.dataLayer.push(eventId);
            });
        }());
    }
}
