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
"https://www.findaphd.com/phds/physics/?10M7W0";

async function run(){

try{

const response =
await axios.get(
URL,
{
headers:{
"User-Agent":
"Mozilla/5.0"
}
}
);

const $ =
cheerio.load(
response.data
);

let added = 0;

/*
FindAPhD historically uses
.resultsRow for listings.
*/

$(".resultsRow").each(
async (_, element) => {

try{

const title =
$(element)
.find("h3")
.first()
.text()
.trim();

const relativeLink =
$(element)
.find("a")
.first()
.attr("href");

const url =
relativeLink
? "https://www.findaphd.com" +
relativeLink
: "";

const university =
$(element)
.find(".instDept")
.first()
.text()
.trim();

const description =
$(element)
.find(".desc")
.first()
.text()
.trim();

if(!title) return;

const rssId =
Buffer.from(url)
.toString("base64")
.replace(/\//g,"_")
.replace(/\+/g,"-")
.replace(/=/g,"");

await db
.collection("opportunities")
.doc(rssId)
.set({

title,

description,

domain:"Physics",

source:"FindAPhD",

type:"PhD",

institution:
university || "",

location:"",

deadline:"",

url,

publishedDate:
new Date()
.toISOString(),

rssId,

status:"active",

lastSeen:
new Date()
.toISOString(),

createdAt:
new Date()
.toISOString()

},
{merge:true}
);

added++;

console.log(
`Added: ${title}`
);

}
catch(err){

console.log(
"Error parsing item"
);

console.error(err);

}

}
);

console.log(
`Finished. Added ${added}`
);

}
catch(err){

console.error(err);

}

}

run()
.then(()=>{
process.exit(0);
})
.catch(err=>{
console.error(err);
process.exit(1);
});
