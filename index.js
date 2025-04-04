import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { generatePdf } from "./generatePdf.js";
dotenv.config();
const app = express();

app.use(cors());

app.get("/generate-pdf/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const clientUrl_ = req.query.clientUrl_;
    const filePath = await generatePdf({ slug, clientUrl_ });

    if (!filePath) {
      return res.status(500).json({ message: "Failed to generate PDF" });
    }

    res.download(filePath, "document.pdf", (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({ message: "Failed to send file" });
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Please try again!" });
  }
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log("Server running on port 5000"));
