window.addEventListener("load", (event) => {
  
    const my_utmParameters = [
      "gclid",
      "fbclid",
      "utm_source",
      "utm_medium",
      "utm_campaign"
    ];

    const iframes = document.getElementsByTagName("iframe");

    function getAllUrlParams(url) {
      let obj = Object.fromEntries(new URLSearchParams(location.search));
      return obj;
    }
    /* Check if Lead Cookie already exist */
    var cookieExist = Cookies.get('Lead'); // => if false return undefined
    /* get URL params object */
    var getAllUrlParams = getAllUrlParams(); // return object
    /*Convert a JavaScript object into a string */
    var getAllUrlParamsJSON = JSON.stringify(getAllUrlParams);
    /* Check if the url with utm_parameters */
    let isEmpty = jQuery.isEmptyObject(getAllUrlParams); // return true/false

    /* Case 1 - if the page with parameters & no cookie exists */
    if (!isEmpty && cookieExist === undefined) {
      /* Set lead object for the cookies */
      //console.log("Case 1 - parameters & no cookie exists => Create Cookie");
      /* 
                  ## Set Cookies ##
                  expires: If omitted, the cookie becomes a session cookie (This example)
                  */
      createLead();
      setUTMformValues(document);
      for (let iframe of iframes) {
        var innerDoc = iframe.contentDocument || iframe.contentWindow.document;
        setUTMformValues(innerDoc);
      }
    } /*end if*/

    let compare = is_this_utm_equal_to_cookie_utm_values();

    if (!isEmpty && cookieExist !== undefined) {
      /* it this utm params diff from current lead values create new lead*/
      if (!compare) {
        /* Case 3 - cookie already exists but with diff values Vs url utm params
                      (remove current Lead and generate new one) 
                      */
        //console.log("Case 3 - lead Exist, but with diff params");
        Cookies.remove('Lead');
        createLead();
        setUTMformValues(document);
        for (let iframe of iframes) {
          var innerDoc = iframe.contentDocument || iframe.contentWindow.document;
          setUTMformValues(innerDoc);
        }
      } else {
        //console.log("Case 2 - lead exist with these params");
        setUTMformValues(document);
        for (let iframe of iframes) {
          var innerDoc = iframe.contentDocument || iframe.contentWindow.document;
          setUTMformValues(innerDoc);
        }
      }
    }

    /* Case 4 - cookie Exist  but page without any utm param */
    if (isEmpty && cookieExist !== undefined) {
      //console.log("Case 4 - cookie Exist  but page without any utm param");
      setUTMformValues(document);
      for (let iframe of iframes) {
        var innerDoc = iframe.contentDocument || iframe.contentWindow.document;
        setUTMformValues(innerDoc);
      }
    }

    function createLead() {
      var lead = {
        parameters: getAllUrlParams
      };
      /* if you want to add 2 days expires for example: 
         Cookies.set('Lead', 'lead', { expires: 2}) 
         */
      Cookies.set('Lead', lead, {});
    }

    /* check if this utm url equal to the current values of cookie lead */
    function is_this_utm_equal_to_cookie_utm_values() {
      for (const this_utm_element of my_utmParameters) {
        /* if utm_source exist */
        let value_exist = false;
        if (cookieExist != undefined) {
          let value_exist = JSON.parse(cookieExist).parameters[this_utm_element] == getAllUrlParams[this_utm_element];
          //console.log(`${value_exist} - ${JSON.parse(cookieExist).parameters[this_utm_element]} compare to: ${getAllUrlParams[this_utm_element]}`);
        }
        if (value_exist == false) {
          return false;
        }
      } /* end for loop */
      return true;
    }

    function setUTMformValues(doc) {
      /* the value if the param is empty */
      const empty_param_case = "undefined";
      /* set fields */
      for (const this_utm_element of my_utmParameters) {
        /* if utm_source exist */
        set_utm_field(this_utm_element);
      } /* end for loop */

      /* inner function */
      function set_utm_field(utm_type) {
        let utm_value = JSON.parse(Cookies.get('Lead')).parameters[utm_type];
        let queryString = 'input[name*=\'' + utm_type + '\']';
        let utm_nodes = doc.querySelectorAll(queryString);
        /* change all utm form fields */
        if (utm_nodes.length > 0) {
          for (var i = 0; i < utm_nodes.length; i++) {
            if (!!utm_value && utm_value !== undefined) {
              utm_nodes[i].value = utm_value;
            } else {
              /* empty param for example ?utm_campaign= or ?utm_campaign */
              utm_nodes[i].value = empty_param_case;
            }
          } /* end for */
        } /* end if */
      } // end inner set_utm_field function */
    }

    function populateData(forms, forceSubmit) {
          for (let form of forms) {
              (function() {
                  form.addEventListener('submit', (event) => {
                    event.preventDefault(); // prevent page refresh
                    //console.log("form: " + form);
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
                        //console.log(pair);
                        window.dataLayer.push(pair);
                    }

                    let eventId = {};
                    eventId["event_id"] = Date.now().toString();
                    window.dataLayer.push(eventId);

                    setTimeout(() => {
                        if (forceSubmit) {
                            form.submit();
                        }
                    }, 5000); // wait 5 seconds before submitting the form
                });
              }());
          }
      }

      var regularForms = document.getElementsByTagName('form');
      //console.log("regularForms: " + regularForms);

      populateData(regularForms, false);

      //console.log(iframes);

      for (let iframe of iframes) {

          var innerDoc = iframe.contentDocument || iframe.contentWindow.document;

          let jotforms = innerDoc.getElementsByClassName('jotform-form');
          //console.log("jotforms: " + jotforms);
          populateData(jotforms, true);

      }
});
