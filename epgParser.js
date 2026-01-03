/**
 * Parser EPG (XMLTV) pour TV Sports France
 *
 * Télécharge et parse un fichier XMLTV pour afficher
 * le programme en cours sur chaque chaîne
 */

const axios = require('axios');
const config = require('./config');

// Durée du cache EPG (1 heure)
const EPG_CACHE_DURATION = 60 * 60 * 1000;

// Cache en mémoire
let cachedEpg = null;
let epgCacheTime = null;

/**
 * Parse le contenu XMLTV et extrait les programmes
 * @param {string} content - Contenu XML brut
 * @returns {Object} Map des programmes par channel id
 */
function parseXMLTV(content) {
    const programs = {};

    // Extraire tous les programmes
    const programmeRegex = /<programme start="([^"]+)" stop="([^"]+)"[^>]*channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g;
    const titleRegex = /<title[^>]*>([^<]+)<\/title>/;
    const descRegex = /<desc[^>]*>([^<]+)<\/desc>/;
    const categoryRegex = /<category[^>]*>([^<]+)<\/category>/;

    let match;
    while ((match = programmeRegex.exec(content)) !== null) {
        const [, start, stop, channelId, programContent] = match;

        const titleMatch = programContent.match(titleRegex);
        const descMatch = programContent.match(descRegex);
        const categoryMatch = programContent.match(categoryRegex);

        const program = {
            start: parseXMLTVDate(start),
            stop: parseXMLTVDate(stop),
            title: titleMatch ? decodeXMLEntities(titleMatch[1]) : 'Programme inconnu',
            description: descMatch ? decodeXMLEntities(descMatch[1]) : null,
            category: categoryMatch ? decodeXMLEntities(categoryMatch[1]) : null
        };

        // Grouper par channel id
        if (!programs[channelId]) {
            programs[channelId] = [];
        }
        programs[channelId].push(program);
    }

    // Trier les programmes par heure de début
    for (const channelId in programs) {
        programs[channelId].sort((a, b) => a.start - b.start);
    }

    console.log(`[TVLoo EPG] ${Object.keys(programs).length} chaînes parsées`);
    return programs;
}

/**
 * Parse une date XMLTV (format: 20240115183000 +0100)
 * @param {string} dateStr - Date au format XMLTV
 * @returns {Date} Objet Date
 */
function parseXMLTVDate(dateStr) {
    // Format: YYYYMMDDHHmmss +HHMM
    const match = dateStr.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
    if (!match) return new Date();

    const [, year, month, day, hour, min, sec, tz] = match;
    let date = new Date(Date.UTC(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(min),
        parseInt(sec)
    ));

    // Ajuster pour le timezone
    if (tz) {
        const tzHours = parseInt(tz.substring(0, 3));
        const tzMins = parseInt(tz.substring(3));
        date = new Date(date.getTime() - (tzHours * 60 + tzMins) * 60 * 1000);
    }

    return date;
}

/**
 * Décode les entités XML
 * @param {string} str - Chaîne avec entités XML
 * @returns {string} Chaîne décodée
 */
function decodeXMLEntities(str) {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num));
}

/**
 * Récupère l'EPG depuis l'URL (avec cache)
 * @returns {Promise<Object>} Map des programmes
 */
async function fetchEpg() {
    const epgUrl = config.EPG_URL;

    if (!epgUrl) {
        return null;
    }

    const now = Date.now();

    // Retourner le cache si encore valide
    if (cachedEpg && epgCacheTime && (now - epgCacheTime) < EPG_CACHE_DURATION) {
        console.log('[TVLoo EPG] Retour depuis le cache');
        return cachedEpg;
    }

    try {
        console.log('[TVLoo EPG] Téléchargement depuis:', epgUrl);

        const response = await axios.get(epgUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Encoding': 'gzip, deflate'
            }
        });

        cachedEpg = parseXMLTV(response.data);
        epgCacheTime = now;

        return cachedEpg;

    } catch (error) {
        console.error('[TVLoo EPG] Erreur téléchargement:', error.message);
        // Retourner le cache même expiré en cas d'erreur
        if (cachedEpg) {
            console.log('[TVLoo EPG] Utilisation du cache expiré');
            return cachedEpg;
        }
        return null;
    }
}

/**
 * Trouve le programme en cours pour une chaîne
 * @param {Object} epgData - Données EPG
 * @param {string} tvgId - ID de la chaîne (tvg-id du M3U)
 * @returns {Object|null} Programme en cours ou null
 */
function getCurrentProgram(epgData, tvgId) {
    if (!epgData || !tvgId) return null;

    // Essayer plusieurs variantes du tvg-id
    const variants = [
        tvgId,
        tvgId.toLowerCase(),
        tvgId.replace('.fr', ''),
        tvgId.split('.')[0]
    ];

    const now = new Date();

    for (const variant of variants) {
        const programs = epgData[variant];
        if (!programs) continue;

        // Trouver le programme en cours
        const current = programs.find(p => p.start <= now && p.stop > now);
        if (current) {
            return current;
        }
    }

    return null;
}

/**
 * Trouve le prochain programme pour une chaîne
 * @param {Object} epgData - Données EPG
 * @param {string} tvgId - ID de la chaîne
 * @returns {Object|null} Prochain programme ou null
 */
function getNextProgram(epgData, tvgId) {
    if (!epgData || !tvgId) return null;

    const variants = [
        tvgId,
        tvgId.toLowerCase(),
        tvgId.replace('.fr', ''),
        tvgId.split('.')[0]
    ];

    const now = new Date();

    for (const variant of variants) {
        const programs = epgData[variant];
        if (!programs) continue;

        const next = programs.find(p => p.start > now);
        if (next) {
            return next;
        }
    }

    return null;
}

/**
 * Formate l'heure pour l'affichage
 * @param {Date} date - Date à formater
 * @returns {string} Heure formatée (HH:MM)
 */
function formatTime(date) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Vide le cache EPG
 */
function clearEpgCache() {
    cachedEpg = null;
    epgCacheTime = null;
    console.log('[TVLoo EPG] Cache vidé');
}

/**
 * Retourne les stats du cache EPG
 */
function getEpgCacheStats() {
    return {
        hasCachedData: !!cachedEpg,
        channelCount: cachedEpg ? Object.keys(cachedEpg).length : 0,
        cacheAge: epgCacheTime ? Date.now() - epgCacheTime : null,
        cacheExpired: epgCacheTime ? (Date.now() - epgCacheTime) > EPG_CACHE_DURATION : true
    };
}

module.exports = {
    fetchEpg,
    getCurrentProgram,
    getNextProgram,
    formatTime,
    clearEpgCache,
    getEpgCacheStats,
    EPG_CACHE_DURATION
};
