export default function handler(_req: any, res: any) {
 res.setHeader('Cache-Control', 'no-store');
 const gemini=Boolean(process.env.GEMINI_API_KEY);
 const openrouter=Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL);
 res.status(200).json({ready:gemini||openrouter,providers:{gemini,openrouter},primary:process.env.AI_PRIMARY_PROVIDER==='openrouter'?'openrouter':'gemini'});
}
