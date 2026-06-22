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
"https://aas.org/";

async function run(){

const feed =
await parser.parseURL(RSS_URL);

console.log(
`Found ${feed.items.length} items`
);

for(const item of feed.items){

const rssId =
Buffer.from(
(item.title || "") +
(item.link || "")
)
.toString("base64");

const docRef =
db.collection(
"opportunities"
).doc(rssId);

const existing =
await docRef.get();

if(existing.exists){

console.log(
"Skipping:",
item.title
);

continue;
}

await docRef.set({

title:
item.title || "",

domain:
"Physics",

source:
"AAS",

url:
item.link || "",

publishedDate:
item.pubDate || "",

rssId,

createdAt:
new Date().toISOString(),

lastSeen:
new Date().toISOString()

});

console.log(
"Added:",
item.title
);

}

}

run()
.then(()=>process.exit(0))
.catch(err=>{
console.error(err);
process.exit(1);
});
