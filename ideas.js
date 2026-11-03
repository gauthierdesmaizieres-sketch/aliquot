import { t } from './i18n.js';
import { app, h, topbar, langSwitch, tabs } from './ui.js';

// Liste des évolutions prévues, avec leur état. Mise à jour à la main.
const IDEAS = [
  ['Ctrl+V sur une réaction', 'fait', 'Coller une capture d’écran crée une note avec l’image.'],
  ['Lecture des étiquettes par IA (Gemini)', 'à tester', 'Active dès la connexion : remplit produit, référence, CAS, lot et péremption à partir de la photo. Repli sur la lecture locale si l’IA échoue.'],
  ['Héberger sans Netlify : GitHub Pages + Supabase', 'v2', 'Fin des crédits Netlify (chaque mise en ligne en coûte). Site sur GitHub Pages, fonction IA dans Supabase Edge Functions (clé Gemini en secret Supabase). Même compte et mot de passe. À prévoir : nouvelle adresse, réimprimer le QR d’entrée, ajouter l’adresse dans Supabase Auth.'],
  ['Pré-remplir le tableau de réactifs depuis un screenshot Signals', 'idée', 'Lit noms, MW, équivalents, masses et moles. Contrôle : masse ÷ MW doit donner les moles.'],
  ['Reconnaissance des structures chimiques : DECIMER et MolScribe', 'idée', 'Convertissent un dessin de molécule en SMILES. À installer sur un serveur ; résultat à vérifier.'],
  ['Lecture du journal Signals ELN (API REST)', 'idée', 'Clé API stockée côté serveur, jamais dans le navigateur. À valider par l’IT du labo.'],
  ['Plan du labo minimaliste (étage complet)', 'idée', 'Postes, hottes et zones seulement, sans bureaux. Affectation hotte ↔ poste à confirmer.'],
  ['Export Excel automatique des réactifs', 'idée', 'Ajouter une ligne par réactif scanné, sans cliquer sur Exporter.'],
];

export function ideasView() {
  app.replaceChildren(
    topbar(h('h1', {}, t('ideas')), langSwitch()),
    h('main', {}, tabs('ideas'),
      h('p', { class: 'muted' }, 'Évolutions possibles et leur état. Rien ici n’est activé par défaut.'),
      IDEAS.map(([title, state, text]) => h('div', { class: 'card' },
        h('div', { class: 'card-top' }, h('strong', {}, title), h('span', { class: 'pill' }, state)),
        h('p', { class: 'muted' }, text)))),
  );
}
