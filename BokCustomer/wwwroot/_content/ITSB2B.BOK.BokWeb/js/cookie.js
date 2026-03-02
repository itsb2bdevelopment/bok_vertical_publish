window.cookieService = {
    setCookie: function (key, value, expiryDate) {
        let cookieString = key + "=" + (value);
        if (expiryDate) {
            cookieString += "; expires=" + expiryDate.toUTCString();
        }
        cookieString += "; path=/";
        document.cookie = cookieString;
        //console.log("Cookie settato:", cookieString);

    },
    getCookie: function (key) {
        let name = key + "=";
        let decodedCookies = (document.cookie);
        let ca = decodedCookies.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        return "";
    },
    deleteCookie: function (key) {
        document.cookie = key + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    }
};