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
url: "https://www.higheredjobs.com/rss/categoryFeed.cfm?catID=98",
domain: "Physics",
source: "HigherEdJobs Astronomy"
},

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

for (const item of feed.items) {

const text =
(
(item.title || "") +
" " +
(item.contentSnippet || "") +
" " +
(item.content || "")
).toLowerCase();
   
let type = "Research";

/* =========================
   PHD
========================= */

if (

text.includes("phd") ||
text.includes("ph.d") ||
text.includes("doctoral") ||
text.includes("doctorate") ||
text.includes("doctoral student") ||
text.includes("doctoral researcher") ||
text.includes("graduate student") ||
text.includes("phd candidate") ||
text.includes("phd position") ||
text.includes("fully funded phd") ||
text.includes("studentship")

){

type = "PhD";

}

/* =========================
   POSTDOC
========================= */

else if (

text.includes("postdoc") ||
text.includes("post-doc") ||
text.includes("postdoctoral") ||
text.includes("post doctoral") ||
text.includes("postdoctoral fellow") ||
text.includes("postdoctoral researcher")

){

type = "Postdoc";

}

/* =========================
   MSC
========================= */

else if (

text.includes("msc") ||
text.includes("master") ||
text.includes("masters") ||
text.includes("master's") ||
text.includes("masters student")

){

type = "MSc";

}

/* =========================
   FACULTY
========================= */

else if (

text.includes("assistant professor") ||
text.includes("associate professor") ||
text.includes("professor") ||
text.includes("lecturer") ||
text.includes("faculty")

){

type = "Faculty";

}

/* =========================
   RESEARCH
========================= */

else if (

text.includes("research fellow") ||
text.includes("research associate") ||
text.includes("research scientist") ||
text.includes("researcher") ||
text.includes("scientist")

){

type = "Research";

}
const EXCLUDE_KEYWORDS = [
"conference",
"workshop",
"seminar",
"symposium",
"meeting",
"event",
"podcast",
"newsletter",
"announcement",
"award",
"prize",
"book",
"journal",

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

    let type = "Other";
    
    if (
    
      text.includes("phd") ||
      text.includes("ph.d") ||
      text.includes("doctoral") ||
      text.includes("doctorate") ||
      text.includes("doctoral student") ||
      text.includes("doctoral researcher") ||
      text.includes("graduate student") ||
      text.includes("phd candidate") ||
      text.includes("fully funded phd")
    
    ){
    
      type = "PhD";
    
    }
    else if (
    
      text.includes("postdoc") ||
      text.includes("post-doc") ||
      text.includes("postdoctoral") ||
      text.includes("post doctoral") ||
      text.includes("postdoctoral fellow") ||
      text.includes("postdoctoral researcher")
    
    ){
    
      type = "Postdoc";
    
    }
    else if (
    
      text.includes("msc") ||
      text.includes("master") ||
      text.includes("masters") ||
      text.includes("master's")
    
    ){
    
      type = "MSc";
    
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
console.log(`Added: ${added}`);
console.log(`Updated: ${updated}`);
console.log(`Deleted: ${deleted}`);
console.log(`Filtered: ${filtered}`);
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
