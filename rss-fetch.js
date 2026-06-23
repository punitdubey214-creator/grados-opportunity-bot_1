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

const FEEDS = [

{
url: "https://www.higheredjobs.com/rss/categoryFeed.cfm?catID=98",
domain: "Astronomy & Astrophysics",
source: "HigherEdJobs"
},

{
url: "https://www.higheredjobs.com/rss/categoryFeed.cfm?catID=106",
domain: "Physics",
source: "HigherEdJobs"
},

{
url: "https://www.higheredjobs.com/rss/categoryFeed.cfm?catID=104",
domain: "Mathematics",
source: "HigherEdJobs"
},

{
url: "https://www.higheredjobs.com/rss/categoryFeed.cfm?catID=100",
domain: "Biology",
source: "HigherEdJobs"
},

{
url: "https://www.higheredjobs.com/rss/categoryFeed.cfm?catID=101",
domain: "Chemistry",
source: "HigherEdJobs"
}

];

async function run() {

let totalAdded = 0;
let totalSkipped = 0;

for(const feedInfo of FEEDS){

console.log(
`Reading ${feedInfo.domain}`
);

try{

const feed =
await parser.parseURL(
feedInfo.url
);

console.log(
`Found ${feed.items.length} items`
);

for(const item of feed.items){

const rssId =
Buffer.from(
(item.title || "") +
(item.link || "")
)
.toString("base64")
.replace(///g, "_")
.replace(/+/g, "-")
.replace(/=/g, "");

const docRef =
db.collection(
"opportunities"
).doc(rssId);

const existing =
await docRef.get();

if(existing.exists){

totalSkipped++;

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
feedInfo.domain,

source:
feedInfo.source,

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

totalAdded++;

console.log(
"Added:",
item.title
);

}

}
catch(err){

console.error(
`Error reading ${feedInfo.domain}`
);

console.error(err);

}

}

console.log(
`Total Added: ${totalAdded}`
);

console.log(
`Total Skipped: ${totalSkipped}`
);

}

run()
.then(()=>{

console.log(
"RSS sync completed"
);

process.exit(0);

})
.catch(err=>{

console.error(err);

process.exit(1);

});
