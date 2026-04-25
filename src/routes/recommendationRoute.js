import express from "express";
import RecommendationInteraction from "../models/RecommendationInteraction.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

function normalizeCategoryLabel(value) {
  return String(value || "Item").toUpperCase();
}

function buildClosetRecommendation(closetItems = [], weather = {}) {
  if (!closetItems.length) {
    return null;
  }

  const tiles = closetItems.slice(0, 4).map((item, index) => ({
    id: item.id || `closet-tile-${index + 1}`,
    image: item.imageUri,
    label: normalizeCategoryLabel(item.tryOnCategory),
    origin: "closet",
  }));

  return {
    id: `closet-${Date.now()}`,
    title: "Today's closet lookbook",
    subtitle: `Matched for ${String(weather.condition || "today").toLowerCase()} weather from your uploaded items.`,
    source: "closet",
    createdAt: new Date().toISOString(),
    coverImage: tiles[0]?.image || "",
    trendNote: "",
    tiles,
  };
}

function buildAiRecommendations(closetItems = [], weather = {}) {
  if (closetItems.length < 2) {
    return [];
  }

  const combinations = [];
  for (let index = 0; index < closetItems.length && combinations.length < 3; index += 2) {
    const group = closetItems.slice(index, index + 3);
    if (group.length >= 2) {
      combinations.push(group);
    }
  }

  return combinations.map((group, index) => ({
    id: `ai-${index + 1}`,
    title: `AI styling board ${index + 1}`,
    subtitle: `A simple styling mix built for ${String(weather.condition || "today").toLowerCase()}.`,
    source: "ai",
    createdAt: new Date().toISOString(),
    coverImage: group[0]?.imageUri || "",
    trendNote: "",
    tiles: group.map((item, tileIndex) => ({
      id: item.id || `ai-${index + 1}-${tileIndex + 1}`,
      image: item.imageUri,
      label: normalizeCategoryLabel(item.tryOnCategory),
      origin: "closet",
    })),
  }));
}

function buildFallbackResponse(closetItems = [], weather = {}) {
  return {
    closetRecommendation: buildClosetRecommendation(closetItems, weather),
    aiRecommendations: buildAiRecommendations(closetItems, weather),
  };
}

function sanitizeTile(tile, fallbackId) {
  return {
    id: tile?.id || fallbackId,
    image: tile?.image || "",
    label: normalizeCategoryLabel(tile?.label),
    origin: tile?.origin === "ai" ? "ai" : "closet",
  };
}

function sanitizeRecommendation(item, source, fallbackIndex) {
  const tiles = Array.isArray(item?.tiles)
    ? item.tiles
        .filter((tile) => tile?.image)
        .map((tile, tileIndex) =>
          sanitizeTile(tile, `${source}-${fallbackIndex}-tile-${tileIndex + 1}`)
        )
    : [];

  return {
    id: item?.id || `${source}-${fallbackIndex}`,
    title: item?.title || (source === "closet" ? "Today's closet lookbook" : `AI styling board ${fallbackIndex}`),
    subtitle: item?.subtitle || "",
    source,
    createdAt: item?.createdAt || new Date().toISOString(),
    coverImage: item?.coverImage || tiles[0]?.image || "",
    trendNote: item?.trendNote || "",
    tiles,
  };
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const contentItems = data?.output
    ?.flatMap((outputItem) => outputItem?.content || [])
    ?.map((content) => content?.text || content?.value)
    ?.filter(Boolean);

  if (Array.isArray(contentItems) && contentItems.length > 0) {
    return contentItems.join("\n");
  }

  return "";
}

