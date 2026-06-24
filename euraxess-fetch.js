import axios from "axios";
import * as cheerio from "cheerio";
import admin from "firebase-admin";

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const URL =
  "https://euraxess.ec.europa.eu/jobs/search?f%5B0%5D=job_research_field%3A35&f%5B1%5D=job_research_field%3A345&f%5B2%5D=job_research_field%3A361&f%5B3%5D=offer_type%3Ajob_offer&f%5B4%5D=positions%3Aphp_positions";

async function run() {

  console.log("Fetching EURAXESS...");

  const response = await axios.get(URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0"
    }
  });

  const $ = cheerio.load(response.data);

  let added = 0;

  $("a").each(async (_, el) => {

    const title =
      $(el).text().trim();

    const href =
      $(el).attr("href");

    if (
      !title ||
      title.length < 15
    ) {
      return;
    }

    const text =
      title.toLowerCase();

    const isRelevant =

      text.includes("phd") ||
      text.includes("doctoral") ||
      text.includes("postdoc") ||
      text.includes("postdoctoral") ||
      text.includes("astrophysics") ||
      text.includes("astronomy") ||
      text.includes("physics") ||
      text.includes("cosmology") ||
      text.includes("quantum");

    if (!isRelevant) {
      return;
    }

    let type = "Research";

    if (
      text.includes("phd") ||
      text.includes("doctoral")
    ) {
      type = "PhD";
    }
    else if (
      text.includes("postdoc") ||
      text.includes("postdoctoral")
    ) {
      type = "Postdoc";
    }

    const rssId =
      Buffer.from(title)
      .toString("base64")
      .replace(/\//g, "_");

    await db
      .collection("opportunities")
      .doc(rssId)
      .set(
        {
          title,
          description: "",
          domain: "Physics",
          source: "EURAXESS",
          type,
          institution: "",
          location: "",
          deadline: "",
          url:
            href?.startsWith("http")
            ? href
            : `https://euraxess.ec.europa.eu${href}`,
          publishedDate:
            new Date().toISOString(),
          rssId,
          status: "active",
          lastSeen:
            new Date().toISOString()
        },
        { merge: true }
      );

    added++;
    console.log("Added:", title);
  });

  console.log(
    `EURAXESS added ${added} records`
  );
}

run()
.then(() => process.exit(0))
.catch(err => {
  console.error(err);
  process.exit(1);
});
