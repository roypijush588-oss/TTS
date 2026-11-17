import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

// Helper to instantiate Gemini client with current environment key
function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to build TTS style directives for speechMetadata
function buildDirectives({
  tone,
  targetSeconds,
  wordCount,
  targetWpm,
  paceSpeed,
  isCloned,
}: {
  tone?: string;
  targetSeconds?: number;
  wordCount?: number;
  targetWpm?: number | null;
  paceSpeed?: string;
  isCloned?: boolean;
}): string {
  const directives: string[] = [];

  if (isCloned) {
    directives.push('expressive creator voice with natural authentic texture');
  }

  if (tone && tone.trim() && tone.trim().toLowerCase() !== 'natural') {
    directives.push(`${tone.trim()} delivery`);
  } else {
    directives.push('natural, human tone');
  }

  if (targetSeconds && targetSeconds > 0) {
    directives.push(`timed duration goal: calibrate speech rate to complete the entire script in ${targetSeconds} seconds`);
    if (targetWpm) {
      directives.push(`speaking speed calibrated to approximately ${targetWpm} words per minute`);
    }
    if (paceSpeed === 'Ultra-Fast' || (targetWpm && targetWpm > 220)) {
      directives.push(`very fast, rapid energetic pace calibrated for a ${targetSeconds}-second duration`);
    } else if (paceSpeed === 'Fast' || (targetWpm && targetWpm > 160)) {
      directives.push(`brisk, quick pace calibrated for a ${targetSeconds}-second duration`);
    } else if (paceSpeed === 'Slow' || (targetWpm && targetWpm < 110)) {
      directives.push(`slow, deliberate relaxed pace calibrated for a ${targetSeconds}-second duration`);
    } else {
      directives.push(`natural cadence calibrated for a ${targetSeconds}-second duration`);
    }
  }

  return directives.join(', ');
}

