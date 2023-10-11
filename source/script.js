// References to field elements
var fromNumber = document.getElementById('fromNumber');
var toNumber = document.getElementById('toNumber');
var dialBtn = document.getElementById('dial');
var title = document.getElementById('title');
var hint = document.getElementById('hint');
var surveyorDetails = document.getElementById('surveyorDetails');
var buttonHint = document.getElementById('buttonHint');
var result = document.getElementById('statusBox');
var reasonDiv = document.getElementById('reasonBox');
var answerState = document.getElementById("answerState");


// References to values stored in the plug-in parameters
var apiKey = getPluginParameter('apikey');
var apiToken = getPluginParameter('apitoken');
var accountSid = getPluginParameter('accountSid');
var pfromNumber = getPluginParameter('fromNumber');
var ptoNumber = getPluginParameter('toNumber');
var pcallerId = getPluginParameter('callerId');
var recording = getPluginParameter('recording');
var displaynumber = getPluginParameter('displaynumber');
var baseUrl = getPluginParameter('baseUrl') || "api.exotel.in";
var type = getPluginParameter('type') || "call";
var msgBody = getPluginParameter('msgBody');
var currentAnswer = fieldProperties.CURRENT_ANSWER;


// First, show the current values form the fieldParams object
if (type) {
    if (type === "sms") {
        hint.innerText = "Please check before sending SMS:";
        surveyorDetails.style.visibility = 'hidden';
        dialBtn.innerText = 'Send SMS';
        title.innerText = 'Exotel SMS';
        buttonHint.innerText = "This will send SMS to the respondent.";
    } else {
        fromNumber.innerHTML = pfromNumber;
    }

} else {
    fromNumber.innerHTML = pfromNumber;
}
setCurrentStatus();


function setResult(resultClass, resultText, reason = null, html = false) {
    t1 = result.classList.replace("danger", resultClass);
    t2 = result.classList.replace("success", resultClass);

    if ((t1 || t2) == false) {
        result.classList.add(resultClass);
    }
    result.innerText = resultText;
    if (reason != null) {
        reasonDiv.classList.add('reason');
        if (html == true) {
            reasonDiv.innerHTML = reason;
        }
        else {
            reasonDiv.innerText = reason;
        }
        var metadata = [resultText, reason, new Date().toString(), html];
        setMetaData(metadata.join(","));
    }
}


function formatDateTime(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear(),
        hours = '' + d.getHours(),
        minutes = '' + d.getMinutes();

    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;

    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;
    if (hours.length < 2)
        hours = '0' + hours;
    if (minutes.length < 2)
        minutes = '0' + minutes;

    return [day, month, year].join('-') + ' ' + strTime;
}


function setCurrentStatus() {
    var stored_metadata = getMetaData() || "";
    var split_metadata = stored_metadata.split(',');
    var metadata = {
        "status": split_metadata[0],
        "reason": split_metadata[1],
        "timestamp": formatDateTime(split_metadata[2]),
        "html": split_metadata[3]
    };
    if (metadata != '') {
        var last_response_time = metadata['timestamp'];
        if (metadata["status"] == "Success") {
            setResult("success", "Success", metadata['reason'], metadata['html']);
            if (last_response_time != undefined) {
                answerState.innerHTML = "* Last recorded server response at " + last_response_time;
            }
        }
        else if (metadata["status"] == "Failure") {
            setResult("danger", "Failure", metadata['reason'], metadata['html']);
            if (last_response_time != undefined) {
                answerState.innerHTML = "* Last recorded server response at " + last_response_time;
            }
        }
    }
}

toNumber.innerHTML = ptoNumber;
if (displaynumber === 0) {
    toNumber.innerHTML = '**********';
}


// Define the dial function
dialBtn.onclick = function () {
    apiCall()
}

function generateAPIUrl(baseUrl, accountSid, type) {
    var endpoint;
    if (type == "sms") {
        endpoint = "/Sms/send.json"
    }
    else {
        endpoint = "/Calls/connect.json"
    }
    return "https://" + apiKey + ":" + apiToken + "@" + baseUrl + '/v1/Accounts/' + accountSid + endpoint;
}

function makeHttpObject() {
    try { return new XMLHttpRequest(); }
    catch (error) { }
    try { return new ActiveXObject("Msxml2.XMLHTTP"); }
    catch (error) { }
    try { return new ActiveXObject("Microsoft.XMLHTTP"); }
    catch (error) { }

    throw new Error("Could not create HTTP request object.");
}


