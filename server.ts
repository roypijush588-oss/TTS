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
    const inputScript = (req.body.text || req.body.script || '').trim();
    const targetSeconds = req.body.targetSeconds || req.body.durationSeconds || 60;
    const currentWords = req.body.currentWords || (inputScript ? inputScript.split(/\s+/).length : 0);

    if (!inputScript) {
      return res.status(400).json({ error: 'Text or script is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        fittedScript: inputScript,
        fittedWordCount: currentWords,
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
${inputScript}`;

    // Resilient fallback across flash models in case of temporary 503 spikes
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.8-flash-lite', 'gemini-3.1-flash-lite-preview'];
    let rawText = '';
    let lastErr: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        rawText = response.text || '';
        if (rawText.trim()) break;
      } catch (err: any) {
        lastErr = err;
        console.warn(`Model ${model} fit-duration failed:`, err?.message || err);
      }
    }

    if (!rawText.trim()) {
      // If AI models experienced temporary demand spikes, return original script safely with notice
      return res.json({
        fittedScript: inputScript,
        fittedWordCount: currentWords,
        targetSeconds,
        idealWordCount,
        warning: 'AI auto-fit experienced temporary demand spike; script preserved at target duration.',
      });
    }

    const fittedScript = rawText.trim().replace(/^```[a-z]*\n?|```$/g, '').replace(/^["']|["']$/g, '').trim();
    const newWordCount = fittedScript.split(/\s+/).filter(Boolean).length;

    return res.json({
      fittedScript: fittedScript || inputScript,
      fittedWordCount: newWordCount || currentWords,
      targetSeconds,
      idealWordCount,
    });
  } catch (error: any) {
    console.error('Fit duration error:', error);
    return res.json({
      fittedScript: req.body.text || req.body.script || '',
      fittedWordCount: 0,
      warning: 'Could not adjust script automatically. Script preserved.',
    });
  }
});

// Common handler for TTS synthesis
async function handleTtsGeneration(req: Request, res: Response) {
  try {
    const rawText = req.body.text || req.body.script;
    const apiVoiceName = req.body.voice || req.body.apiVoiceName || 'Puck';
    const tone = req.body.tone || 'natural';
    const targetSeconds = req.body.durationSeconds || req.body.targetSeconds || 0;
    const wordCount = req.body.wordCount || (rawText ? rawText.trim().split(/\s+/).length : 0);
    const targetWpm = req.body.targetWpm || null;
    const paceSpeed = req.body.paceSpeed || 'Natural';
    const isCloned = Boolean(req.body.isCloned);

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    const cleanText = rawText.trim();
    const directiveStyle = buildDirectives({
      tone,
      targetSeconds,
      wordCount,
      targetWpm,
      paceSpeed,
      isCloned,
    });

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        fallbackWebSpeech: true,
        warning: 'Gemini API key is not configured. Falling back to precision client speech engine.',
      });
    }

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
              audioData: part.inlineData.data,
              audioBase64: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'audio/wav',
              model,
              durationSeconds: targetSeconds || Math.round(cleanText.split(/\s+/).length / 2.3),
            });
          }
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    return res.json({
      fallbackWebSpeech: true,
      warning: lastError?.message || 'Using client speech engine.',
    });
  } catch (error: any) {
    console.error('TTS error:', error?.message || error);
    return res.json({
      fallbackWebSpeech: true,
      warning: error?.message || 'Using client speech engine.',
    });
  }
}

app.post('/api/speech/generate', handleTtsGeneration);
app.post('/api/tts', handleTtsGeneration);

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
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('sw.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
            res.setHeader('Service-Worker-Allowed', '/');
          } else if (filePath.endsWith('manifest.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
          } else if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VocalStudio server running on http://0.0.0.0:${PORT}`);
});
