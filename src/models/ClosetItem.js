import mongoose from "mongoose";

const closetItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    imageUri: {
      type: String,
      required: true,
      trim: true,
    },
    colorTone: {
      type: String,
      required: true,
      trim: true,
    },
    styleMood: {
      type: String,
      required: true,
      trim: true,
    },
    textureType: {
      type: String,
      required: true,
      trim: true,
    },
    tryOnCategory: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const ClosetItem = mongoose.model("ClosetItem", closetItemSchema);

export default ClosetItem;
