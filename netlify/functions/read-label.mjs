// Lit une photo d'étiquette de réactif avec un modèle de vision Gemini. La clé reste sur Netlify (variable GEMINI_API_KEY).
const SUPABASE_URL = 'https://dbdqshfopagbylpwqfel.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_c4hatIVl5gX3uPrlFZTTgA_hVOcRkyf'; // publique, comme config.js

const PROMPT = `Tu lis l'étiquette d'un flacon de réactif chimique sur cette photo.
Réponds uniquement par un objet JSON avec ces clés :
product (nom du produit), supplier (fabricant ou fournisseur), ref (numéro de catalogue ou de produit),
cas (numéro CAS au format 12345-67-8), lot (numéro de lot ou de batch), expiry (date de péremption au format AAAA-MM-JJ).
Mets une chaîne vide pour tout champ illisible ou absent. Ne devine jamais : un numéro incertain reste vide.`;

const FIELDS = ['product', 'supplier', 'ref', 'cas', 'lot', 'expiry'];
const MODEL = 'gemini-2.5-flash';

export default async (req) => {
  if (req.method !== 'POST') return new Response('méthode refusée', { status: 405 });

  // Seuls les membres de l'équipe peuvent envoyer une photo : la règle is_team() tourne avec leur jeton.
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  const team = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_team`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!team.ok || (await team.json()) !== true) return new Response('non autorisé', { status: 403 });

  const { image } = await req.json();
  const ai = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: image } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!ai.ok) return new Response(`IA indisponible (${ai.status})`, { status: 502 });

  const text = (await ai.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return new Response('réponse illisible', { status: 502 });
  const parsed = JSON.parse(match[0]);
  return Response.json(Object.fromEntries(FIELDS.map((k) => [k, String(parsed[k] ?? '').trim()])));
};
