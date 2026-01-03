# TVLoo - Addon Stremio IPTV

Addon IPTV générique pour Stremio permettant de lire des playlists M3U/M3U8 avec support EPG (Guide des Programmes).

## Avertissement / Disclaimer

**CE LOGICIEL EST FOURNI "TEL QUEL", SANS GARANTIE D'AUCUNE SORTE, EXPRESSE OU IMPLICITE.**

Cet addon est créé **strictement à des fins éducatives et personnelles uniquement**. Les développeurs de cet addon :

- **NE** fournissent, hébergent ou distribuent **AUCUN** contenu média
- **NE** contrôlent ou n'exploitent **AUCUNE** source de streaming
- **NE SONT PAS** responsables du contenu accessible via les playlists M3U fournies par l'utilisateur
- **N'encouragent PAS** et ne cautionnent pas le piratage ou la violation du droit d'auteur

**L'utilisation de cet addon est entièrement à vos propres risques.** Les utilisateurs sont seuls responsables de :

- La légalité du contenu auquel ils accèdent
- La conformité avec les lois et réglementations locales
- Les URLs de playlists M3U qu'ils configurent

Cet addon parse simplement les URLs de playlists M3U fournies par l'utilisateur et les affiche dans un format compatible Stremio. C'est une démonstration technique de création d'addon Stremio avec Node.js et le SDK Stremio Addon.

**En utilisant cet addon, vous acceptez de ne l'utiliser que pour accéder à du contenu que vous avez légalement le droit de visionner.**

---

## Fonctionnalités

- Lecture de n'importe quelle playlist M3U/M3U8
- Support EPG (Guide des Programmes) via XMLTV
- Affichage du programme en cours et à venir
- Fonction de recherche
- Logos et métadonnées des chaînes
- Nom de catalogue personnalisable
- Cache M3U 30 min / Cache EPG 1h

## Prérequis

- Node.js 14+
- npm

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/Loo-stick/stremio-addon-tvloo.git
cd stremio-addon-tvloo

# Installer les dépendances
npm install

# Créer le fichier de configuration
cp .env.example .env

# Éditer .env avec vos paramètres
nano .env
```

## Configuration

Créez un fichier `.env` avec les variables suivantes :

```env
# Port (optionnel, défaut: 7000)
PORT=7000

# URL de la playlist M3U (OBLIGATOIRE)
TVLOO_M3U_URL=https://votre-url-playlist-m3u.m3u

# URL EPG/XMLTV (optionnel, active le guide des programmes)
TVLOO_EPG_URL=https://votre-url-epg.xml

# Nom personnalisé du catalogue (optionnel, défaut: "TV Channels")
TVLOO_CATALOG_NAME=Ma TV
```

### Notes Importantes

- `TVLOO_M3U_URL` est **obligatoire** - l'addon ne démarrera pas sans
- Utilisez les URLs **raw** pour les fichiers hébergés sur GitHub (`raw.githubusercontent.com` au lieu de `github.com`)
- L'URL EPG est optionnelle mais recommandée pour une meilleure expérience
- `TVLOO_CATALOG_NAME` permet de personnaliser le nom de la catégorie affichée dans Stremio

## Utilisation

### Développement Local

```bash
npm start
```

L'addon sera disponible à :
- Manifest : `http://localhost:7000/manifest.json`
- Lien Stremio : `stremio://localhost:7000/manifest.json`

### Déployer sur Render

1. Créez un nouveau Web Service sur [Render](https://render.com)
2. Connectez votre dépôt GitHub
3. Configurez :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
4. Ajoutez les variables d'environnement :
   - `TVLOO_M3U_URL` : Votre URL de playlist M3U
   - `TVLOO_EPG_URL` : Votre URL EPG (optionnel)
   - `TVLOO_CATALOG_NAME` : Nom personnalisé (optionnel)

### Déployer sur Heroku

```bash
heroku create nom-de-votre-addon
heroku config:set TVLOO_M3U_URL=votre-url-m3u
heroku config:set TVLOO_EPG_URL=votre-url-epg
git push heroku main
```

## Structure du Projet

```
stremio-addon-tvloo/
├── index.js          # Point d'entrée, handlers Stremio
├── config.js         # Gestion de la configuration
├── m3uParser.js      # Parser de playlist M3U avec cache
├── epgParser.js      # Parser EPG XMLTV avec cache
├── package.json      # Dépendances
├── .env.example      # Template des variables d'environnement
├── .gitignore        # Règles Git ignore
└── README.md         # Ce fichier
```

## Endpoints API

| Endpoint | Description |
|----------|-------------|
| `/manifest.json` | Manifest de l'addon pour Stremio |
| `/catalog/tv/tvloo-channels.json` | Catalogue des chaînes |
| `/meta/tv/{id}.json` | Métadonnées d'une chaîne |
| `/stream/tv/{id}.json` | URL du stream |

## Détails Techniques

- Construit avec [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk)
- Utilise Axios pour les requêtes HTTP
- Durée du cache M3U : 30 minutes
- Durée du cache EPG : 1 heure
- Support recherche et pagination

## Format M3U Supporté

L'addon supporte le format standard M3U/M3U8 avec attributs étendus :

```m3u
#EXTM3U
#EXTINF:-1 tvg-id="channel.id" tvg-name="Nom Chaîne" tvg-logo="http://logo.png" group-title="Catégorie",Nom Chaîne
http://url-du-stream.m3u8
```

## Licence

Licence MIT - Voir [LICENSE](LICENSE) pour les détails.

## Mentions Légales

Ce projet est fourni à des fins éducatives uniquement. Les développeurs n'assument aucune responsabilité quant à l'utilisation de ce logiciel. Les utilisateurs doivent s'assurer de respecter toutes les lois applicables dans leur juridiction.

**Aucun contenu média n'est fourni, hébergé ou distribué par cet addon.**
