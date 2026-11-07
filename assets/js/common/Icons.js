/*!
 * Icons — bibliothèque d'icônes SVG monochromes pour l'interface.
 *
 * Principe : un jeu d'icônes « ligne » (grille 24×24, trait 1,75, bouts arrondis),
 * injecté une seule fois dans le document sous forme de sprite <symbol>.
 *
 * Utilisation dans le HTML :
 *     <svg class="icon" aria-hidden="true"><use href="#i-pen"></use></svg>
 *
 * Utilisation depuis le JS :
 *     element.innerHTML = Icons.html('check');
 *     Icons.set(element, 'trash');       // remplace le contenu par une icône
 *
 * La couleur et l'épaisseur du trait se contrôlent en CSS (currentColor),
 * exactement comme un glyph de police : aucune dépendance, aucun réseau.
 */
(function (window, document) {
    'use strict';

    /* Géométrie pure : chaque valeur est le contenu interne d'un <symbol>. */
    var PATHS = {
        /* Marque */
        board:
            '<rect x="2.75" y="3.75" width="18.5" height="13" rx="2.4"/>' +
            '<path d="M12 16.75v2.75"/>' +
            '<path d="M8.5 21.5h7"/>' +
            '<path d="m6.6 12.6 3.1-3.1 2.6 2.6 4.6-4.6"/>',

        /* Outils de dessin */
        pen:
            '<g transform="rotate(-45 12 12)">' +
            '<rect x="7" y="9.2" width="11.5" height="5.6" rx="1.2"/>' +
            '<path d="M7 9.2 3.4 12l3.6 2.8"/>' +
            '</g>',
        eraser:
            '<g transform="rotate(-45 12 12.5)">' +
            '<rect x="5.5" y="9.5" width="13" height="6" rx="2"/>' +
            '<path d="M10.5 9.5v6"/>' +
            '</g>',
        pointer:
            '<path d="M5.5 3.5 19 11.6l-6 1.6-1.9 6L5.5 3.5Z"/>',
        line:
            '<path d="M5.5 18.5 18.5 5.5"/>' +
            '<circle cx="5.5" cy="18.5" r="1.5" fill="currentColor" stroke="none"/>' +
            '<circle cx="18.5" cy="5.5" r="1.5" fill="currentColor" stroke="none"/>',
        circle:
            '<circle cx="12" cy="12" r="8.5"/>',
        rect:
            '<rect x="3.5" y="6" width="17" height="12" rx="1.5"/>',
        triangle:
            '<path d="M12 4 20.5 19.5h-17L12 4Z"/>',
        arrow:
            '<path d="M5.5 18.5 18.5 5.5"/>' +
            '<path d="M11 5.5h7.5V13"/>',
        text:
            '<path d="M5.5 7V5.5h13V7"/>' +
            '<path d="M12 5.5v13"/>' +
            '<path d="M9 18.5h6"/>',

        /* Historique */
        undo:
            '<path d="M3.5 8h9.5a5 5 0 0 1 0 10H9"/>' +
            '<path d="m7.5 4-4 4 4 4"/>',
        redo:
            '<path d="M20.5 8H11a5 5 0 0 0 0 10h4"/>' +
            '<path d="m16.5 4 4 4-4 4"/>',

        /* Fichiers / export */
        image:
            '<rect x="3" y="4.5" width="18" height="15" rx="2"/>' +
            '<circle cx="8.5" cy="9.5" r="1.5"/>' +
            '<path d="m20.5 15.5-4.5-4.5L6.5 20.5"/>',
        vector:
            '<path d="M4.5 20.5C4.5 10 8.5 4.5 20 4.5"/>' +
            '<rect x="2.8" y="18.8" width="3.4" height="3.4" rx=".6"/>' +
            '<rect x="18" y="2.8" width="3.4" height="3.4" rx=".6"/>',
        braces:
            '<path d="M9.5 3.5H8A2.5 2.5 0 0 0 5.5 6v3.2A2.8 2.8 0 0 1 2.7 12a2.8 2.8 0 0 1 2.8 2.8V18A2.5 2.5 0 0 0 8 20.5h1.5"/>' +
            '<path d="M14.5 3.5H16A2.5 2.5 0 0 1 18.5 6v3.2A2.8 2.8 0 0 0 21.3 12a2.8 2.8 0 0 0-2.8 2.8V18a2.5 2.5 0 0 1-2.5 2.5h-1.5"/>',
        folder:
            '<path d="M4 19.5V6a2 2 0 0 1 2-2h3.2a2 2 0 0 1 1.6.8l1.4 1.9H18a2 2 0 0 1 2 2v2.4"/>' +
            '<path d="M3.2 19.5l2.2-7.3A2 2 0 0 1 7.3 10.8h12a1.8 1.8 0 0 1 1.72 2.34l-1.86 6.36H3.2Z"/>',
        trash:
            '<path d="M4 6.5h16"/>' +
            '<path d="M9.5 6.5V4.6a1.1 1.1 0 0 1 1.1-1.1h2.8a1.1 1.1 0 0 1 1.1 1.1v1.9"/>' +
            '<path d="M6.3 6.5 7.3 19.9a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l1-13.4"/>' +
            '<path d="M10.5 10.5v6.5"/>' +
            '<path d="M13.5 10.5v6.5"/>',

        /* Interface */
        sliders:
            '<path d="M4 7h8.5"/><path d="M17 7h3"/><circle cx="14.75" cy="7" r="2.1"/>' +
            '<path d="M4 17h3.5"/><path d="M12 17h8"/><circle cx="9.75" cy="17" r="2.1"/>',
        qr:
            '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2"/>' +
            '<rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2"/>' +
            '<rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2"/>' +
            '<path d="M14 14h3v3h-3z"/>' +
            '<path d="M20.5 14v3"/>' +
            '<path d="M14 20.5h3"/>' +
            '<path d="M20.5 19.5v1"/>',
        check:
            '<path d="m5 12.5 4.5 4.5L19 6.5"/>',
        x:
            '<path d="M6.5 6.5l11 11"/>' +
            '<path d="M17.5 6.5l-11 11"/>',
        terminal:
            '<path d="m5.5 8 4 4-4 4"/>' +
            '<path d="M12.5 16.5h6"/>',
        plus:
            '<path d="M12 5.5v13"/>' +
            '<path d="M5.5 12h13"/>',
        minus:
            '<path d="M5.5 12h13"/>',
        chevron:
            '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
        battery:
            '<rect x="2.5" y="7.5" width="16" height="9" rx="2.5"/>' +
            '<path d="M21.5 10.5v3"/>' +
            '<rect x="4.9" y="9.9" width="8.6" height="4.2" rx="1.2" fill="currentColor" stroke="none"/>',
        smartphone:
            '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/>' +
            '<path d="M10.5 18.5h3"/>',
        monitor:
            '<rect x="2.5" y="4" width="19" height="12.5" rx="2"/>' +
            '<path d="M8.5 20.5h7"/>' +
            '<path d="M12 16.5v4"/>'
    };

    var SPRITE_ID = 'sw-icon-sprite';

    function buildSprite() {
        var out = '';
        for (var name in PATHS) {
            if (!Object.prototype.hasOwnProperty.call(PATHS, name)) continue;
            out += '<symbol id="i-' + name + '" viewBox="0 0 24 24">' + PATHS[name] + '</symbol>';
        }
        return out;
    }

    function mount() {
        if (document.getElementById(SPRITE_ID)) return;
        var host = document.body || document.documentElement;
        if (!host) return;
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', SPRITE_ID);
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
        svg.innerHTML = buildSprite();
        host.insertBefore(svg, host.firstChild);
    }

    function has(name) {
        return Object.prototype.hasOwnProperty.call(PATHS, name);
    }

    /* Balisage prêt à insérer (innerHTML) : <svg class="icon">…</svg> */
    function html(name, className) {
        return '<svg class="icon' + (className ? ' ' + className : '') +
            '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
    }

    /* Remplace le contenu d'un élément par une icône (DOM déjà monté). */
    function set(element, name, className) {
        if (!element) return element;
        element.innerHTML = html(name, className);
        return element;
    }

    window.Icons = {
        names: Object.keys(PATHS),
        has: has,
        html: html,
        set: set,
        mount: mount
    };

    mount();
})(window, document);
