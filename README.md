# Audit digital — Broad Range Consulting Group

Tableau de bord (frontend uniquement, Next.js) des publications du groupe sur les réseaux sociaux :
CGA (Centre de Gestion Agréé), CFP (Centre de Formation Professionnelle), Gathe Finance.

## Lancer en local

```bash
pnpm install
pnpm dev
```

## Données

Les collectes brutes sont dans `Docs/audit/` :

| Fichier | Contenu |
|---|---|
| `facebook-screens-1.json`, `facebook-screens-2.json` | Catalogue des captures `Docs/publications-facebook-blog/` (page Facebook du CGA) |
| `social.json` | Facebook (CGA, CFP, Gathe), Instagram, LinkedIn, X, Maligah |
| `youtube.json` | Chaîne YouTube : vidéos, shorts, posts communauté |
| `constats.json` | Constats qualitatifs rédigés pendant l'audit |

Après toute modification de ces fichiers, régénérer le fichier lu par l'application :

```bash
pnpm data   # écrit data/audit.json
```

Les vidéos YouTube archivées (`Docs/publications-youtube/`) restent en local et sont exclues de git.

## Déploiement

Importer le dépôt sur Vercel, sans configuration particulière : la page est générée en statique.
