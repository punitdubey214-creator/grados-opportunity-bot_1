import Parser from "rss-parser";
import admin from "firebase-admin";

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const parser = new Parser();

const FEEDS = [

  {
    url: "https://jobs.physicstoday.org/jobsrss/",
    domain: "Physics",
    source: "Physics Today"
  },

  {
    url: "https://fetchrss.com/feed/1wbuZ944LEzN1wbvWA0OqFik.rss",
    domain: "Physics",
    source: "Physics Jobs Feed"
  }

];

async function run() {

  const currentFeedIds = new Set();

  let added = 0;
  let updated = 0;
  let deleted = 0;

  for (const feedInfo of FEEDS) {

    try {

      console.log(
        `Reading ${feedInfo.source}`
      );

      const feed =
        await parser.parseURL(
          feedInfo.url
        );

      console.log(
        `Found ${feed.items.length} items`
      );

      for (const item of feed.items) {

        const text =
          (
            (item.title || "") +
            " " +
            (item.contentSnippet || "") +
            " " +
            (item.content || "")
          ).toLowerCase();

        let type = "Other";

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
        else if (
          text.includes("faculty") ||
          text.includes("professor")
        ) {
          type = "Faculty";
        }

        const rssId =
          Buffer.from(
            (item.title || "") +
            (item.link || "")
          )
          .toString("base64")
          .replace(/\//g, "_")
          .replace(/\+/g, "-")
          .replace(/=/g, "");

        currentFeedIds.add(rssId);

        const docRef =
          db.collection(
            "opportunities"
          ).doc(rssId);

        const existing =
          await docRef.get();

        const opportunity = {

          title:
            item.title || "",

          description:
            item.contentSnippet ||
            item.content ||
            "",

          domain:
            feedInfo.domain,

          source:
            feedInfo.source,

          type,

          institution: "",

          location: "",

          deadline: "",

          url:
            item.link || "",

          publishedDate:
            item.pubDate || "",

          rssId,

          status:
            "active",

          lastSeen:
            new Date().toISOString()

        };

        if (existing.exists) {

          await docRef.set(
            opportunity,
            { merge: true }
          );

          updated++;

          console.log(
            `Updated: ${item.title}`
          );

        } else {

          await docRef.set({

            ...opportunity,

            createdAt:
              new Date().toISOString()

          });

          added++;

          console.log(
            `Added: ${item.title}`
          );
        }
      }

    } catch (err) {

      console.log(
        `Error reading ${feedInfo.source}`
      );

      console.error(err);
    }
  }

  console.log(
    "Checking for deleted opportunities..."
  );

  const snapshot =
    await db.collection(
      "opportunities"
    ).get();

  for (const doc of snapshot.docs) {

    const data = doc.data();

    if (
      !currentFeedIds.has(
        data.rssId
      )
    ) {

      await doc.ref.delete();

      deleted++;

      console.log(
        `Deleted: ${data.title}`
      );
    }
  }

  console.log("");
  console.log("========== SUMMARY ==========");
  console.log(`Added: ${added}`);
  console.log(`Updated: ${updated}`);
  console.log(`Deleted: ${deleted}`);
  console.log("=============================");
}

run()
.then(() => {

  console.log(
    "RSS sync completed"
  );

  process.exit(0);

})
.catch((err) => {

  console.error(err);

  process.exit(1);

});
