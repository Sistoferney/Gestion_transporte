// Leaflet JS v1.9.4 - https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
// Este archivo es solo un proxy para cargar Leaflet desde CDN.
// Si necesitas trabajar offline, descarga el archivo desde la URL y colócalo aquí.

// Carga dinámica desde CDN:
(function() {
    if (!window.L) {
        var script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        document.head.appendChild(script);
    }
})();
