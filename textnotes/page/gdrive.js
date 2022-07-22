"use strict";

class GDrive {

    constructor() {
        this._authURL = "https://accounts.google.com/o/oauth2/v2/auth";
        this._driveApi = "https://www.googleapis.com/drive/v3";
        this._driveUploadApi = "https://www.googleapis.com/upload/drive/v3";
        this._clientId = '!MzUwNjEzNDE2*NzQyLTJhZn@BrdmVnb#mE2Nm@1rbm*04M2xyOGg<5Z>Wp-mZHBzb3I4LmFw*cH?MuZ29vZ2.x:ldXNlcmN$#vbnR?lb"nQuY29t$';
        this._apiScope = "https://www.googleapis.com/auth/drive.file";
        this._redirectURL = this._getRedirectURL();
        this._fetchTimeoutMs = 8000;

        this._oauth2Token = "";
        this._folderId = "";
        this._fileList = "";
    }

    reset() {
        this._oauth2Token = "";
        this._folderId = "";
        this._fileList = "";
    }

    isOAuth2Ready() {
        return (this._oauth2Token.length > 0);
    }

    setOAuth2Token(token) {
       this._oauth2Token = token;
    }

    getOAuth2Token() {
        return this._oauth2Token;
    }

    getFileList() {
        return this._fileList;
    }

