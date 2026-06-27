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
url:"https://jobs.physicstoday.org/jobsrss/",
domain:"Physics",
source:"Physics Today"
},

{
url:"http://feeds.aps.org/rss/recent/physics.xml",
domain:"Physics",
source:"APS Physics"
},

{
url:"https://fetchrss.com/feed/1wbuZ944LEzN1wbuYg5h84XK.rss",
domain:"Physics",
source:"Physics Jobs"
},

{
url:"https://fetchrss.com/feed/1wbuZ944LEzN1wbvWA0OqFik.rss",
domain:"Physics",
source:"Physics Telegram"
}

];

const INCLUDE_KEYWORDS = [

"phd",
"ph.d",
"doctoral",
"doctorate",
"studentship",
"phd position",
"doctoral position",
"graduate student",
"PhD", 
"Pre doctoral", 
"Ph.D", 
 

"postdoc",
"post-doc",
"postdoctoral",
"postdoctoral fellow",

"msc",
"master",
"masters",
"master's",

"research fellow",
"research associate",
"research scientist",

"assistant professor",
"associate professor",
"professor",
"lecturer",
"faculty",

"astrophysics",
"astronomy",
"cosmology",
"particle physics"

];

const EXCLUDE_KEYWORDS = [

"conference",
"workshop",
"seminar",
"symposium",
"meeting",
"event",
"podcast",
"newsletter",
"award",
"prize",
"book",
"journal",

"youtube",
"webinar",
"coaching",
"gate",
"jee",
"neet",
"training"

];
const MAX_POST_AGE_DAYS = 30;

function isOlderThanDays(pubDate, days = MAX_POST_AGE_DAYS) {

  if (!pubDate) return false;

  const published = new Date(pubDate);

  if (isNaN(published.getTime())) return false;

  const age =
    (Date.now() - published.getTime()) /
    (1000 * 60 * 60 * 24);

  return age > days;
}

async function deleteExpiredPosts() {

  console.log("Deleting expired opportunities...");

  const snapshot =
    await db.collection("opportunities").get();

  if (snapshot.empty) return;

  const batch = db.batch();

  snapshot.forEach(doc => {

    const data = doc.data();

    if (
      data.publishedDate &&
      isOlderThanDays(data.publishedDate)
    ) {
      batch.delete(doc.ref);
    }

  });

  await batch.commit();

  console.log("Expired opportunities deleted.");

}
async function run() {

await deleteExpiredPosts();

const currentFeedIds = new Set();

for(const feedInfo of FEEDS){

try{

const feed =
await parser.parseURL(
feedInfo.url
);

for(const item of feed.items){

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
.replace(/\//g,"_")
.replace(/\+/g,"-")
.replace(/=/g,"");

currentFeedIds.add(rssId);

// Skip posts older than 30 days
if (isOlderThanDays(item.pubDate || item.isoDate)) {
  continue;
}

const include =
INCLUDE_KEYWORDS.some(
k => text.includes(k)
);

const exclude =
EXCLUDE_KEYWORDS.some(
k => text.includes(k)
);

if(!include || exclude){
continue;
}

let type = "Research";

if(
text.includes("postdoc") ||
text.includes("postdoctoral")
){
type = "Postdoc";
}
else if(
text.includes("phd") ||
text.includes("doctoral position") ||
text.includes("studentship") ||
text.includes("phd position")
){
type = "PhD";
}
else if(
text.includes("msc") ||
text.includes("master")
){
type = "MSc";
}
else if(
text.includes("assistant professor") ||
text.includes("associate professor") ||
text.includes("lecturer")
){
type = "Faculty";
}

await db
.collection("opportunities")
.doc(rssId)
.set({

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

url:
item.link || "",

publishedDate:
item.pubDate || item.isoDate || "",

rssId,

status:"active",

lastSeen:
new Date().toISOString()

},
{merge:true}
);

}

}
catch(err){

console.error(
feedInfo.source,
err
);

}

}

console.log(
"RSS sync completed"
);

}

run()
.then(()=>process.exit(0))
.catch(err=>{
console.error(err);
process.exit(1);
});
