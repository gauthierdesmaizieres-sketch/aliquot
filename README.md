# Aliquot

Anciennement « Paillasse ».

Application photo de labo (FR/DE).

- **Envoi temporaire** (page d'accueil) : le PC affiche un QR, le téléphone le scanne et envoie ses photos, sans compte. Effacement après 24 h ou avec « Terminer ».
- **Réactions** : frise de photos, couleur, notes, CCM avec Rf, rapport PDF, export Excel, étiquette QR de sécurité.
- **Réactifs** : lecture de l'étiquette (code GS1 puis texte), profils fournisseurs, péremption, CoA, export Excel.

Sans configuration, l'app tourne en **mode démo** : tout reste dans le navigateur.

## Essayer en local

```bash
python -m http.server 8765 -d labphoto
```

Puis ouvrir http://localhost:8765

## Projet en ligne

- Site : https://gauthierdesmaizieres-sketch.github.io/aliquot/ (GitHub Pages, branche `main`).
- Lecture IA des étiquettes : fonction Supabase `read-label` (`supabase/functions/read-label/index.ts`), clé dans le secret Supabase `GEMINI_API_KEY`.
- Base : projet Supabase « Lab Photo » (`config.js`). Les schémas `schema.sql` et `transfer.sql` y sont déjà appliqués.
- Connexion : e-mail + mot de passe. Le lien de confirmation n'est à cliquer qu'une fois, à la création du compte.

## Ajouter un membre de l'équipe

Dans Supabase > SQL Editor (e-mail en minuscules) :

```sql
insert into public.team (email) values ('collegue@labo.ch');
```

La personne ouvre ensuite l'app et clique sur « Créer mon compte ».

## Sécurité des données

- Seuls les e-mails de la table `team` voient les réactions et les photos.
- La page du QR s'ouvre sans compte, mais uniquement avec le jeton du QR. Elle montre le n° de réaction et
  les champs de sécurité, jamais le titre, les réactifs ou les photos.
- Les consignes de sécurité sont saisies par l'équipe. L'étiquette reste marquée BROUILLON tant que
  « Sécurité vérifiée par » est vide.

## Tests

```bash
node labphoto/rf.test.mjs
node labphoto/label.test.mjs
```