async function fetchOpenAiRecommendations(closetItems = [], weather = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const inputPayload = {
    weather,
    closetItems: closetItems.map((item) => ({
      id: item.id,
      imageUri: item.imageUri,
      colorTone: item.colorTone,
      styleMood: item.styleMood,
      textureType: item.textureType,
      tryOnCategory: item.tryOnCategory,
      createdAt: item.createdAt,
    })),
  };

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You generate fashion recommendation JSON for a mobile app. Use only the provided closet item imageUri values as images. Return one closetRecommendation and up to three aiRecommendations. closetRecommendation should prefer the user's closet items and weather. aiRecommendations should still use only provided imageUri values, but arrange them into more trend-forward styling boards. Keep titles short, subtitles concise, origins limited to closet or ai, and labels to clothing categories like TOP, BOTTOM, OUTER, SHOES, BAG, ACCESSORY.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(inputPayload),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "wearly_suggestions",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              closetRecommendation: {
                anyOf: [
                  {
                    type: "null",
                  },
                  {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      id: { type: "string" },
                      title: { type: "string" },
                      subtitle: { type: "string" },
                      createdAt: { type: "string" },
                      coverImage: { type: "string" },
                      trendNote: { type: "string" },
                      tiles: {
                        type: "array",
                        minItems: 1,
                        maxItems: 6,
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            id: { type: "string" },
                            image: { type: "string" },
                            label: { type: "string" },
                            origin: { type: "string", enum: ["closet", "ai"] },
                          },
                          required: ["id", "image", "label", "origin"],
                        },
                      },
                    },
                    required: ["id", "title", "subtitle", "createdAt", "coverImage", "trendNote", "tiles"],
                  },
                ],
              },
              aiRecommendations: {
                type: "array",
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    subtitle: { type: "string" },
                    createdAt: { type: "string" },
                    coverImage: { type: "string" },
                    trendNote: { type: "string" },
                    tiles: {
                      type: "array",
                      minItems: 2,
                      maxItems: 6,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          id: { type: "string" },
                          image: { type: "string" },
                          label: { type: "string" },
                          origin: { type: "string", enum: ["closet", "ai"] },
                        },
                        required: ["id", "image", "label", "origin"],
                      },
                    },
                  },
                  required: ["id", "title", "subtitle", "createdAt", "coverImage", "trendNote", "tiles"],
                },
              },
            },
            required: ["closetRecommendation", "aiRecommendations"],
          },
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "OpenAI request failed.");
  }

  const outputText = extractResponseText(data);
  if (!outputText) {
    throw new Error("OpenAI returned no recommendation text.");
  }

  const parsed = JSON.parse(outputText);

  return {
    closetRecommendation: parsed?.closetRecommendation
      ? sanitizeRecommendation(parsed.closetRecommendation, "closet", 1)
      : null,
    aiRecommendations: Array.isArray(parsed?.aiRecommendations)
      ? parsed.aiRecommendations
          .map((item, index) => sanitizeRecommendation(item, "ai", index + 1))
          .filter((item) => item.tiles.length > 0)
      : [],
  };
}

async function getOrCreateInteraction(userId) {
  let interaction = await RecommendationInteraction.findOne({ userId });

  if (!interaction) {
    interaction = await RecommendationInteraction.create({ userId, interactions: {} });
  }

  return interaction;
}

router.post("/outfits", async (req, res) => {
  try {
    const { closetItems = [], weather = {} } = req.body || {};

    if (!Array.isArray(closetItems) || closetItems.length === 0) {
      return res.status(200).json({
        closetRecommendation: null,
        aiRecommendations: [],
      });
    }

    try {
      const aiResponse = await fetchOpenAiRecommendations(closetItems, weather);
      return res.status(200).json(aiResponse);
    } catch (openAiError) {
      console.warn("OpenAI recommendation fallback:", openAiError.message);
      return res.status(200).json(buildFallbackResponse(closetItems, weather));
    }
  } catch (error) {
    console.error("recommendations outfits error:", error.message);
    res.status(500).json({ message: "Failed to build recommendations." });
  }
});

router.use(protect);

router.get("/interactions", async (req, res) => {
  try {
    const interaction = await getOrCreateInteraction(req.user._id);
    res.status(200).json({ interactions: interaction.interactions || {} });
  } catch (error) {
    console.error("recommendation interactions error:", error.message);
    res.status(500).json({ message: "Failed to load recommendation interactions." });
  }
});

router.post("/interactions/:id/like", async (req, res) => {
  try {
    const interaction = await getOrCreateInteraction(req.user._id);
    const current = interaction.interactions?.get?.(req.params.id) || interaction.interactions?.[req.params.id] || {};
    interaction.interactions.set(req.params.id, {
      liked: Boolean(req.body?.liked),
      saved: Boolean(current.saved),
    });
    await interaction.save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("recommendation like error:", error.message);
    res.status(500).json({ message: "Failed to update recommendation like." });
  }
});

router.post("/interactions/:id/save", async (req, res) => {
  try {
    const interaction = await getOrCreateInteraction(req.user._id);
    const current = interaction.interactions?.get?.(req.params.id) || interaction.interactions?.[req.params.id] || {};
    interaction.interactions.set(req.params.id, {
      liked: Boolean(current.liked),
      saved: Boolean(req.body?.saved),
    });
    await interaction.save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("recommendation save error:", error.message);
    res.status(500).json({ message: "Failed to update recommendation save." });
  }
});

export default router;
