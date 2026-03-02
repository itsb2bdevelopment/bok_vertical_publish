window.downloadFileFromStream = (fileName, base64Data) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64," + base64Data;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

function getAgentHelper() {
    const helper = (typeof getDotNetHelper === 'function')
        ? getDotNetHelper('aiAgent', ['aiAgentMA'])
        : DotNetHelper;
    if (!helper) {
        console.error("dotNetHelper non è inizializzato!");
    }
    return helper;
}

function invokeAgentMethod(method, ...args) {
    const helper = getAgentHelper();
    if (!helper) return;
    return helper.invokeMethodAsync(method, ...args);
}

// ricavo intestazioni delle tabelle per gestire la modifica
window.getTheadDataRefs = (parentId, jsonPosition) => {
    const parent = document.getElementById(parentId);
    if (!parent) return [];

    const table = document.querySelector("[data-table='"+jsonPosition+"']");
    if (!table) return [];

    const thead = table.querySelector("thead");
    if (!thead) return [];

    const tds = thead.querySelectorAll("td[data-ref]");

    // Mappa ogni td in un oggetto { dataRef, value }
    const result = Array.from(tds).map(td => ({
        reference: td.getAttribute("data-ref"),
        value: td.innerHTML.trim()
    }));


    return result;
};


document.addEventListener('click', function (e) {
    // Solo click SINISTRO
    if (e.button !== 0) return;

    // se è attivo la modalità editMode
    if (e.target.closest('.editMode')) {
        var messageElem = e.target.closest(".message");

        var idEditMode = messageElem ? messageElem.getAttribute("id") : null;
        if (!idEditMode) return;


        var fieldsElem = e.target.closest('[data-type="fields"]');
        var tableTypeElem = e.target.closest('[data-type="table"]');

        var getDistanceToAncestor = function (startNode, ancestorNode) {
            var distance = 0;
            var node = startNode;
            while (node) {
                if (node === ancestorNode) return distance;
                node = node.parentElement;
                distance++;
            }
            return Number.POSITIVE_INFINITY;
        };

        var fieldsDistance = fieldsElem ? getDistanceToAncestor(e.target, fieldsElem) : Number.POSITIVE_INFINITY;
        var tableDistance = tableTypeElem ? getDistanceToAncestor(e.target, tableTypeElem) : Number.POSITIVE_INFINITY;
        var shouldHandleAsField = fieldsDistance < tableDistance;

        if (tableTypeElem && !shouldHandleAsField) {
            var tableElem = e.target.closest('[data-table]');
            var jsonPositionTable = tableElem ? tableElem.getAttribute("data-table") : null;
            if (!jsonPositionTable) return;

            openEditModal(jsonPositionTable, idEditMode, true); // Puoi cambiare cosa passi!
            return;
        }



        var positionElem = e.target.closest('[data-position]');
        var jsonPosition = positionElem ? positionElem.getAttribute("data-position") : null;
        if (!jsonPosition) return;
        openEditModal(jsonPosition, idEditMode, false);
        return;
    }

    // .image
    if (e.target.classList.contains('imgai')) {
        var value = e.target.getAttribute('src');
        invokeAgentMethod('OpenDetailImage', value);
        return;
    }
    // svg o figli
    var svg = e.target.closest('svg');
    if (svg) {
        var value = svg.outerHTML;
        invokeAgentMethod('OpenDetailImage', null, value);
    }
});

async function copyTextToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        console.log('Text copied!');
    } catch (err) {
        console.error('Error:', err);
    }
}

async function getClipboardImage() {
    invokeAgentMethod('UpdateMessage', "Getting image...")

    const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    const resizeImage = (blob) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxWidth = 800;
            const scale = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(resizedBlob => resolve(resizedBlob), 'image/jpeg', 0.95);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
    });

    const toBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        const timer = setTimeout(() => reject(new Error('Timeout')), 15000);
        reader.onloadend = () => {
            clearTimeout(timer);
            resolve(reader.result);
        };
        reader.onerror = () => {
            clearTimeout(timer);
            reject(new Error('FileReader error'));
        };
        reader.readAsDataURL(blob);
    });

    try {
        if (isIOS()) {
            invokeAgentMethod('UpdateMessage', "Clipboard access is not supported on iOS.")
            return;
        }

        if (!navigator.clipboard?.read) {
            invokeAgentMethod('UpdateMessage', "The browser does not support clipboard access.")
            return;
        }

        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
            for (const type of item.types) {
                if (type.startsWith('image/')) {
                    const blob = await item.getType(type);
                    const resized = await resizeImage(blob);
                    const base64 = await toBase64(resized);
                    // chiama la funzione che memorizza l'immagine in base64
                    await invokeAgentMethod('InsertAttachment', base64, null, null);
                    return;
                }
            }
        }
        invokeAgentMethod('UpdateMessage', "No valid image found in the clipboard.")
    } catch (err) {
        invokeAgentMethod('UpdateMessage', "File loading error: " + err)
        console.error("Errore clipboard:", err);
    }
}

