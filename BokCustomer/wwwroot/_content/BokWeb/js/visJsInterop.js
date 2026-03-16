window.visjsInterop = {
    createGraph: function (elementId, data, options, helper) {
        console.log("[createGraph]");
        const container = document.getElementById(elementId);
        if (!container) {
            console.error("Container non trovato: " + elementId);
            return;
        }

        for(let i=0; i<data.nodes.length; i++){
            let titleEl = null;
            let node = data.nodes[i];

            titleEl = document.createElement("div");
            titleEl.innerHTML = htmlDecode(node.title);
            node.title = titleEl;
        }

        var data = {
            nodes: new vis.DataSet(data.nodes),
            edges: new vis.DataSet(data.edges)
        };

        options = options || {};
        options.physics = options.physics || {};
        options.physics.stabilization = { enabled: false };


        var network = new vis.Network(container, data, options);


        // Gestione larghezza massima del testos
        let _labelWidthApplied = false;

        function htmlDecode(input) {
            const e = document.createElement("textarea");
            e.innerHTML = input ?? "";
            return e.value;
        }
        function applyLabelMaxWidth(maxw) {
            console.log("[resizing titles]");

            if (_labelWidthApplied) return;
            _labelWidthApplied = true;

            const ids = container.nodesDataSet.getIds();
            const updates = [];

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            for (let i = 0; i < ids.length; i++) {
                const id = ids[i];

                const node = container.nodesDataSet.get(id);
                if (!node) continue;
                const bb = network.getBoundingBox(id);
                if (!bb) continue;

                const nodeWidth = Math.max(1, (bb.right - bb.left));
                const maxLabelWidth = 60 * maxw;

                const fontSize = (node.font && node.font.size) || 14;
                const fontFace = (node.font && node.font.face) || "arial";
                ctx.font = fontSize + "px " + fontFace;

                const originalLabel = node._rawLabel || node.label || "";

                // 🔴 1) split sulle righe già esistenti
                const existingLines = originalLabel.split("\n");
                let finalWrapped = [];

                for (let l = 0; l < existingLines.length; l++) {
                    const lineText = existingLines[l];
                    const words = lineText.split(/\s+/);

                    let line = "";
                    let wrappedLine = "";

                    for (let w = 0; w < words.length; w++) {
                        const testLine = line ? line + " " + words[w] : words[w];
                        const metrics = ctx.measureText(testLine);

                        if (metrics.width > maxLabelWidth && line) {
                            wrappedLine += line + "\n";
                            line = words[w];
                        } else {
                            line = testLine;
                        }
                    }

                    wrappedLine += line;
                    finalWrapped.push(wrappedLine);
                }

                // 🔴 2) ricompone mantenendo i newline originali
                const wrapped = finalWrapped.join("\n");

                updates.push({
                    id: id,
                    _rawLabel: originalLabel,
                    label: wrapped,
                    font: Object.assign({}, node.font || {}, { multi: true })
                });
            }

            if (updates.length) {
                container.nodesDataSet.update(updates);
                network.redraw();
            }
        }

        // Aspetta almeno un draw (così il bounding box è affidabile)
        network.once("afterDrawing", function () {
            applyLabelMaxWidth(3);
        });

        // quando la fisica ha “finito” (o quasi), spegni
        network.on("stabilized", function () {
            network.setOptions({ physics: { enabled: false } });
            //network.fit({ animation: true });
        });

        container.networkInstance = network;
        container.nodesDataSet = data.nodes;
        container.edgesDataSet = data.edges;
        container.dotNetHelper = helper;

        // ====== AGGIUNTA PULSANTI NEL MENU vis-manipulation ======
        network.on("afterDrawing", function () {

            // cerchiamo la toolbar di manipulation solo la prima volta
            const toolbar = document.querySelector(".vis-manipulation");
            if (toolbar && !toolbar.querySelector("#ActionFreeze")) {

                // Pulsante Stop Physics
                const sepFreeze = document.createElement("div");
                sepFreeze.className = "vis-separator-line";

                const sepGo = document.createElement("div");
                sepGo.className = "vis-separator-line";

                const freezeBtn = document.createElement("button");
                freezeBtn.id = "ActionFreeze";
                freezeBtn.title = "Physics off";
                freezeBtn.className = "vis-button";
                freezeBtn.style.marginRight = "5px";
                freezeBtn.style.backgroundImage = "url('/_content/BokWeb/icons/graph/ActionFreeze.png')";
                freezeBtn.style.backgroundRepeat = "no-repeat";
                freezeBtn.style.backgroundSize = "25px 25px";
                freezeBtn.style.paddingLeft = "7px"; // spazio per l’icona
                freezeBtn.innerHTML = `<div class="vis-label">Freeze</div>`;

                const goBtn = document.createElement("button");
                goBtn.id = "ActionGo";
                goBtn.title = "Physics on";
                goBtn.className = "vis-button";
                goBtn.style.backgroundImage = "url('/_content/BokWeb/icons/graph/ActionGo.png')";
                goBtn.style.backgroundRepeat = "no-repeat";
                goBtn.style.backgroundSize = "25px 25px";
                goBtn.style.paddingLeft = "7px"; // spazio per l’icona
                goBtn.innerHTML = `<div class="vis-label">Go</div>`;

                toolbar.appendChild(sepFreeze);
                toolbar.appendChild(freezeBtn);
                toolbar.appendChild(sepGo);
                toolbar.appendChild(goBtn);

                // Eventi pulsanti
                const btnFreeze = toolbar.querySelector("#ActionFreeze");
                const btnGo = toolbar.querySelector("#ActionGo");

                btnFreeze.onclick = function () {
                    console.log("Physics disattivate ❄️");
                    network.setOptions({ physics: { enabled: false } });

                    btnFreeze.classList.add("active");
                    btnGo.classList.remove("active");
                };

                btnGo.onclick = function () {
                    console.log("Physics attivate 🔄");
                    network.setOptions({ physics: { enabled: true } });

                    btnGo.classList.add("active");
                    btnFreeze.classList.remove("active");
                };
            }

        });
        // ===========================================================

        const scheduleNodeSelectionSync = function (nodes) {
            container._pendingNodeSelection = nodes || [];

            if (container._nodeSelectionTimer) {
                clearTimeout(container._nodeSelectionTimer);
            }

            container._nodeSelectionTimer = setTimeout(function () {
                const nodesToSync = container._pendingNodeSelection || [];
                container._nodeSelectionTimer = null;

                container.dotNetHelper.invokeMethodAsync('OnNodeClick', nodesToSync)
                    .then(result => {
                        console.log("Metodo C# invocato con successo!");
                    })
                    .catch(error => {
                        console.error("Errore nell'invocare il metodo C#:", error);
                    });
            }, 0);
        };

        // Gestione degli eventi
        network.on('selectNode', function (params) {
            console.log("[selectNode]");
            console.log(params);
            scheduleNodeSelectionSync(params.nodes);
        });

        // Gestione degli eventi
        network.on('deselectNode', function (params) {
            console.log("[deselectNode]");
            console.log(params);
            scheduleNodeSelectionSync(params.nodes);
        });

        network.on('dragStart', function (params) {
            console.log("[dragStart]");
			for (var i = 0; i < params.nodes.length; i++) {
				var nodeId = params.nodes[i];
				container.nodesDataSet.update({ id: nodeId, physics: false });
			}
		});

        network.on('dragStop', function (params) {
            console.log("[dragStop]");
			for (var i = 0; i < params.nodes.length; i++) {
				var nodeId = params.nodes[i];
				container.nodesDataSet.update({ id: nodeId, physics: true });
			}
        });

        
        // Assumendo che tu abbia già la tua 'network' e il 'container'
        network.on('oncontext', function (params) {
            console.log("[oncontext]");
            console.log(params);
            params.event.preventDefault(); // Evita il menù del browser
            const pointer = params.pointer.DOM; // Coordinate del click
            const selectedNodes = network.getNodeAt(pointer); // Nodo cliccato (se esiste)
            
            // Recupera il container del grafo
            const rect = container.getBoundingClientRect();

            // Se non hai ancora un div per il menù, crealo dinamicamente
            let menu = document.getElementById("contextMenu");
            if (!menu) {
                menu = document.createElement("div");
                menu.id = "contextMenu";
                menu.classList.add("dropdown-menu");
                menu.style.display = "none";
                menu.style.zIndex = 1000;
                document.body.appendChild(menu);
            }

            // Se hai cliccato su un nodo, mostra il menù
            if (selectedNodes) {
                menu.innerHTML = `
                    <div class="dropdown-title">Node `+selectedNodes+`</div>
                    <a class="dropdown-item" href="javascript:void(0)" id="menu-showElements"><img src="/_content/BokWeb/icons/search/S-List.png" width="27"> Show Elements</a>
                    <a class="dropdown-item" href="javascript:void(0)" id="menu-unfreeze"><img src="/_content/BokWeb/icons/graph/ActionGo.png" width="27"> Unfreeze Node</a>
                `;

                // Calcola la posizione corretta tenendo conto dell’offset del container
                const x = rect.left + pointer.x;
                const y = rect.top + pointer.y;

                menu.style.left = `${x}px`;
                menu.style.top = `${y}px`;
                menu.style.display = "block";
            } else {
                menu.style.display = "none";
            }

            // --- Azione 1 ---
            document.getElementById("menu-showElements").onclick = function () {
                container.dotNetHelper.invokeMethodAsync('OnContextMenu', selectedNodes)
                .then(result => {
                    console.log("Metodo C# invocato con successo!");
                })
                .catch(error => {
                    console.error("Errore nell'invocare il metodo C#:", error);
                });
                menu.style.display = "none";
            };

            // --- Azione 2: riprende la vecchia logica ---
            document.getElementById("menu-unfreeze").onclick = function () {
                const selected = network.getSelectedNodes();
                for (let i = 0; i < selected.length; i++) {
                    const nodeId = selected[i];
                    container.nodesDataSet.update({ id: nodeId, physics: true });
                }
                console.log("Physics riattivata sui nodi selezionati:", selected);
                menu.style.display = "none";
            };

        });

        document.addEventListener("click", function (e) {
            const menu = document.getElementById("contextMenu");
            if (!menu) return;

            // Se clicchi fuori dal menù, lo nascondi
            if (menu.style.display === "block" && !menu.contains(e.target)) {
                menu.style.display = "none";
            }
        });
    },
    addNode: function (elementId, node) {
        console.log("[addNode]");
        const container = document.getElementById(elementId);
        if (container && container.nodesDataSet) {

            let titleEl = null;
            titleEl = document.createElement("div");
            titleEl.innerHTML = htmlDecode(node.title);
            node.title = titleEl;

            container.nodesDataSet.add(node);
        } else {
            console.error("Container non trovato: " + elementId);
        }
    },
    addEdge: function (elementId, edge) {
        console.log("[addEdge]");
        const container = document.getElementById(elementId);
        if (container && container.edgesDataSet) {
            container.edgesDataSet.add(edge);
        } else {
            console.error("Container non trovato: " + elementId);
        }
    },
    selectNodes: function (elementId, nodes) {
        console.log("[selectNodes]");
        const container = document.getElementById(elementId);
        if (container && container.networkInstance && container.nodesDataSet) {
            const existingNodeIds = container.nodesDataSet.getIds();
            const existingNodeIdMap = new Map(existingNodeIds.map(id => [id?.toString(), id]));
            const validNodeIds = (nodes || [])
                .map(id => existingNodeIdMap.get(id?.toString()))
                .filter(id => id !== undefined);

            if ((nodes || []).length !== validNodeIds.length) {
                console.warn("[selectNodes] Alcuni node id non esistono nel grafo e sono stati ignorati", nodes);
            }

            container.networkInstance.selectNodes(validNodeIds);
        } else {
            console.error("Container non trovato: " + elementId);
        }
    },
    selectEdges: function (elementId, edges) {
        console.log("[selectEdges]");
        const container = document.getElementById(elementId);
        if (container && container.networkInstance && container.edgesDataSet) {
            const existingEdgeIds = container.edgesDataSet.getIds();
            const existingEdgeIdMap = new Map(existingEdgeIds.map(id => [id?.toString(), id]));
            const validEdgeIds = (edges || [])
                .map(id => existingEdgeIdMap.get(id?.toString()))
                .filter(id => id !== undefined);

            if ((edges || []).length !== validEdgeIds.length) {
                console.warn("[selectEdges] Alcuni edge id non esistono nel grafo e sono stati ignorati", edges);
            }

            container.networkInstance.selectEdges(validEdgeIds);
        } else {
            console.error("Container non trovato: " + elementId);
        }
    },
    destroy: function (elementId) {
        console.log("[destroy]");
        const container = document.getElementById(elementId);
        if (container && container.networkInstance) {
            container.networkInstance.destroy();
        } else {
            console.error("Container non trovato: " + elementId);
        }
    },
    fit: function (elementId) {
        console.log("[fit]");
        const container = document.getElementById(elementId);
        if (container && container.networkInstance) {
            container.networkInstance.fit();
        }
        
    },
    keepVisibleNodes: function (elementId, visibleNodeIds) {
        console.log("[keepVisibleNodes]");
        const container = document.getElementById(elementId);
        if (!container || !container.nodesDataSet || !container.edgesDataSet) {
            console.error("Container non trovato: " + elementId);
            return;
        }

        const getNodeType = function (node) {
            return (node?.node_type || node?.nodeType || node?.NodeType || "").toString().toLowerCase();
        };

        const allNodes = container.nodesDataSet.get();
        let documentNodes = allNodes.filter(node => getNodeType(node) === "document");
        if (documentNodes.length === 0 && allNodes.length > 0) {
            console.warn("[keepVisibleNodes] Nessun nodo con type=document rilevato, uso fallback su tutti i nodi");
            documentNodes = allNodes;
        }

        const documentIdsSet = new Set(documentNodes.map(node => node?.id?.toString()).filter(Boolean));
        const requestedVisibleIds = (visibleNodeIds || []).map(x => x?.toString()).filter(Boolean);
        const visibleIdsSet = new Set(requestedVisibleIds.filter(id => documentIdsSet.has(id)));
        const addedConnectedIdsSet = new Set();
        const allEdges = container.edgesDataSet.get();

        for (let i = 0; i < allEdges.length; i++) {
            const edge = allEdges[i];
            const fromId = edge?.from?.toString();
            const toId = edge?.to?.toString();

            if (visibleIdsSet.has(fromId) && toId && documentIdsSet.has(toId)) {
                addedConnectedIdsSet.add(toId);
            }

            if (visibleIdsSet.has(toId) && fromId && documentIdsSet.has(fromId)) {
                addedConnectedIdsSet.add(fromId);
            }
        }

        const updates = [];

        for (let i = 0; i < documentNodes.length; i++) {
            const node = documentNodes[i];
            const nodeId = node?.id?.toString();
            const isExplicitlyVisible = visibleIdsSet.has(nodeId);
            const isConnectedToVisible = addedConnectedIdsSet.has(nodeId);
            const mustBeVisible = isExplicitlyVisible || (node.isAdded === true && isConnectedToVisible);

            updates.push({
                id: node.id,
                hidden: !mustBeVisible
            });
        }

        if (updates.length > 0) {
            container.nodesDataSet.update(updates);
        }
    },

};
