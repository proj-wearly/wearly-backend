import express from "express";
import ClosetItem from "../models/ClosetItem.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

const serializeItem = (item) => ({
  id: String(item._id),
  imageUri: item.imageUri,
  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  colorTone: item.colorTone,
  styleMood: item.styleMood,
  textureType: item.textureType,
  tryOnCategory: item.tryOnCategory,
});

router.use(protect);

router.get("/items", async (req, res) => {
  try {
    const items = await ClosetItem.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ items: items.map(serializeItem) });
  } catch (error) {
    console.error("closet get error:", error.message);
    res.status(500).json({ message: "Failed to load closet items." });
  }
});

router.post("/items", async (req, res) => {
  try {
    const { imageUri, colorTone, styleMood, textureType, tryOnCategory } = req.body;

    if (!imageUri) {
      return res.status(400).json({ message: "imageUri is required." });
    }

    const item = await ClosetItem.create({
      userId: req.user._id,
      imageUri,
      colorTone,
      styleMood,
      textureType,
      tryOnCategory,
    });

    res.status(201).json({ item: serializeItem(item) });
  } catch (error) {
    console.error("closet post error:", error.message);
    res.status(500).json({ message: "Failed to create closet item." });
  }
});

router.patch("/items/:id", async (req, res) => {
  try {
    const item = await ClosetItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { returnDocument: "after" }
    );

    if (!item) {
      return res.status(404).json({ message: "Closet item not found." });
    }

    res.status(200).json({ item: serializeItem(item) });
  } catch (error) {
    console.error("closet patch error:", error.message);
    res.status(500).json({ message: "Failed to update closet item." });
  }
});

router.delete("/items/:id", async (req, res) => {
  try {
    const item = await ClosetItem.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!item) {
      return res.status(404).json({ message: "Closet item not found." });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("closet delete error:", error.message);
    res.status(500).json({ message: "Failed to delete closet item." });
  }
});

export default router;
