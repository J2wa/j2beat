export default function handler(_req: any, res: any) {
 res.setHeader('Cache-Control', 'no-store');
 res.status(200).json({ready: Boolean(process.env.GEMINI_API_KEY)});
}
