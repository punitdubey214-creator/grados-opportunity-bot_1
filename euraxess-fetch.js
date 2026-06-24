import axios from "axios";
import cheerio from "cheerio";

const url =
"https://euraxess.ec.europa.eu/jobs/search";

async function run() {

const response =
await axios.get(url, {
headers: {
"User-Agent":
"Mozilla/5.0"
}
});

console.log(
"Status:",
response.status
);

const $ =
cheerio.load(
response.data
);

console.log(
$("body").text().slice(0,500)
);

}

run();
