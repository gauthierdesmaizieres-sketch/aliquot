import { t, lang } from './i18n.js';
import { app, h, topbar, langSwitch, tabs } from './ui.js';

// Liste des évolutions prévues, avec leur état. Mise à jour à la main, en français et en allemand.
const IDEAS = [
  ['done', {
    fr: ['Ctrl+V sur une réaction', 'Coller une capture d’écran crée une note avec l’image.'],
    de: ['Ctrl+V bei einer Reaktion', 'Ein eingefügter Screenshot wird als Notiz mit Bild gespeichert.'] }],
  ['test', {
    fr: ['Lecture des étiquettes par IA (Gemini)', 'Active dès la connexion : remplit produit, référence, CAS, lot et péremption à partir de la photo. Repli sur la lecture locale si l’IA échoue.'],
    de: ['Etiketten lesen mit KI (Gemini)', 'Aktiv nach der Anmeldung: füllt Produkt, Referenz, CAS, Charge und Verfallsdatum aus dem Foto aus. Bei einem KI-Fehler wird lokal gelesen.'] }],
  ['done', {
    fr: ['Héberger sans Netlify : GitHub Pages + Supabase', 'Site sur GitHub Pages, fonction IA dans Supabase Edge Functions (clé Gemini en secret Supabase). Même compte et mot de passe. L’ancienne adresse Netlify renvoie vers la nouvelle.'],
    de: ['Hosting ohne Netlify: GitHub Pages + Supabase', 'Website auf GitHub Pages, KI-Funktion in Supabase Edge Functions (Gemini-Schlüssel als Supabase-Secret). Gleiches Konto und Passwort. Die alte Netlify-Adresse leitet auf die neue weiter.'] }],
  ['done', {
    fr: ['Mentions H : sources européennes en priorité', 'PubChem : classification CLP (ECHA) seulement, mentions déclarées par au moins 25 % des fournisseurs. Les fiches Sigma-Aldrich ne sont pas lisibles automatiquement (accès bloqué).'],
    de: ['H-Sätze: europäische Quellen zuerst', 'PubChem: nur CLP-Einstufung (ECHA), H-Sätze, die mindestens 25 % der Lieferanten melden. Sigma-Aldrich-Datenblätter sind nicht automatisch lesbar (Zugriff gesperrt).'] }],
  ['done', {
    fr: ['Lien vers Kobalt', 'Bouton Kobalt dans la barre d’onglets. La fiche du QR ne s’affiche plus une fois la réaction terminée.'],
    de: ['Link zu Kobalt', 'Kobalt-Schaltfläche in der Registerleiste. Das QR-Blatt wird nach Abschluss der Reaktion nicht mehr angezeigt.'] }],
  ['v2', {
    fr: ['Banque de données interne (QC Portal)', 'Relier l’app à la base interne du QC Portal, si l’IT donne son accord.'],
    de: ['Interne Datenbank (QC Portal)', 'Die App mit der internen Datenbank des QC Portal verbinden, falls die IT zustimmt.'] }],
  ['idea', {
    fr: ['Pré-remplir le tableau de réactifs depuis un screenshot Signals', 'Lit noms, MW, équivalents, masses et moles. Contrôle : masse ÷ MW doit donner les moles.'],
    de: ['Reagenzientabelle aus einem Signals-Screenshot vorausfüllen', 'Liest Namen, MW, Äquivalente, Massen und Mol. Kontrolle: Masse ÷ MW muss die Mol ergeben.'] }],
  ['idea', {
    fr: ['Reconnaissance des structures chimiques : DECIMER et MolScribe', 'Convertissent un dessin de molécule en SMILES. À installer sur un serveur ; résultat à vérifier.'],
    de: ['Erkennung chemischer Strukturen: DECIMER und MolScribe', 'Wandeln eine Molekülzeichnung in SMILES um. Auf einem Server zu installieren; Ergebnis zu prüfen.'] }],
  ['idea', {
    fr: ['Lecture du journal Signals ELN (API REST)', 'Clé API stockée côté serveur, jamais dans le navigateur. À valider par l’IT du labo.'],
    de: ['Signals-ELN-Journal lesen (REST-API)', 'API-Schlüssel auf dem Server gespeichert, nie im Browser. Von der Labor-IT freizugeben.'] }],
  ['idea', {
    fr: ['Plan du labo minimaliste (étage complet)', 'Postes, hottes et zones seulement, sans bureaux. Affectation hotte ↔ poste à confirmer.'],
    de: ['Minimalistischer Laborplan (ganzes Stockwerk)', 'Nur Plätze, Kapellen und Zonen, ohne Büros. Zuordnung Kapelle ↔ Platz zu bestätigen.'] }],
  ['idea', {
    fr: ['Export Excel automatique des réactifs', 'Ajouter une ligne par réactif scanné, sans cliquer sur Exporter.'],
    de: ['Automatischer Excel-Export der Reagenzien', 'Eine Zeile pro gescanntem Reagenz, ohne auf Exportieren zu klicken.'] }],
];

export function ideasView() {
  app.replaceChildren(
    topbar(h('h1', {}, t('ideas')), langSwitch()),
    h('main', {}, tabs('ideas'),
      h('p', { class: 'muted' }, t('ideasIntro')),
      IDEAS.map(([state, text]) => {
        const [title, body] = text[lang];
        return h('div', { class: 'card' },
          h('div', { class: 'card-top' }, h('strong', {}, title), h('span', { class: 'pill' }, t(`idea_${state}`))),
          h('p', { class: 'muted' }, body));
      })),
  );
}
