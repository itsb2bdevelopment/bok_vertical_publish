let DotNetHelper;
let DotNetHelpers = {};

function setTitle(title) {
    document.title = title;
}

function setFavicon(url) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = url;
}

function setDotNetHelper(keyOrHelper, helperMaybe) {
    // Back-compat: setDotNetHelper(helper)
    if (helperMaybe === undefined) {
        DotNetHelper = keyOrHelper;
        DotNetHelpers.default = keyOrHelper;
        return;
    }

    DotNetHelpers[keyOrHelper] = helperMaybe;
    if (!DotNetHelper) {
        DotNetHelper = helperMaybe;
    }
}

function getDotNetHelper(key, fallbackKeys = []) {
    if (key && DotNetHelpers[key]) return DotNetHelpers[key];
    for (const k of fallbackKeys) {
        if (DotNetHelpers[k]) return DotNetHelpers[k];
    }
    return DotNetHelper;
}

/// Apre pagina in un nuovo tab
function openInNewWindow(url) {
    document.activeElement.blur();
    window.open(url, '_blank', 'noopener,noreferrer');
}
function OpenPdfPreviewElement(idElement) {

}
function OpenElement(idElement) {

}

/// Apre pdf in Search
function OpenPdfPreview(iddoc, idchunk = null, element = null, page = null) {
    var openPdf = [];
    if (openPdf.includes(iddoc) == false) {
        openPdf.push(iddoc);
    }

    var query = [];
    if (idchunk != null) {
        query.push("c=" + idchunk);
    }
    if (page != null) {
        query.push("pn=" + page);
    }
    if (element != null) {
        query.push("e=" + element);
    }
    document.activeElement.blur();
    window.open("/Pdf?id=" + iddoc + (query.length > 0 ? "&" + query.join("&") : ""), "_blank", 'noopener,noreferrer');

}

function OpenPreview(iddoc, idchunk = null, element = null, page = null) {
    var openPdf = [];
    if (openPdf.includes(iddoc) == false) {
        openPdf.push(iddoc);
    }

    var query = [];
    if (idchunk != null) {
        query.push("c=" + idchunk);
    }
    if (page != null) {
        query.push("pn=" + page);
    }
    if (element != null) {
        query.push("e=" + element);
    }
    document.activeElement.blur();
    window.open("/Preview?id=" + iddoc + (query.length > 0 ? "&" + query.join("&") : ""), "_blank", 'noopener,noreferrer');

}

/// Apre html in Search
function OpenHtmlPreview(iddoc, idchunk = null, element = null, page = null) {
    var openPdf = [];
    if (openPdf.includes(iddoc) == false) {
        openPdf.push(iddoc);
    }

    var query = [];
    if (idchunk != null) {
        query.push("c=" + idchunk);
    }
    if (page != null) {
        query.push("pn=" + page);
    }
    if (element != null) {
        query.push("e=" + element);
    }
    document.activeElement.blur();
    window.open("/Html?id=" + iddoc + (query.length > 0 ? "&" + query.join("&") : ""), "_blank", 'noopener,noreferrer');

}

function OpenVideo(iddoc, millisecond) {
    if (millisecond == undefined) {
        millisecond = "";
    }
    document.activeElement.blur();
    window.open("/Video?id=" + iddoc + "&offset=" + millisecond, "_blank");
}


/// Rinumera le pagine del pdf
function renumPagePDF(first) {
    // Recupera tutti i div con la classe "e-pv-thumbnail-number"
    const thumbnails = document.querySelectorAll('.e-pv-thumbnail-number');

    // Itera su ogni elemento e aggiorna il contenuto con il numero di pagina
    thumbnails.forEach((thumbnail, index) => {
        const nuovoNumero = first + index;
        thumbnail.textContent = nuovoNumero;
    });
}

/// Gestisce il click sulle personalità di MCC
async function ButtonClickedFromMCC(json, whatExtract = null) {
    const helper = getDotNetHelper('openAutonomousAgent');
    if (!helper) {
        console.error("dotNetHelper non è inizializzato!");
        return;
    }

    JsonCurrent = json;
    document.activeElement.blur();
    helper.invokeMethodAsync('OpenAutonomousAgent', JsonCurrent);
}
/// Seleziona l'element indicato in una pagina web
function selectElementOnHtml(id) {
    const container = document.querySelector("#HtmlViewer .content-wrapper");
    if (!container) return;

    // reset selezionato precedente
    const prev = container.querySelector(".element-selected");
    if (prev) prev.classList.replace("element-selected", "element-normal");

    // target
    const target = container.querySelector(`div[data-idelement="${id}"]`);
    if (!target) return;

    target.classList.remove("element-normal");
    target.classList.add("element-selected");

    // focus (per accessibilità e tastiera)
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });

    // scroll dentro il contenitore
    const cRect = container.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();

    const outTop = tRect.top < cRect.top;
    const outBottom = tRect.bottom > cRect.bottom;

    if (outTop || outBottom) {
        const scrollTop = container.scrollTop + (tRect.top - cRect.top) - (container.clientHeight / 2 - target.offsetHeight / 2);
        container.scrollTo({ top: scrollTop, behavior: "smooth" });
    }
    return true;
}

// nel viewer HTML, scrolla alla pagina
function changeHtmlPage(pageNumber){
    const container = document.querySelector("#HtmlViewer .content-wrapper");
    if (!container) return false;

    // primo div con data-page = pageNumber (dentro al wrapper)
    const target = container.querySelector(`div[data-page="${pageNumber}"]`);
    if (!target) return false;

    // centra il target nel contenitore scrollabile
    const cRect = container.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    const newTop = container.scrollTop 
        + (tRect.top - cRect.top) 
        - (container.clientHeight / 2 - target.offsetHeight / 2);

    container.scrollTo({ top: newTop, behavior: "smooth" });

    // opzionale: focus non scrollante per accessibilità
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });

    return true;
}

function downloadFileFromStream(fileName, byteBase64) {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = "data:application/octet-stream;base64," + byteBase64;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
