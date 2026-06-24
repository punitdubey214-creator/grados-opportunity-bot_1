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
url: "http://feeds.aps.org/rss/recent/physics.xml",
domain: "Physics",
source: "APS Physics"
},

{
url: "https://fetchrss.com/feed/1wbuZ944LEzN1wbuYg5h84XK.rss",
domain: "Physics",
source: "Physics Jobs"
},

{
url: "https://fetchrss.com/feed/1wbuZ944LEzN1wbvWA0OqFik.rss",
domain: "Physics",
source: "Physics Telegram"
}

];

const INCLUDE_KEYWORDS = [

  // PhD
  "phd",
  "ph.d",
  "doctoral",
  "doctorate",
  "doctoral position",
  "phd position",
  "phd candidate",
  "doctoral candidate",
  "phd admission",
  "phd program",
  "graduate student",

  // Postdoc
  "postdoc",
  "post-doc",
  "postdoctoral",
  "post doctoral",
  "postdoctoral fellow",
  "postdoctoral researcher",

  // Research
  "research associate",
  "research fellow",
  "research scientist",
  "researcher",
  "scientist",
  "staff scientist",
  "staff researcher",
  "research position",
  "research opportunity",

  // Fellowships
  "fellowship",
  "studentship",
  "research fellowship",
  "doctoral fellowship",
  "postdoctoral fellowship",

  // Academic jobs
  "assistant professor",
  "associate professor",
  "professor",
  "lecturer",
  "faculty position",
  "faculty opening",
  "faculty vacancy",

  // General opportunities
  "vacancy",
  "opening",
  "position available",
  "job opening",
  "hiring",
  "recruitment",

  // Programs
  "graduate program",
  "graduate position",
  "doctoral program",
  "research program",

  // Internships
  "internship",
  "research internship",
  "summer internship",

  // Scholarships
  "scholarship",
  "research scholarship",

  // Common physics/astro wording
  "astrophysics",
  "astronomy",
  "cosmology",
  "particle physics",
  "physics department",
  "physics division"

];
const EXCLUDE_KEYWORDS = [

"live session",
"masterclass",
"coaching",
"batch",
"youtube",
"webinar",
"follow",
"share",
"csir-net",
"gate",
"jee",
"neet",
"course",
"admission open",
"training"

];

async function run() {

const currentFeedIds = new Set();

let added = 0;
let updated = 0;
let deleted = 0;
let filtered = 0;

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

    const rssId =
      Buffer.from(
        (item.title || "") +
        (item.link || "")
      )
      .toString("base64")
      .replace(/\//g, "_")
      .replace(/\+/g, "-")
      .replace(/=/g, "");

    // IMPORTANT
    currentFeedIds.add(rssId);

    const include =
      INCLUDE_KEYWORDS.some(
        keyword =>
          text.includes(keyword)
      );

    const exclude =
      EXCLUDE_KEYWORDS.some(
        keyword =>
          text.includes(keyword)
      );

    if (!include || exclude) {

      filtered++;

      console.log(
        `Filtered: ${item.title}`
      );

      continue;
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
    else if (
      text.includes("research fellow")
    ) {

      type = "Research Fellow";

    }
    else if (
      text.includes("research associate")
    ) {

      type = "Research Associate";
    }

    const docRef =
      db.collection(
        "opportunities"
      )
      .doc(rssId);

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
  data.rssId &&
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
console.log("Added: ${added}");
console.log("Updated: ${updated}");
console.log("Deleted: ${deleted}");
console.log("Filtered: ${filtered}");
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
