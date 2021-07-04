"use strict";

class GDrive {

    constructor() {
        log.debug("[START]");

        this._redirectURL = this._getRedirectURL();
        this._clientID = "350613416742-2afpkvegna66mknm83lr8h9ejfdpsor8.apps.googleusercontent.com";
        this._apiScope = "https://www.googleapis.com/auth/drive.file";
        this._authURL = "https://accounts.google.com/o/oauth2/v2/auth";
        this._validationUrl = 'https://www.googleapis.com/oauth2/v3/tokeninfo';

        this._oauth2_token = "";

        log.debug("[EXIT]");
    }

    reset() {
        log.debug("[START]");

        this._oauth2_token = "";

        log.debug("[EXIT]");
    }

    doOAuth2(callback, callbackError) {
        log.debug("[START]");

        const authURL = this._authURL
                        + `?client_id=${this._clientID}`
                        + `&response_type=token`
                        + `&redirect_uri=${encodeURIComponent(this._redirectURL)}`
                        + `&scope=${encodeURIComponent(this._apiScope)}`
        log.debug("authURL :" + authURL);

        try {
            browser.identity.launchWebAuthFlow({ interactive: true, url: authURL })
                .then((redirectUri) => { this.doOAuth2_2(redirectUri, callback, callbackError); }, callbackError);
        } catch(e) {
            callbackError(e);
        }

        log.debug("[EXIT]");
    }

//http://127.0.0.1/mozoauth2/89991568f53933d0e093c132d15a050bd7513b79#access_token=ya29.a0AfH6SMA1bQgii65h6CtKoArZHqYWA-UBl99XAYskrV3DLdc3dYs2Xc-0GR42XCZgekU9w-79wGFRK7Y2lU5pZUyJocy1ySqCI-Io9RFZsRCZHCAtjTXc1t6eVYOpJskh7ZQgVFxlX6IFTZsgeYFs9aCn1taO&token_type=Bearer&expires_in=3599&scope=https://www.googleapis.com/auth/drive.file
    doOAuth2_2(redirectUri, callback, callbackError) {
        log.debug("[START]");
        log.debug("Redirect URI : " + redirectUri);

        const parameterString = redirectUri.match(/[#?](.*)/);
        if (parameterString === null || parameterString.length < 1) {
            log.error("Redirect URI format is invalid :");
            callbackError("Redirect URI format is invalid!");
            return;
        }

        let access_token = new URLSearchParams(parameterString[1].split("#")[0]).get("access_token");
        if (access_token === null) {
            log.error("The 'access_token' parameter does not exist!")
            callbackError("The 'access_token' parameter does not exist!")
            return;
        }

        const validationUrl = this._validationUrl + "?access_token=" + access_token;
        log.debug("validationUrl :" + validationUrl);

        try {
            const validationRequest = new Request(validationUrl, { method: "GET" });
            const callback = (response) => {
                if (!response.ok) {
                    log.error("Validation was not successful : " + response.status + " " + response.statusText);
                } else {
                    const jsonCallback = (json) => {
                        log.info("Response : " + JSON.stringify(json));
                        if (json.aud && json.aud === clientID) {
                            doOAuth2_3(access_token);
                        } else {
                            log.error("Validation was not successful");
                        }
                    };

                  response.json().then(jsonCallback);
                }
            };

            fetch(validationRequest).then(callback);

        } catch(e) {
          log.error("Some error occured while validating token :" + e);
        }

        log.debug("[EXIT]");
    }

    isEmpty() {
        return (this._oauth2_token == "");
    }

    _getRedirectURL() {
        const rawRedirectURL = browser.identity.getRedirectURL();
        const rawPrefix = "https://";
        const prefix = "http://127.0.0.1/mozoauth2/";
        const redirectURL = prefix + rawRedirectURL.substring(rawPrefix.length, rawRedirectURL.indexOf("."));

        log.debug("redirectURL : " + redirectURL);

        return redirectURL;
    }
}

GDrive.create = function() {
    return new GDrive();
}
