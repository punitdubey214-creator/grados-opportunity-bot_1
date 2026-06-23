import Parser from "rss-parser";
import admin from "firebase-admin";

const serviceAccount =
JSON.parse(
process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
credential:
admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const parser = new Parser();

const RSS_URL =
"https://physicsworld.com/feed/";

async function run() {

const feed =
await parser.parseURL(RSS_URL);

console.log(
`Found ${feed.items.length} items`
);

let addedCount = 0;
let skippedCount = 0;

const keywords = [

```
"phd",
"postdoc",
"post-doctoral",
"doctoral",
"studentship",
"fellowship",
"research position",
"research associate",
"research fellow",
"graduate program",
"graduate position",
"internship",
"scholarship",
"faculty position",
"assistant professor"
```

];

for (const item of feed.items) {

```
const searchText =
  (
    (item.title || "") +
    " " +
    (item.contentSnippet || "")
  ).toLowerCase();

const isOpportunity =
  keywords.some(
    keyword =>
      searchText.includes(keyword)
  );

if (!isOpportunity) {

  skippedCount++;

  console.log(
    "Skipping news:",
    item.title
  );

  continue;
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

const docRef =
  db.collection(
    "opportunities"
  ).doc(rssId);

const existing =
  await docRef.get();

if (existing.exists) {

  console.log(
    "Already exists:",
    item.title
  );

  continue;
}

await docRef.set({

  title:
    item.title || "",

  description:
    item.contentSnippet || "",

  domain:
    "Physics",

  source:
    "Physics World",

  url:
    item.link || "",

  publishedDate:
    item.pubDate || "",

  deadline:
    "",

  status:
    "active",

  rssId,

  createdAt:
    new Date().toISOString(),

  lastSeen:
    new Date().toISOString()

});

addedCount++;

console.log(
  "Added:",
  item.title
);
```

}

console.log(
`Added ${addedCount} opportunities`
);

console.log(
`Skipped ${skippedCount} non-opportunities`
);
}

run()
.then(() => {

console.log(
"RSS sync completed"
);

process.exit(0);

})
.catch(err => {

console.error(err);

process.exit(1);

});
