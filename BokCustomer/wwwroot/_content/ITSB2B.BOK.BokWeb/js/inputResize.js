window.resizeHeight = (el) => {
    // resettiamo l’altezza per far ricalcolare scrollHeight
    el.style.height = 'auto';
    // poi impostiamo altezza pari al contenuto
    el.style.height = `${el.scrollHeight}px`;
};

window.resizeImageBase64 = (b64Str, maxWidth, maxHeight) => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Ridimensiona solo se supera i max
            if (width > maxWidth || height > maxHeight) {
                const aspect = width / height;
                if (width / height > maxWidth / maxHeight) {
                    width = maxWidth;
                    height = Math.round(maxWidth / aspect);
                } else {
                    height = maxHeight;
                    width = Math.round(maxHeight * aspect);
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Converte sempre in JPEG con qualità 0.9
            canvas.toBlob((blob) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result.split(',')[1];
                    resolve(base64String);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.9);
        };

        img.onerror = reject;

        // Non serve specificare il contentType originale, lo forziamo a JPEG
        img.src = `data:image/*;base64,${b64Str}`;
    });
};