// AI Script Duration Optimizer Endpoint
app.post('/api/script/fit-duration', async (req: Request, res: Response) => {
  try {
    const { text, targetSeconds = 60, currentWords = 0 } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        fittedScript: text,
        warning: 'Gemini API key is not configured. Your API key can be found in the Settings > Secrets panel.',
      });
    }

    // Average natural speaking rate in Hinglish/English is ~2.3 words/second (~138 WPM)
    const idealWordCount = Math.round(targetSeconds * 2.3);
    const ai = getGeminiClient();

    const prompt = `You are an expert voiceover script editor specializing in Hinglish and English video voiceovers.
The user wants this voiceover script to last EXACTLY ${targetSeconds} seconds (${targetSeconds === 60 ? 'one minute' : `${targetSeconds} seconds`}).
To achieve a natural speaking rate in ${targetSeconds} seconds, the ideal script length is approximately ${idealWordCount} words (the current script has ${currentWords} words).

Task:
- Rewrite, condense, or elaborate the script so it can be comfortably spoken in exactly ${targetSeconds} seconds.
- Maintain the original tone, core meaning, and natural Hinglish/English conversational phrasing.
- Apply Hinglish breathing punctuation rules:
  1. Comma ( , ) = short 0.5s breath pause
  2. Period ( . ) = 1.0s sentence pause
  3. Question mark ( ? ) = pitch inflection
  4. Double dash ( -- ) = dramatic pause before important keywords
- Output ONLY the updated script text. Do NOT include markdown formatting, code blocks, introductory text, explanations, or quotation marks.

Original Script:
${text.trim()}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const rawText = response.text || '';
    const fittedScript = rawText.trim().replace(/^```[a-z]*\n?|```$/g, '').replace(/^["']|["']$/g, '').trim();
    const newWordCount = fittedScript.split(/\s+/).filter(Boolean).length;

    return res.json({
      fittedScript: fittedScript || text,
      newWordCount: newWordCount || currentWords,
      targetSeconds,
      idealWordCount,
    });
  } catch (error: any) {
    console.error('Fit duration error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to optimize script for duration' });
  }
});

// Unary TTS Endpoint
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const {
      text,
      apiVoiceName = 'Puck',
      tone = 'natural',
      targetSeconds = 0,
      wordCount = 0,
      targetWpm = null,
      paceSpeed = 'Natural',
      isCloned = false,
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    // If API key is missing or not provided yet, seamlessly signal client fallback
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        fallbackWebSpeech: true,
        warning: 'Gemini API key is not configured. Your API key can be found in the Settings > Secrets panel.',
      });
    }

    const cleanText = text.trim();
    const directiveStyle = buildDirectives({
      tone,
      targetSeconds,
      wordCount,
      targetWpm,
      paceSpeed,
      isCloned,
    });

    // Valid Gemini TTS models per @google/genai guidelines
    const modelsToTry = [
      'gemini-3.8-flash-tts',
      'gemini-3.8-flash-lite-tts',
    ];

    let lastError: any = null;
    const ai = getGeminiClient();

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                  speechMetadata: directiveStyle ? { style: directiveStyle } : undefined,
                },
              ],
            },
          ] as any,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: apiVoiceName },
              },
            },
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            return res.json({
              audioBase64: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'audio/wav',
              model,
            });
          }
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || '';
        // If API key is invalid or rejected by Google endpoint, return fallback smoothly
        if (/api_key_invalid|api key not valid|key not found/i.test(msg)) {
          return res.json({
            fallbackWebSpeech: true,
            warning: 'API key is invalid. Your API key can be found in the Settings > Secrets panel.',
          });
        }
        // If rate limit / quota exceeded on free tier, return smooth browser speech fallback
        if (/quota|rate|limit|429|resource_exhausted/i.test(msg)) {
          return res.json({
            fallbackWebSpeech: true,
            warning: 'Gemini TTS request limit reached. Using instant browser speech engine. Your API key can be found in the Settings > Secrets panel.',
          });
        }
      }
    }

    // If Gemini models could not return audio, fall back gracefully
    return res.json({
      fallbackWebSpeech: true,
      warning: lastError?.message || 'Gemini TTS audio unavailable. Using client speech engine.',
    });
  } catch (error: any) {
    console.error('TTS error:', error?.message || error);
    return res.json({
      fallbackWebSpeech: true,
      warning: error?.message || 'TTS generation encountered an issue. Using client speech engine.',
    });
  }
});

// Streaming TTS Endpoint (Server-Sent Events)
app.post('/api/tts/stream', async (req: Request, res: Response) => {
  try {
    const {
      text,
      apiVoiceName = 'Puck',
      tone = 'natural',
      targetSeconds = 0,
      wordCount = 0,
      targetWpm = null,
      paceSpeed = 'Natural',
      isCloned = false,
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        fallbackWebSpeech: true,
        warning: 'GEMINI_API_KEY is not configured on the server. Your API key can be found in the Settings > Secrets panel.',
      });
    }

    const cleanText = text.trim();
    const directiveStyle = buildDirectives({
      tone,
      targetSeconds,
      wordCount,
      targetWpm,
      paceSpeed,
      isCloned,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const ai = getGeminiClient();
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: directiveStyle ? { style: directiveStyle } : undefined,
            },
          ],
        },
      ] as any,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: apiVoiceName },
          },
        },
      },
    });

    for await (const chunk of responseStream) {
      const parts = chunk.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          res.write(`data: ${JSON.stringify({ audioChunk: part.inlineData.data })}\n\n`);
        }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Streaming TTS error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Streaming TTS failed.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Stream failed' })}\n\n`);
      res.end();
    }
  }
});

// WebSocket Live API Proxy setup
const wss = new WebSocketServer({ server, path: '/api/live' });
wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected to Live API WebSocket proxy');

  ws.on('message', async (data: Buffer | string) => {
    try {
      // Live API message proxying
      const message = JSON.parse(data.toString());
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (err: any) {
      ws.send(JSON.stringify({ type: 'error', message: err?.message || 'Invalid message' }));
    }
  });

  ws.on('close', () => {
    console.log('Live API client disconnected');
  });
});

// Vite middleware in dev or static serving in production
const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distDir = path.resolve(__dirname, 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VocalStudio server running on http://0.0.0.0:${PORT}`);
});
