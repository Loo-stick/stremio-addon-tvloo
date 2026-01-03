/**
 * Parseur M3U pour TV Sports France
 *
 * Télécharge et parse un fichier M3U depuis une URL distante
 * avec gestion de cache intelligent
 */

const axios = require('axios');
const config = require('./config');

// Cache en mémoire
let cachedChannels = null;
let cacheTime = null;

/**
 * Parse le contenu M3U et extrait les chaînes
 * @param {string} content - Contenu brut du fichier M3U
 * @returns {Array} Liste des chaînes parsées
 */
function parseM3U(content) {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('#EXTINF:')) {
            currentChannel = {};

            // Extraire tvg-name (nom propre de la chaîne)
            const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
            if (tvgNameMatch) {
                currentChannel.tvgName = tvgNameMatch[1];
            }

            // Extraire l'ID tvg-id
            const idMatch = line.match(/tvg-id="([^"]*)"/);
            if (idMatch) {
                currentChannel.tvgId = idMatch[1];
            }

            // Extraire le logo
            const logoMatch = line.match(/tvg-logo="([^"]*)"/);
            if (logoMatch) {
                currentChannel.logo = logoMatch[1];
            }

            // Extraire le groupe
            const groupMatch = line.match(/group-title="([^"]*)"/);
            if (groupMatch) {
                currentChannel.group = groupMatch[1];
            }

            // Extraire le nom après la DERNIÈRE virgule (fallback)
            const lastCommaIndex = line.lastIndexOf(',');
            if (lastCommaIndex !== -1) {
                currentChannel.displayName = line.substring(lastCommaIndex + 1).trim();
            }

            // Utiliser tvg-name en priorité, sinon displayName
            currentChannel.name = currentChannel.tvgName || currentChannel.displayName || 'Chaîne inconnue';

        } else if (line && !line.startsWith('#') && currentChannel) {
            // C'est l'URL du stream
            currentChannel.url = line;
            currentChannel.id = 'tvloo-' + Buffer.from(currentChannel.name || Date.now().toString()).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
            channels.push(currentChannel);
            currentChannel = null;
        }
    }

    return channels;
}

/**
 * Récupère les chaînes depuis le fichier M3U (avec cache)
 * @returns {Promise<Array>} Liste des chaînes
 */
async function fetchChannels() {
    const m3uUrl = config.M3U_URL;

    if (!m3uUrl) {
        console.error('[TVLoo] URL M3U non configurée');
        return [];
    }

    const now = Date.now();

    // Retourner le cache si encore valide
    if (cachedChannels && cacheTime && (now - cacheTime) < config.CACHE_DURATION) {
        console.log('[TVLoo] Retour des chaînes depuis le cache');
        return cachedChannels;
    }

    try {
        console.log('[TVLoo] Téléchargement du fichier M3U depuis:', m3uUrl);

        const response = await axios.get(m3uUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        cachedChannels = parseM3U(response.data);
        cacheTime = now;

        console.log(`[TVLoo] ${cachedChannels.length} chaînes trouvées`);
        return cachedChannels;

    } catch (error) {
        console.error('[TVLoo] Erreur téléchargement M3U:', error.message);
        // Retourner le cache même expiré en cas d'erreur
        if (cachedChannels) {
            console.log('[TVLoo] Utilisation du cache expiré');
            return cachedChannels;
        }
        return [];
    }
}

/**
 * Vide le cache
 */
function clearCache() {
    cachedChannels = null;
    cacheTime = null;
    console.log('[TVLoo] Cache M3U vidé');
}

/**
 * Retourne les statistiques du cache
 */
function getCacheStats() {
    return {
        hasCachedData: !!cachedChannels,
        channelCount: cachedChannels ? cachedChannels.length : 0,
        cacheAge: cacheTime ? Date.now() - cacheTime : null,
        cacheExpired: cacheTime ? (Date.now() - cacheTime) > config.CACHE_DURATION : true
    };
}

module.exports = {
    fetchChannels,
    clearCache,
    getCacheStats
};
