(function(){
  // ===== Config =====
  var CANONICAL = {
    utm_source:   ['utm_source','source'],
    utm_campaign: ['utm_campaign','campaign','campaigm'],
    utm_medium:   ['utm_medium','medium'],
    gclid:        ['gclid'],
    fbclid:       ['fbclid']
  };
  var TTL_DAYS = 90;

  // ===== Cookie helpers =====
  function setCookie(name, val, days){
    if (!val) return;
    var d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    var expires = "expires=" + d.toUTCString();
    var secure = (location.protocol === 'https:') ? "; Secure" : "";
    document.cookie = name + "=" + encodeURIComponent(val) + ";" + expires + "; path=/; SameSite=Lax" + secure;
  }
  function getCookie(name){
    var m = document.cookie.match(new RegExp('(?:^|; )'+name.replace(/([.$?*|{}()\\[\\]\\\\/+^])/g,'\\$1')+'=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  // ===== Capture from URL → cookies =====
  function captureUTMs(){
    var qp = new URLSearchParams((window.location.search || '').toLowerCase());
    Object.keys(CANONICAL).forEach(function(key){
      var val = null;
      CANONICAL[key].some(function(alias){
        if (qp.has(alias) && qp.get(alias)) { val = (qp.get(alias) || '').slice(0,200); return true; }
        return false;
      });
      if (val !== null) {
        // last touch always refresh
        setCookie(key + "_last_touch", val, TTL_DAYS);
        // first touch only set if empty
        if (!getCookie(key + "_first_touch")) {
          setCookie(key + "_first_touch", val, TTL_DAYS);
        }
      }
    });
  }

  // ===== Populate form fields from cookies =====
  var LAST_PARAMS  = ['utm_source','utm_campaign','utm_medium','gclid','fbclid'];
  var FIRST_PARAMS = ['utm_source_first','utm_campaign_first','utm_medium_first','gclid_first','fbclid_first'];

  function valueForParam(param){
    // map *_first names to *_first_touch cookies; others to *_last_touch
    if (/_first$/.test(param)) {
      var base = param.replace(/_first$/,'');
      return getCookie(base + "_first_touch") || "";
    } else {
      return getCookie(param + "_last_touch") || "";
    }
  }

  function fillFieldsInForm(form){
    var allParams = LAST_PARAMS.concat(FIRST_PARAMS);
    allParams.forEach(function(param){
      var val = valueForParam(param);
      if (!val) return;
      // by name or id
      var el = form.querySelector('[name="'+param+'"], #' + CSS.escape(param) + '');
      if (el) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = val;
        } else if ('value' in el) {
          el.value = val;
        }
      }
    });
  }

  // Expose manual API if needed
  window.UTM = window.UTM || {};
  window.UTM.populate = fillFieldsInForm;

  // ===== Wire up =====
  document.addEventListener('DOMContentLoaded', function(){
    captureUTMs();

    // Fill once on load
    document.querySelectorAll('form').forEach(fillFieldsInForm);

    // Ensure fill right before submit (latest cookies)
    document.addEventListener('submit', function(e){
      var form = e.target;
      if (form && form.tagName === 'FORM') {
        fillFieldsInForm(form);
      }
    }, true);
  });
})();
