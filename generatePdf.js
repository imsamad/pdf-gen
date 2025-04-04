import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

let clientUrl = process.env.CLIENT_URL;

export const generatePdf = async ({ slug, clientUrl_ }) => {
  if (!clientUrl) clientUrl = clientUrl_;

  try {
    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/google-chrome",
      args: ["--disable-web-security", "--allow-running-insecure-content"],
    });

    const page = await browser.newPage();
    await page.goto(`${clientUrl}/puppeteer/${slug}`, {
      waitUntil: "networkidle0",
      timeout: 0, // ❌ No timeout
    });

    await page.waitForSelector("#puppeteer", { timeout: 0 }).catch(() => {
      console.warn("Element #puppeteer not found!");
    });

    const { childElements, styles } = await page.evaluate(() => {
      const parentElement = document.querySelector("#puppeteer");
      if (!parentElement)
        return { childElements: [], styles: "" };

      return {
        childElements: Array.from(parentElement.children).map(
          (child) => child.outerHTML
        ),
        styles: `<style>${Array.from(document.styleSheets)
          .map((sheet) => {
            try {
              return Array.from(sheet.cssRules)
                .map((rule) => rule.cssText)
                .join("\n");
            } catch (e) {
              return "";
            }
          })
          .join("\n")}</style>`,
      };
    });

    const pdfPage = await browser.newPage();
    await pdfPage.setContent(
      `
      <html>
        <head>
          ${styles}
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            .pdf-page {
              width: 215.5mm;
              height: 278.4mm;
              overflow: hidden;
              page-break-after: always;
            }
          </style>
        </head>
        <body>
          ${childElements
            .map((child) => `<div class="pdf-page">${child}</div>`)
            .join("\n")}
        </body>
      </html>
    `,
      { waitUntil: "domcontentloaded" }
    );

    const fileName = `${slug}_${Math.random().toString().slice(2)}.pdf`;

    await pdfPage.pdf({
      path: fileName,
      width: "215.5mm",
      height: "278.4mm",
      printBackground: true,
    });

    console.log("✅ PDF Generated:", fileName);
    await browser.close();
    return fileName;
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    return undefined;
  }
};