    doOAuth2(callback, callbackError) {
        log.debug("[START]");

        let THIS = this;

        const doOAuth2CallBack = (redirectUri) => {
            log.debug("[START]");
            log.debug("Redirect URI : " + redirectUri);

            try {
                const parameterString = redirectUri.match(/[#?](.*)/);
                if (parameterString === null || parameterString.length < 1) {
                    log.error("Redirect URI format is invalid!");
                    callbackError("Redirect URI format is invalid!");
                    return;
                }

                let access_token = new URLSearchParams(parameterString[1].split("#")[0]).get("access_token");
                if (access_token === null) {
                    log.error("The 'access_token' parameter does not exist!")
                    callbackError("The 'access_token' parameter does not exist!")
                    return;
                }

                log.debug("Token :" + access_token);

                THIS.setOAuth2Token(access_token);
                setTimeout(callback, 0);
            } catch(e) {
                log.error("Exception :" + e);
                callbackError(e);
            }

            log.debug("[EXIT]");
        }

        const authURL = this._authURL
                        + `?client_id=${atob(this._clientId.match(/[\w+/]/g).join(""))}`
                        + `&response_type=token`
                        + `&redirect_uri=${encodeURIComponent(this._redirectURL)}`
                        + `&scope=${encodeURIComponent(this._apiScope)}`
        log.debug("authURL :" + authURL);
        browser.identity.launchWebAuthFlow({ interactive: true, url: authURL }).then(doOAuth2CallBack, callbackError);

        log.debug("[EXIT]");
    }

    async initDirectory() {
        log.debug("[START]");

        const getFolderList = async () => {
            log.debug("[START]");
            const headers = new Headers({'Authorization' : 'Bearer ' + this._oauth2Token});
            const query = "?q=mimeType='application/vnd.google-apps.folder' and trashed=false"
            const request = new Request(this._driveApi  + "/files" + query, { method: "GET", headers : headers })
            const response = await this._fetchWithTimeout(request);

            log.debug("Fetch status : " + response.status);
            if (response.status != 200) {
                throw Error("Response status of getFolderList() was " + response.status);
            }

            const folderList = await response.json();
            log.debug("FolderList : " + JSON.stringify(folderList));

            log.debug("[EXIT]");
            return folderList.files;
        };

        const createFolder = async () => {
            log.debug("[START]");
            const headers = new Headers([['Authorization', 'Bearer ' + this._oauth2Token],
                                         ['Accept', 'application/json'],
                                         ['Content-Type', 'application/json']]);
            const data = '{ "name" : ".TextNotes", "mimeType" : "application/vnd.google-apps.folder" }';
            const request = new Request(this._driveApi + "/files", { method:"POST", headers:headers, body:data });
            const response = await this._fetchWithTimeout(request);

            log.debug("Fetch status : " + response.status);
            if (response.status != 200) {
                throw "Response status of createFolder() was " + response.status;
            }
            log.debug("[EXIT]");
        };

        let folders = await getFolderList();

        if (0 === folders.length) {
            log.debug("There is no folder so let us create one");
            await createFolder();
            folders = await getFolderList();
            if (0 === folders.length) {
                throw "There is no 'TextNotes' folder but couldn't be created!";
            }
        } else {
            log.debug("There is an existing folder");
        }

        this._folderId = folders[0].id;
        log.debug("FolderId : " + this._folderId);

        log.debug("[EXIT]");
    }

    async listFiles() {
        log.debug("[START]");

        const headers = new Headers({'Authorization' : 'Bearer ' + this._oauth2Token});
        const query = "?q='" + this._folderId + "' in parents and trashed=false&fields=files(id,name,modifiedTime)";
        const request = new Request(this._driveApi + "/files" + query, { method: "GET", headers : headers })
        const response = await this._fetchWithTimeout(request);

        log.debug("Fetch status : " + response.status);
        if (response.status != 200) {
            throw "Response status of listFiles() was " + response.status;
        }

        const fileList = await response.json();
        log.debug("FileList : " + JSON.stringify(fileList));

        this._fileList = new Object()
        for (const file of fileList.files) {
            log.debug("Name :" + file.name + ", Id :" + file.id + ", ModifiedTime :" + file.modifiedTime);
            this._fileList[file.id] = { name:file.name, modifiedTime:file.modifiedTime };
        }

        log.debug("[EXIT]");
    }

    async saveFile(data, fileName) {
        log.debug("[START]");

        const contentType = fileName.endsWith(".txt") ? "text/plain" : "application/octet-stream";
        log.debug("ContentType : " + contentType);

        const uploadData = async () => {
            const headers = new Headers([['Authorization', 'Bearer ' + this._oauth2Token],
                                         ['Content-Type', contentType],
                                         ['Accept', 'application/json'],
                                         ['Content-Length', data.length]]);
            const request = new Request(this._driveUploadApi + "/files?uploadType=media",
                                        { method:"POST", headers:headers, body:data });
            const response = await this._fetchWithTimeout(request);

            log.debug("Fetch status : " + response.status);
            if (response.status != 200) {
                throw "Response status of uploadData() was " + response.status;
            }
            const responseJson = await response.json();
            log.debug("fileId :" + responseJson.id);

            return responseJson.id;
        };

        const setProperties = async(fileId) => {
            const headers = new Headers([['Authorization', 'Bearer ' + this._oauth2Token],
                                         ['Content-Type', 'application/json'],
                                         ['Accept', 'application/json']]);
            const data = { description : "TextNotes Data", name: fileName }
            const request = new Request(this._driveApi + "/files/" + fileId + "?addParents=" + this._folderId,
                                        { method:"PATCH", headers:headers, body:JSON.stringify(data) });
            const response = await this._fetchWithTimeout(request);
            const responseJson = await response.json();
            log.debug("Response :" + JSON.stringify(responseJson));

            log.debug("Fetch status : " + response.status);
            if (response.status != 200) {
                throw "Response status of setProperties() was " + response.status;
            }
        };

        const fileId = await uploadData();
        await setProperties(fileId);

        log.debug("[EXIT]");
    }

    async updateFile(data, fileName, fileId) {
        log.debug("[START]");

        const contentType = fileName.endsWith(".txt") ? "text/plain" : "application/octet-stream";
        log.debug("ContentType : " + contentType);

        const updateData = async () => {
            const headers = new Headers([['Authorization', 'Bearer ' + this._oauth2Token],
                                         ['Content-Type', contentType],
                                         ['Accept', 'application/json'],
                                         ['Content-Length', data.length]]);
            const request = new Request(this._driveUploadApi + "/files/"+ fileId +"?uploadType=media",
                                        { method:"PATCH", headers:headers, body:data });
            const response = await this._fetchWithTimeout(request);

            const responseText = await response.text();
            log.debug("Response : " + responseText);

            log.debug("Fetch status : " + response.status);
            if (response.status != 200) {
                throw "Response status of updateData() was " + response.status;
            }
        };

        await updateData();

        log.debug("[EXIT]");
    }

    async loadFile(fileId) {
        log.debug("[START]");
        log.debug("fileId :" + fileId);

        const loadData = async () => {
            const headers = new Headers([[ 'Authorization', 'Bearer ' + this._oauth2Token ]]);
            const request = new Request(this._driveApi + "/files/"+ fileId +"?alt=media",
                                        { method:"GET", headers:headers });
            const response = await this._fetchWithTimeout(request);

            const responseText = await response.text();
            log.debug("Response : " + responseText);

            log.debug("Fetch status : " + response.status);
            if (response.status != 200) {
                throw "Response status of loadFile() was " + response.status;
            }

            return responseText;
        };

        const data = await loadData();

        log.debug("[EXIT]");

        return data;
    }

    async deleteFile(fileId) {
        log.debug("[START]");
        log.debug("fileId :" + fileId);

        const deleteData = async () => {
            const headers = new Headers([[ 'Authorization', 'Bearer ' + this._oauth2Token ]]);
            const request = new Request(this._driveApi + "/files/" + fileId, { method :"DELETE", headers :headers });
            const response = await this._fetchWithTimeout(request);

            const responseText = await response.text();
            log.debug("Response : " + responseText);

            log.debug("Fetch status : " + response.status);
            if (response.status != 204) {
                throw "Response status of deleteData() was " + response.status;
            }
        };

        await deleteData();

        log.debug("[EXIT]");
    }

    async _fetchWithTimeout(resource, options = Object()) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), this._fetchTimeoutMs);

        options.signal = controller.signal;
        let response;
        try {
            response = await fetch(resource, options);
        } catch(e) {
            if (e.name === "AbortError") {
                throw Error("Connection Timeout");
            } else {
                throw e;
            }
        }

        clearTimeout(id);

        return response;
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
