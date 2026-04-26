import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import CommunityPost from "../models/CommunityPost.js";
import CommunityNotification from "../models/CommunityNotification.js";
import CommunityInteraction from "../models/CommunityInteraction.js";

const router = express.Router();

const serializePost = (post) => ({
  id: String(post._id),
  user: post.user,
  title: post.title,
  caption: post.caption,
  image: post.image,
  likes: post.likes,
  saved: post.saved,
  isPublic: post.isPublic,
  createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
  tags: post.tags || [],
});

const serializeNotification = (notification) => ({
  id: String(notification._id),
  type: notification.type,
  actor: notification.actor,
  postId: String(notification.postId),
  postTitle: notification.postTitle,
  message: notification.message,
  createdAt:
    notification.createdAt instanceof Date
      ? notification.createdAt.toISOString()
      : notification.createdAt,
  read: notification.read,
});

async function getOrCreateInteraction(userId) {
  let interaction = await CommunityInteraction.findOne({ userId });

  if (!interaction) {
    interaction = await CommunityInteraction.create({ userId, likedPostIds: [], savedPostIds: [] });
  }

  return interaction;
}

router.use(protect);

router.get("/posts", async (req, res) => {
  try {
    const posts = await CommunityPost.find({
      $or: [{ isPublic: true }, { userId: req.user._id }],
    }).sort({ createdAt: -1 });

    res.status(200).json({ posts: posts.map(serializePost) });
  } catch (error) {
    console.error("community posts get error:", error.message);
    res.status(500).json({ message: "Failed to load community posts." });
  }
});

router.post("/posts", async (req, res) => {
  try {
    const { user, title, caption, image, isPublic = true, tags = [] } = req.body;

    if (!image) {
      return res.status(400).json({ message: "image is required." });
    }

    const post = await CommunityPost.create({
      userId: req.user._id,
      user: user || req.user.username || req.user.name,
      title: title || "New post",
      caption: caption || "",
      image,
      isPublic,
      tags,
    });

    res.status(201).json({ post: serializePost(post) });
  } catch (error) {
    console.error("community post create error:", error.message);
    res.status(500).json({ message: "Failed to create post." });
  }
});

router.patch("/posts/:id", async (req, res) => {
  try {
    const post = await CommunityPost.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { returnDocument: "after" }
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    res.status(200).json({ post: serializePost(post) });
  } catch (error) {
    console.error("community post update error:", error.message);
    res.status(500).json({ message: "Failed to update post." });
  }
});

router.delete("/posts/:id", async (req, res) => {
  try {
    const post = await CommunityPost.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    await CommunityNotification.deleteMany({ postId: post._id });
    await CommunityInteraction.updateMany(
      {},
      {
        $pull: {
          likedPostIds: String(post._id),
          savedPostIds: String(post._id),
        },
      }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("community post delete error:", error.message);
    res.status(500).json({ message: "Failed to delete post." });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const notifications = await CommunityNotification.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ notifications: notifications.map(serializeNotification) });
  } catch (error) {
    console.error("community notifications error:", error.message);
    res.status(500).json({ message: "Failed to load notifications." });
  }
});

router.get("/interactions", async (req, res) => {
  try {
    const interaction = await getOrCreateInteraction(req.user._id);
    res.status(200).json({
      likedPostIds: interaction.likedPostIds || [],
      savedPostIds: interaction.savedPostIds || [],
    });
  } catch (error) {
    console.error("community interactions error:", error.message);
    res.status(500).json({ message: "Failed to load interactions." });
  }
});

router.post("/posts/:id/like", async (req, res) => {
  try {
    const { liked } = req.body;
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const interaction = await getOrCreateInteraction(req.user._id);
    const postId = String(post._id);
    const alreadyLiked = interaction.likedPostIds.includes(postId);

    if (liked && !alreadyLiked) {
      interaction.likedPostIds.push(postId);
      post.likes += 1;

      if (String(post.userId) !== String(req.user._id)) {
        await CommunityNotification.create({
          userId: post.userId,
          type: "like",
          actor: req.user.username || req.user.name || "wearly_user",
          postId: post._id,
          postTitle: post.title,
          message: "liked your post",
          read: false,
        });
      }
    }

    if (!liked && alreadyLiked) {
      interaction.likedPostIds = interaction.likedPostIds.filter((id) => id !== postId);
      post.likes = Math.max(0, post.likes - 1);
    }

    await interaction.save();
    await post.save();

    res.status(200).json({ liked: Boolean(liked), likes: post.likes });
  } catch (error) {
    console.error("community like error:", error.message);
    res.status(500).json({ message: "Failed to update like." });
  }
});

router.post("/posts/:id/save", async (req, res) => {
  try {
    const { saved } = req.body;
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const interaction = await getOrCreateInteraction(req.user._id);
    const postId = String(post._id);
    const alreadySaved = interaction.savedPostIds.includes(postId);

    if (saved && !alreadySaved) {
      interaction.savedPostIds.push(postId);
      post.saved += 1;
    }

    if (!saved && alreadySaved) {
      interaction.savedPostIds = interaction.savedPostIds.filter((id) => id !== postId);
      post.saved = Math.max(0, post.saved - 1);
    }

    await interaction.save();
    await post.save();

    res.status(200).json({ saved: Boolean(saved), saves: post.saved });
  } catch (error) {
    console.error("community save error:", error.message);
    res.status(500).json({ message: "Failed to update save." });
  }
});

router.post("/notifications/read-all", async (req, res) => {
  try {
    await CommunityNotification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("community read-all error:", error.message);
    res.status(500).json({ message: "Failed to mark notifications as read." });
  }
});

export default router;
