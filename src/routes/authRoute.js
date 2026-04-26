import express from "express";
import {
  checkUsername,
  findUsername,
  registerUser,
  loginUser,
  getMe,
  updateMe,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/check-username", checkUsername);
router.post("/find-id", findUsername);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);

export default router;
