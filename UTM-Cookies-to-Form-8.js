  const my_utmParameters = [
    "gclid_field",
    "fbclid_field",
    "utm_source_field",
    "utm_medium_field",
    "utm_campaign_field",
    "fbp_field",
    "fbc_field"
];

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
    setUTMformValues();
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
        setUTMformValues();
    } else {
        //console.log("Case 2 - lead exist with these params");
        setUTMformValues();
    }
}

/* Case 4 - cookie Exist  but page without any utm param */
if (isEmpty && cookieExist !== undefined) {
    //console.log("Case 4 - cookie Exist  but page without any utm param");
    setUTMformValues();
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

function setUTMformValues() {
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
        let utm_nodes = document.querySelectorAll(queryString);
        /* change all utm form fields */
        if (utm_nodes.length > 0) {
            for (var i = 0; i < utm_nodes.length; i++) {
                if (!!utm_value && utm_value !== undefined) {
                    utm_nodes[i].value = utm_value;
                    console.log(utm_nodes[i]);
                    console.log(utm_nodes[i].value);
                } else {
                    /* empty param for example ?utm_campaign= or ?utm_campaign */
                    utm_nodes[i].value = empty_param_case;
                }
            } /* end for */
        } /* end if */
    } // end inner set_utm_field function */
}
