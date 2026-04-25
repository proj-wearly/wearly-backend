import mongoose from "mongoose";

const recommendationInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    interactions: {
      type: Map,
      of: new mongoose.Schema(
        {
          liked: { type: Boolean, default: false },
          saved: { type: Boolean, default: false },
        },
        { _id: false }
      ),
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const RecommendationInteraction = mongoose.model(
  "RecommendationInteraction",
  recommendationInteractionSchema
);

export default RecommendationInteraction;
