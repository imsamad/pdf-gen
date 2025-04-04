import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generatePdf } from "./generatePdf.js";

dotenv.config();
const app = express();
app.use(cors());

// Get __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the root directory publicly
app.use(express.static(__dirname));

app.get("/generate-pdf/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const clientUrl_ = req.query.clientUrl_;
    const filePath = await generatePdf({ slug, clientUrl_ });

    if (!filePath) {
      return res.status(500).json({ message: "Failed to generate PDF" });
    }

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error("File not found:", err);
        return res.status(500).json({ message: "Generated PDF not found" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=document.pdf");
      res.sendFile(path.resolve(filePath));
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Please try again!" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