function parseError(data) {
    msg = data["RestException"]["Message"];
    if (msg.includes("NDNC")) {
        return "The number is registered under DND"
    }
    return msg;
}

function processResponse(data) {
    var status = data["Call"]["Status"] == "in-progress" ? "Success" : "Failure";
    var statusClass = data['status'] == "success" ? 'success' : 'danger';
    if (status == "Success") {
        var sid = data["Call"]["Sid"];
        setResult(statusClass, status, "Call was placed successfully!")
        setAnswer(sid);
        return true;
    }
    else if (status == "Failure") {
        setResult(statusClass, status, "Call couldn't be placed!")
        return false;
    }
}


function createCallPayload(data) {
    var record;
    if (data["Record"] == 0) {
        record = false;
    }
    else {
        record = true;
    }
    return {
        "CallerId": "0" + data["CallerId"],
        "From": "0" + data["From"],
        "To": data["To"],
        "Record": record
    }
}

function jsonToQueryString(json) {
    const queryString = Object.keys(json)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(json[key])}`)
        .join('&');
    return queryString;
}


function apiCall() {
    try {
        request = makeHttpObject()
        url = generateAPIUrl(baseUrl, accountSid, type);
        if (type == "call") {
            payload = createCallPayload({ "From": pfromNumber, "To": ptoNumber, "CallerId": pcallerId, "Record": recording })
        }
        request.open('POST', url, false)
        request.setRequestHeader('Content-Type', ' application/x-www-form-urlencoded');

        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                if (request.status == 200) {
                    try {
                        var response = JSON.parse(request.responseText);
                        var check = processResponse(response);
                        if (check == true) {
                            goToNextField(true);
                        }
                    }
                    catch {
                        setResult("danger", "Failure", "Error occured while parsing response")
                    }
                }
                else if (request.status == 400) {
                    var errorResponse = JSON.parse(request.responseText);
                    var errorMessage = parseError(errorResponse);
                    setResult("danger", "Failure", errorMessage);
                }
                else if (request.status == 401) {
                    setResult("danger", "Failure", "Server returned 401, please check plugin credentials")
                }
                else if (request.status == 403) {
                    var errorResponse = JSON.parse(request.responseText);
                    var errorMessage = parseError(errorResponse);
                    setResult("danger", "Failure", errorMessage);
                }
                else if (request.status == 404) {
                    setResult("danger", "Failure", "Server returned 404")
                }
                else if (request.status == 500) {
                    setResult("danger", "Failure", "Server returned 500")
                }
                else if (request.status == 429) {
                    setResult("danger", "Failure", "Rate limited, please try again in some time!")
                }
                else {
                    setResult("danger", "Failure", request.responseText)
                }
            }
        }
        request.onloadstart = function () {
            dialBtn.disabled = true
        }
        request.onloadend = function () {
            dialBtn.disabled = false
        }
        request.onerror = function () {
            setResult("danger", "Failure", "Network Error, please check your internet connection!")
        }

        request.send(jsonToQueryString(payload));
    } catch (error) {
        setResult("danger", "Failure", error);
    }
}

function getSite() {
    var request = makeHttpObject();
    var sresponse;

    request.onreadystatechange = function () {
        if (request.readyState === 4) {
            sresponse = request.responseText;
            // exotelResultsValue.value = sresponse;
        }
    };
    var urlstring = "https://" + apikey + ":" + apitoken + "@api.exotel.in/v1/Accounts/" + accountSid + "/Calls/connect";
    var params = "";
    if (recording === 0) {
        params = "From=0" + pfromNumber + "&To=0" + ptoNumber + "&CallerId=0" + calledID + "&Record=false";
    } else {
        params = "From=0" + pfromNumber + "&To=0" + ptoNumber + "&CallerId=0" + calledID + "&Record=true";
    }
    if (type) {
        if (type === "sms") {
            urlstring = "https://" + apikey + ":" + apitoken + "@api.exotel.in/v1/Accounts/" + accountSid + "/Sms/send"
            params = "From=JPALSA&To=0" + ptoNumber + "&Body=" + msgBody;
        }
    }
    request.open('POST', urlstring, true);
    request.setRequestHeader("Content-type", "application/json");
    request.withCredentials = true;
    request.send(params);

}
