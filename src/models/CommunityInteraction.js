import mongoose from "mongoose";

const communityInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    likedPostIds: {
      type: [String],
      default: [],
    },
    savedPostIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const CommunityInteraction = mongoose.model(
  "CommunityInteraction",
  communityInteractionSchema
);

export default CommunityInteraction;
