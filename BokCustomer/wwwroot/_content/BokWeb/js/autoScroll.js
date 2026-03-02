window.autoScrollDivToBottom = {
    observer: null,

    enable: function (elementId) {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        let el = document.getElementById(elementId);
        if (!el) return;

        // Subito scrolla giù
        el.scrollTop = el.scrollHeight;

        // Ogni volta che cambia il contenuto, scrolla giù
        this.observer = new MutationObserver(function () {
            el.scrollTop = el.scrollHeight;
        });

        this.observer.observe(el, { childList: true, subtree: true });
    },

    disable: function () {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
};
