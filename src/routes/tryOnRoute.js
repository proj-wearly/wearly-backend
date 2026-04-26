import express from "express";

const router = express.Router();
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_TRYON_MODEL = process.env.OPENAI_TRYON_MODEL || "gpt-5";

function normalizeGarments(garments = []) {
  return Array.isArray(garments)
    ? garments
        .map((garment, index) => ({
          id: garment?.id || `garment-${index + 1}`,
          category: String(garment?.category || "item").trim(),
          styleMood: String(garment?.styleMood || "").trim(),
          colorTone: String(garment?.colorTone || "").trim(),
          textureType: String(garment?.textureType || "").trim(),
          image: String(garment?.image || "").trim(),
        }))
        .filter((garment) => garment.image)
    : [];
}

function buildGarmentSummary(garments = []) {
  return garments
    .map((garment) => {
      const traits = [garment.styleMood, garment.colorTone, garment.textureType]
        .filter(Boolean)
        .join(", ");

      return `${garment.category}${traits ? ` (${traits})` : ""}`;
    })
    .join("; ");
}

function extractGeneratedImage(data) {
  const generationCall = Array.isArray(data?.output)
    ? data.output.find((item) => item?.type === "image_generation_call" && item?.result)
    : null;

  if (generationCall?.result) {
    return generationCall.result;
  }

  const imageFromContent = data?.output
    ?.flatMap((item) => item?.content || [])
    ?.find((content) => content?.type === "output_image" && content?.image_base64);

  return imageFromContent?.image_base64 || null;
}

router.post("/generate", async (req, res) => {
  try {
    const personImage = String(req.body?.personImage || "").trim();
    const garments = normalizeGarments(req.body?.garments);

    if (!personImage) {
      return res.status(400).json({ message: "Person image is required." });
    }

    if (!garments.length) {
      return res.status(400).json({ message: "Select at least one closet item." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "OPENAI_API_KEY is not configured." });
    }

    const garmentSummary = buildGarmentSummary(garments);
    const inputContent = [
      {
        type: "input_text",
        text:
          "Create a realistic mobile try-on preview using the reference photos. Keep the person's identity, pose, face, body proportions, and background as intact as possible. Dress the person in the selected garments, matching the garment references closely in silhouette, fabric feel, and color. If multiple garments are provided, combine them into one coherent outfit without inventing extra clothing. Return only one polished try-on image.",
      },
      {
        type: "input_text",
        text: `Selected garments: ${garmentSummary}`,
      },
      {
        type: "input_text",
        text: "The first image is the person photo to edit.",
      },
      {
        type: "input_image",
        image_url: personImage,
      },
      ...garments.flatMap((garment, index) => [
        {
          type: "input_text",
          text: `Reference garment ${index + 1}: ${garment.category}${
            garment.styleMood || garment.colorTone || garment.textureType
              ? ` | ${[garment.styleMood, garment.colorTone, garment.textureType]
                  .filter(Boolean)
                  .join(", ")}`
              : ""
          }`,
        },
        {
          type: "input_image",
          image_url: garment.image,
        },
      ]),
    ];

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_TRYON_MODEL,
        input: [
          {
            role: "user",
            content: inputContent,
          },
        ],
        tools: [
          {
            type: "image_generation",
            size: "1024x1536",
            quality: "medium",
            output_format: "png",
            background: "opaque",
            action: "edit",
          },
        ],
        tool_choice: { type: "image_generation" },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        message:
          data?.error?.message || data?.message || "Failed to generate try-on image.",
      });
    }

    const imageBase64 = extractGeneratedImage(data);

    if (!imageBase64) {
      return res.status(502).json({
        message: "OpenAI returned no try-on image.",
      });
    }

    return res.status(200).json({
      message: "Try-on image generated successfully.",
      imageBase64,
    });
  } catch (error) {
    console.error("try-on generate error:", error.message);
    return res.status(500).json({ message: "Failed to generate try-on image." });
  }
});

export default router;