async function embedImagesInSvg(svg) {
    const images = svg.querySelectorAll('image');
    for (let img of images) {
        let href = img.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || img.getAttribute('href');
        if (href && !href.startsWith('data:')) {
            // Prova a caricare l’immagine e convertirla in base64
            try {
                const response = await fetch(href, { mode: "cors" });
                const blob = await response.blob();
                const dataUrl = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
                img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl);
                img.setAttribute('href', dataUrl);
            } catch (e) {
                // Se fallisce, lascialo stare oppure metti una trasparente
                img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==');
                img.setAttribute('href', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==');
            }
        }
    }
}

function getSvgSize(svg) {
    // Prima provo a leggere width/height in px, se ci sono
    let width = svg.width && svg.width.baseVal && svg.width.baseVal.value;
    let height = svg.height && svg.height.baseVal && svg.height.baseVal.value;

    // Se width/height non sono numerici o sono zero, provo a leggere dal bounding box
    if (!width || isNaN(width) || width === 0) {
        width = svg.getBoundingClientRect().width;
    }
    if (!height || isNaN(height) || height === 0) {
        height = svg.getBoundingClientRect().height;
    }
    // Default fallback se ancora non va
    if (!width || width === 0) width = 300;
    if (!height || height === 0) height = 150;

    return { width, height };
}

async function svgToPngDataUri(svg) {
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.src = url;
    await new Promise(resolve => { img.onload = resolve; });

    // Usa la funzione aggiornata!
    const { width, height } = getSvgSize(svg);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/png');
}

async function replaceAllSvgWithImg(parent) {
    const svgList = parent.querySelectorAll('svg');
    for (const svg of svgList) {
        await embedImagesInSvg(svg);
        const dataUrl = await svgToPngDataUri(svg);
        const { width, height } = getSvgSize(svg);
        const img = document.createElement('img');
        img.src = dataUrl;
        img.width = width;
        img.height = height;
        svg.parentNode.replaceChild(img, svg);
    }
}

async function exportWord(id) {
    // Prendi il div .document che contiene il bottone
    const docDiv = document.getElementById(id);
    const contentNode = docDiv.querySelector('.content');

    // Clona il div così possiamo modificarlo senza cambiare il DOM
    const clonedDiv = contentNode.cloneNode(true);
    await replaceAllSvgWithImg(clonedDiv);

    document.body.appendChild(clonedDiv);

    const style = document.createElement('style');
    style.innerHTML = `
      .isolate {
        width:700px!important;
        font-family: Arial, sans-serif;
      }
    `;
    clonedDiv.prepend(style);
    clonedDiv.classList.add("page");

    // Prendi l'HTML rimanente
    inlineAllStylesWithZoom(clonedDiv);

    document.body.removeChild(clonedDiv);

    if (style) style.remove();

    const styledel = clonedDiv.querySelector('style');
    if (styledel) styledel.remove();

    let text = clonedDiv.innerHTML;

    try {
        await invokeAgentMethod('HideMenubotAnswer');

        await invokeAgentMethod('ExportWord', text);
        console.log('Text copied!');
    } catch (err) {
        console.error('Error:', err);
    }
}
async function exportHtml(id) {
    // Prendi il div .document che contiene il bottone
    const docDiv = document.getElementById(id);
    const contentNode = docDiv.querySelector('.content');

    let text = contentNode.innerHTML;

    try {
        await invokeAgentMethod('HideMenubotAnswer');

        await invokeAgentMethod('ExportHtml', text);
        console.log('Text copied!');
    } catch (err) {
        console.error('Error:', err);
    }
}

