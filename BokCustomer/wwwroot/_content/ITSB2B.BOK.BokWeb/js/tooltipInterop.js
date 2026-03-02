window.tooltipInterop = {
    // --- hover delay state (solo per Element) ---
    _hoverTimer: null,
    _hoverId: null,
    _page: 'Element',
    _ontologicalClickTimer: null,

    _getHelperAiAgent: function () {
        return (typeof getDotNetHelper === 'function')
            ? getDotNetHelper('aiAgent', ['aiAgentMA'])
            : DotNetHelper;
    },

    _getHelperElement: function () {
        return (typeof getDotNetHelper === 'function')
            ? getDotNetHelper('element')
            : DotNetHelper;
    },

    _calcPos: function (event, menuHeight) {
        var mouseX = event.clientX;
        var mouseY = event.clientY;
        var windowHeight = window.innerHeight;

        var top = mouseY;
        var right = mouseX;

        if (mouseY + menuHeight > windowHeight) {
            top = windowHeight - menuHeight - 10;
            if (top < 0) top = 0;
            right += 50;
        }

        return { right, top };
    },

    _isInsideOntologicalDialog: function (event) {
        const target = event?.target;
        if (!target || typeof target.closest !== 'function') {
            return false;
        }

        // Syncfusion dialog content/root for the ontological tooltip
        return !!target.closest('#OntologicalTooltip');
    },

    setPage: function (page) {
        this._page = page;
        console.log("Settato helper su "+page);
    },

    // --- hover delay helpers (solo per Element) ---
    _startHoverTimer: function (id, event, menuHeight, callback) {
        this._clearHoverTimer();
        this._hoverId = id;

        this._hoverTimer = setTimeout(() => {
            if (this._hoverId === id) {
                callback.call(this, id, event, menuHeight);
            }
        }, 500);
    },

    _clearHoverTimer: function () {
        if (this._hoverTimer) {
            clearTimeout(this._hoverTimer);
            this._hoverTimer = null;
        }
        this._hoverId = null;
    },

    // --- API: TOOLTIP "Element" (hover) ---
    showTooltipElement: function (id, event, menuHeight = 600) {
        const helper = this._getHelperAiAgent();
        if (!helper) {
            console.error("dotNetHelper non è inizializzato!");
            return;
        }

        this._startHoverTimer(id, event, menuHeight, function (id, event, menuHeight) {
            const pos = this._calcPos(event, menuHeight);
            helper.invokeMethodAsync('ShowTooltipElement', id, pos.right, pos.top);
        });
    },

    hideTooltipElement: function () {
        this._clearHoverTimer();

        const helper = this._getHelperAiAgent();
        if (!helper) {
            console.error("dotNetHelper non è inizializzato!");
            return;
        }
        helper.invokeMethodAsync('HideTooltipElement');
    },

    // --- API: Ontological (SOLO CLICK) ---
    showTooltipOntological: function (id, event, menuHeight = 600) {
        // Con dblclick il browser emette anche click singoli:
        // ritardiamo il click e lo annulliamo se arriva openDetailTooltipOntological.
        if (this._ontologicalClickTimer) {
            clearTimeout(this._ontologicalClickTimer);
            this._ontologicalClickTimer = null;
        }

        this._ontologicalClickTimer = setTimeout(() => {
            // Evita loop/riaperture quando il click avviene dentro la modale stessa
            if (this._isInsideOntologicalDialog(event)) {
                return;
            }

            const helper = this._getHelperElement();
            if (!helper) {
                console.error("dotNetHelper non è inizializzato!");
                return;
            }

            // sicurezza: se avevi hover element in corso, evita side effect
            this._clearHoverTimer();

            if (event?.stopPropagation) event.stopPropagation();
            if (event?.preventDefault) event.preventDefault();

            const pos = this._calcPos(event, menuHeight);
            helper.invokeMethodAsync('ShowTooltipOntological', id, pos.right, pos.top);
            this._ontologicalClickTimer = null;
        }, 220);

    },
    openDetailTooltipOntological: function (id, event, menuHeight = 600) {
        if (this._ontologicalClickTimer) {
            clearTimeout(this._ontologicalClickTimer);
            this._ontologicalClickTimer = null;
        }

        // Evita loop/riaperture quando il doppio click avviene dentro la modale stessa
        if (this._isInsideOntologicalDialog(event)) {
            return;
        }

        const helper = this._getHelperElement();
        if (!helper) {
            console.error("dotNetHelper non è inizializzato!");
            return;
        }

        // sicurezza: se avevi hover element in corso, evita side effect
        this._clearHoverTimer();

        if (event?.stopPropagation) event.stopPropagation();
        if (event?.preventDefault) event.preventDefault();

        const pos = this._calcPos(event, menuHeight);
        helper.invokeMethodAsync('OpenDetailTooltipOntological', id, pos.right, pos.top);
    },

    // opzionale: se vuoi chiudere da un bottone o da Blazor
    closeTooltipOntological: function () {
        const helper = this._page == 'AiAgent' ? this._getHelperAiAgent() : this._getHelperElement();
        if (!helper) {
            console.error("dotNetHelper non è inizializzato!");
            return;
        }
        helper.invokeMethodAsync('HideTooltipOntological');
    },

    openSideBar: function (id) {
        const helper = this._getHelperAiAgent();
        if (!helper) {
            console.error("dotNetHelper non è inizializzato!");
            return;
        }
        helper.invokeMethodAsync('OpenSideBar', id);
    }
};
