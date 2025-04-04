import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

let clientUrl = process.env.CLIENT_URL;

export const generatePdf = async ({ slug, clientUrl_ }) => {
  const TIMEOUT = 5 * 60000; // 5 minutes
  if (!clientUrl) clientUrl = clientUrl_;

  try {
    return await Promise.race([
      (async () => {
        const browser = await puppeteer.launch({
          executablePath: "/usr/bin/google-chrome",
          args: ["--disable-web-security", "--allow-running-insecure-content"],
        });

        const page = await browser.newPage();
        await page.goto(`${clientUrl}/puppeteer/${slug}`, {
          waitUntil: "networkidle0",
          timeout: TIMEOUT,
        });

        // Wait for #puppeteer or timeout
        await page
          .waitForSelector("#puppeteer", { timeout: TIMEOUT })
          .catch(() => {
            console.warn("Element #puppeteer not found!");
          });

        const { childElements, styles, cssLinks } = await page.evaluate(() => {
          const parentElement = document.querySelector("#puppeteer");
          if (!parentElement)
            return { childElements: [], styles: "", cssLinks: [] };

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
            cssLinks: Array.from(
              document.querySelectorAll('link[rel="stylesheet"]')
            ).map((link) => link.href),
          };
        });

        const pdfPage = await browser.newPage();
        await pdfPage.setContent(
          `
          <html>
            <head>
              ${styles}
              <style> *{margin:0;padding:0;box-sizing:border-box;} .pdf-page { width: 215.5mm; height: 278.4mm; overflow:hidden; page-break-after: always; } </style>
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
      })(),

      // Timeout handler
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("PDF generation timed out!")),
          TIMEOUT
        )
      ),
    ]);
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    return undefined;
  }
};
