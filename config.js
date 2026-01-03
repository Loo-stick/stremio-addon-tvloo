/**
 * Configuration TVLoo Addon
 */

require('dotenv').config();

module.exports = {
    // URL du fichier M3U (obligatoire)
    M3U_URL: process.env.TVLOO_M3U_URL,

    // URL du fichier EPG/XMLTV (optionnel)
    EPG_URL: process.env.TVLOO_EPG_URL,

    // Nom personnalisé du catalogue (optionnel)
    CATALOG_NAME: process.env.TVLOO_CATALOG_NAME || 'TV Channels',

    // Durée du cache M3U en millisecondes (30 minutes)
    CACHE_DURATION: 30 * 60 * 1000,

    // Port du serveur
    PORT: process.env.PORT || 7000,

    // Manifeste de l'addon
    manifest: {
        id: 'com.tvloo.iptv',
        version: '2.1.0',
        name: 'TVLoo',
        description: 'IPTV addon for Stremio - Play M3U playlists with EPG support',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/TV_icon_2.svg/200px-TV_icon_2.svg.png',
        resources: ['catalog', 'meta', 'stream'],
        types: ['tv'],
        catalogs: [
            {
                type: 'tv',
                id: 'tvloo-channels',
                name: process.env.TVLOO_CATALOG_NAME || 'TV Channels',
                extra: [
                    { name: 'search', isRequired: false },
                    { name: 'skip', isRequired: false }
                ]
            }
        ],
        idPrefixes: ['tvloo-']
    }
};
