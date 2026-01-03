/**
 * TVLoo - Addon Stremio
 *
 * Generic IPTV addon for M3U playlists
 * with EPG (Electronic Program Guide) support
 */

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const config = require('./config');
const { fetchChannels, clearCache, getCacheStats } = require('./m3uParser');
const { fetchEpg, getCurrentProgram, getNextProgram, formatTime, clearEpgCache, getEpgCacheStats } = require('./epgParser');

// Vérifier la configuration
if (!config.M3U_URL) {
    console.error('[TVLoo] ERREUR: TVLOO_M3U_URL non définie');
    console.error('[TVLoo] Créez un fichier .env avec TVLOO_M3U_URL=votre_url_m3u');
    process.exit(1);
}

console.log('[TVLoo] Initialisation...');

const builder = new addonBuilder(config.manifest);

/**
 * Construit la description avec le programme en cours
 */
function buildDescription(channel, epgData) {
    const parts = [];

    // Groupe/catégorie
    if (channel.group) {
        parts.push(`📺 ${channel.group}`);
    }

    // Programme en cours
    if (epgData && channel.tvgId) {
        const current = getCurrentProgram(epgData, channel.tvgId);
        if (current) {
            parts.push(`\n▶️ ${current.title}`);
            parts.push(`   ${formatTime(current.start)} - ${formatTime(current.stop)}`);

            // Prochain programme
            const next = getNextProgram(epgData, channel.tvgId);
            if (next) {
                parts.push(`\n⏭️ ${formatTime(next.start)} : ${next.title}`);
            }
        }
    }

    return parts.length > 0 ? parts.join('\n') : '📺 TV';
}

// Handler pour le catalogue
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    if (type !== 'tv' || id !== 'tvloo-channels') {
        return { metas: [] };
    }

    try {
        // Charger channels et EPG en parallèle
        const [channels, epgData] = await Promise.all([
            fetchChannels(),
            config.EPG_URL ? fetchEpg() : Promise.resolve(null)
        ]);

        let metas = channels.map(channel => ({
            id: channel.id,
            type: 'tv',
            name: channel.name,
            poster: channel.logo || config.manifest.logo,
            posterShape: 'square',
            background: channel.logo || config.manifest.logo,
            logo: channel.logo || config.manifest.logo,
            description: buildDescription(channel, epgData)
        }));

        // Filtrage par recherche
        if (extra && extra.search) {
            const searchTerm = extra.search.toLowerCase();
            metas = metas.filter(meta =>
                meta.name.toLowerCase().includes(searchTerm)
            );
        }

        // Pagination
        const skip = parseInt(extra?.skip) || 0;
        const limit = 50;
        metas = metas.slice(skip, skip + limit);

        return { metas };

    } catch (error) {
        console.error('[TVLoo] Erreur catalogue:', error.message);
        return { metas: [] };
    }
});

// Handler pour les métadonnées
builder.defineMetaHandler(async ({ type, id }) => {
    if (type !== 'tv' || !id.startsWith('tvloo-')) {
        return { meta: null };
    }

    try {
        // Charger channels et EPG en parallèle
        const [channels, epgData] = await Promise.all([
            fetchChannels(),
            config.EPG_URL ? fetchEpg() : Promise.resolve(null)
        ]);

        const channel = channels.find(ch => ch.id === id);

        if (!channel) {
            return { meta: null };
        }

        return {
            meta: {
                id: channel.id,
                type: 'tv',
                name: channel.name,
                poster: channel.logo || config.manifest.logo,
                posterShape: 'square',
                background: channel.logo || config.manifest.logo,
                logo: channel.logo || config.manifest.logo,
                description: buildDescription(channel, epgData)
            }
        };

    } catch (error) {
        console.error('[TVLoo] Erreur meta:', error.message);
        return { meta: null };
    }
});

// Handler pour les streams
builder.defineStreamHandler(async ({ type, id }) => {
    if (type !== 'tv' || !id.startsWith('tvloo-')) {
        return { streams: [] };
    }

    try {
        // Charger channels et EPG en parallèle
        const [channels, epgData] = await Promise.all([
            fetchChannels(),
            config.EPG_URL ? fetchEpg() : Promise.resolve(null)
        ]);

        const channel = channels.find(ch => ch.id === id);

        if (!channel) {
            return { streams: [] };
        }

        // Construire le titre avec programme en cours
        let streamTitle = channel.name;
        if (epgData && channel.tvgId) {
            const current = getCurrentProgram(epgData, channel.tvgId);
            if (current) {
                streamTitle += `\n▶️ ${current.title}`;
            }
        }
        if (channel.group) {
            streamTitle += `\n📺 ${channel.group}`;
        }

        return {
            streams: [
                {
                    name: 'TVLoo',
                    title: streamTitle,
                    url: channel.url,
                    behaviorHints: {
                        notWebReady: true
                    }
                }
            ]
        };

    } catch (error) {
        console.error('[TVLoo] Erreur stream:', error.message);
        return { streams: [] };
    }
});

// Démarrage du serveur
serveHTTP(builder.getInterface(), { port: config.PORT });

console.log(`[TVLoo] Serveur démarré sur le port ${config.PORT}`);
