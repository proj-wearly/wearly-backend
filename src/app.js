import express from "express";
import cors from "cors";
import authRoute from "./routes/authRoute.js";
import closetRoute from "./routes/closetRoute.js";
import communityRoute from "./routes/communityRoute.js";
import recommendationRoute from "./routes/recommendationRoute.js";
import tryOnRoute from "./routes/tryOnRoute.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "40mb" }));

app.get("/", (req, res) => {
  res.json({ message: "Wealry API is running" });
});

app.use("/api/auth", authRoute);
app.use("/api/closet", closetRoute);
app.use("/api/community", communityRoute);
app.use("/api/recommendations", recommendationRoute);
app.use("/api/tryon", tryOnRoute);

export default app;