async function exportClipboard(divId) {
    // Prendi il div .document che contiene il bottone
    try {
        await invokeAgentMethod('HideMenubotAnswer');

        const div = document.getElementById(divId);
        if (!div) return;

        const contentNode = docDiv.querySelector('.content');
        if (!contentNode) return;

        const html = contentNode.innerHTML;
        const text = contentNode.innerText;

        if (navigator.clipboard && window.ClipboardItem) {
            const blobHtml = new Blob([html], { type: "text/html" });
            const blobText = new Blob([text], { type: "text/plain" });
            const item = new ClipboardItem({
                "text/html": blobHtml,
                "text/plain": blobText
            });
            navigator.clipboard.write([item])
                .then(() => console.log("Copiato con formattazione!"))
                .catch(err => alert("Copy error: " + err));
        } else {
            alert("Clipboard API not supported from your browser 😔");
        }
    } catch (err) {
        console.error('Error:', err);
    }
}
async function editBubbleOn(id) {
    try {
        await invokeAgentMethod('HideMenubotAnswer');

        await invokeAgentMethod('EditBubbleOn', id);
    } catch (err) {
        console.error('Error:', err);
    }
}
async function editBubbleOff(id) {
    try {
        await invokeAgentMethod('HideMenubotAnswer');

        await invokeAgentMethod('EditBubbleOff', id);
    } catch (err) {
        console.error('Error:', err);
    }
}
async function deleteBubble(id) {
    try {
        await invokeAgentMethod('HideMenubotAnswer');

        await invokeAgentMethod('DeleteBubble', id);
    } catch (err) {
        console.error('Error:', err);
    }
}
async function openEditModal(jsonPosition, id, isTable) {
    try {
        await invokeAgentMethod('EditField', jsonPosition, id, isTable);
    } catch (err) {
        console.error('Error:', err);
    }
}

function inlineAllStylesWithZoom(element, zoom = 1) {
    const all = element.querySelectorAll('*');
    all.forEach(el => {
        const computed = window.getComputedStyle(el);
        let style = '';
        for (let prop of computed) {
            let val = computed.getPropertyValue(prop);

            // Scala solo le proprietà numeriche in px
            if (val.endsWith('px')) {
                let num = parseFloat(val);
                val = (num * zoom) + 'px';
            }

            style += `${prop}:${val};`;
        }
        el.setAttribute('style', style);
    });
}

function getIndexesAndArrays(clickedNode) {
    let current = clickedNode;
    let root = current.closest(".message");
    let stack = [];

    // Funzione helper per cercare il primo data-seq valido nel parent
    function findParentSeq(node, root) {
        let seq = -1;
        let parent = node.parentNode;
        while (parent && parent !== root) {
            // Se ha data-array, STOPPIAMO!
            if (parent.hasAttribute && parent.hasAttribute('data-array')) break;

            // Se ha data-seq NON vuoto, prendilo e stoppa
            if (parent.hasAttribute && parent.hasAttribute('data-seq')) {
                let val = parent.getAttribute('data-seq');
                if (val !== "") {
                    seq = Number(val);
                    break;
                }
            }
            parent = parent.parentNode;
        }
        return seq;
    }

    // Risaliamo dal cliccato fino a root
    while (current && current !== root) {
        const hasDataKey = current.hasAttribute('data-key') && current.getAttribute('data-key') !== "";
        const hasDataArray = current.hasAttribute('data-array') && current.getAttribute('data-array') !== "";

        // Cerca il primo parent con data-seq valido, secondo la logica voluta!
        let seq = findParentSeq(current, root);

        if (hasDataKey) {
            const value = current.getAttribute('data-key');
            if (value != null) {
                stack.push({ "type": "key", "value": value, "index": seq });
            }
        }
        if (hasDataArray) {
            const arrayPath = current.getAttribute('data-array');
            if (arrayPath != null) {
                stack.push({ "type": "array", "value": arrayPath, "index": seq });
            }
        }

        current = current.parentNode;
    }

    // Ora stack è dal cliccato al root, lo inverti per partire da root
    stack.reverse();
    console.log(stack);
    // creazione path
    let path = "";
    let parentStack = null;
    for (let i = 0; i < stack.length; i++) {
        const currentStack = stack[i];
        path += (path && parentStack != null && Number(currentStack.index) >= 0 ? "[" + currentStack.index + "]" : "");
        path += (path ? "." : "") + currentStack.value;

        parentStack = currentStack;
    }

    return path;
}

function getWindowHeight() {
    return window.innerHeight;
}

function renderAllMermaid() {
    // Prendi tutti gli elementi .mermaid
    document.querySelectorAll('.mermaid').forEach((el, i) => {
        try {
            const thinkingNode = el.querySelector('.thinking');
            if (thinkingNode) thinkingNode.remove();

            console.log(`Rendering mermaid #${i}:`, el.textContent);
            mermaid.init(undefined, el);
            // Se vuoi vedere l'oggetto DOM dopo il rendering:
            // console.log('Dopo rendering:', el.innerHTML);
        } catch (e) {
            console.error(`Errore rendering mermaid #${i}:`, e, 'Contenuto:', el.textContent);
        }
    });
}

function scrollMessagesToBottom() {
  const messagesDiv = document.getElementById("messages");
  if (messagesDiv) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}
function scrollMessagesToBottomSmooth() {
  const messagesDiv = document.getElementById("messages");
  if (messagesDiv) {
    messagesDiv.scrollTo({
      top: messagesDiv.scrollHeight,
      behavior: "smooth"
    });
  }
}
