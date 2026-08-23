import express from "express";
import OpenAI from "openai";

const router = express.Router();

const client = new OpenAI({
  baseURL: "https://gen.pollinations.ai/v1",
  apiKey: process.env.POLLINATIONS_API_KEY
});

router.get("/", async (req, res) => {
  try {
    const { prompt, language = "javascript" } = req.query;

    if (!prompt) {
      return res.status(400).json({
        status: false,
        message: "Falta el parámetro 'prompt'"
      });
    }

    if (!process.env.POLLINATIONS_API_KEY) {
      return res.status(500).json({
        status: false,
        message: "POLLINATIONS_API_KEY no está configurada"
      });
    }

    if (prompt.length > 5000) {
      return res.status(400).json({
        status: false,
        message: "El prompt no puede superar los 5000 caracteres"
      });
    }

    const completion = await client.chat.completions.create({
      model: "qwen-coder",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Eres un programador experto. Genera código funcional, limpio y seguro. " +
            "Devuelve únicamente el código solicitado, sin explicaciones, sin Markdown y sin bloques ```."
        },
        {
          role: "user",
          content:
            `Lenguaje: ${language}\n\n` +
            `Solicitud:\n${prompt}`
        }
      ]
    });

    const code = completion?.choices?.[0]?.message?.content?.trim();

    if (!code) {
      return res.status(502).json({
        status: false,
        message: "La IA no devolvió código"
      });
    }

    return res.json({
      status: true,
      result: {
        language,
        code
      }
    });

  } catch (error) {
    console.error("CODE API ERROR:", error);

    return res.status(500).json({
      status: false,
      message: "Error generando el código",
      error: error?.message || "Unknown error"
    });
  }
});

export default router;