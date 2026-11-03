// Lit une photo d'étiquette de réactif avec un modèle de vision Gemini. La clé reste dans Supabase (secret GEMINI_API_KEY).
const PROMPT = `Tu lis l'étiquette d'un flacon de réactif chimique sur cette photo.
Réponds uniquement par un objet JSON avec ces clés :
product (nom du produit), supplier (fabricant ou fournisseur), ref (numéro de catalogue ou de produit),
cas (numéro CAS au format 12345-67-8), lot (numéro de lot ou de batch), expiry (date de péremption au format AAAA-MM-JJ).
Mets une chaîne vide pour tout champ illisible ou absent. Ne devine jamais : un numéro incertain reste vide.`;

const FIELDS = ['product', 'supplier', 'ref', 'cas', 'lot', 'expiry'];
const MODEL = 'gemini-2.5-flash';
const CORS = {
  'Access-Control-Allow-Origin': '*', // la connexion d'équipe est vérifiée ci-dessous, pas l'origine
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};
const reply = (body: string | null, status: number) => new Response(body, { status, headers: CORS });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return reply(null, 204);
  if (req.method !== 'POST') return reply('méthode refusée', 405);

  // Seuls les membres de l'équipe peuvent envoyer une photo : la règle is_team() tourne avec leur jeton.
  const team = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/is_team`, {
    method: 'POST',
    headers: { apikey: req.headers.get('apikey') ?? '', Authorization: req.headers.get('authorization') ?? '', 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!team.ok || (await team.json()) !== true) return reply('non autorisé', 403);

  const { image } = await req.json();
  const ai = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: image } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!ai.ok) return reply(`IA indisponible (${ai.status})`, 502);

  const text = (await ai.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return reply('réponse illisible', 502);
  const parsed = JSON.parse(match[0]);
  return Response.json(Object.fromEntries(FIELDS.map((k) => [k, String(parsed[k] ?? '').trim()])), { headers: CORS });
});
