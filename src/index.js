const fs = require('fs');
const glob = require('glob');
const pdfParse = require('pdf-parse');

// need globalize to securely convert German number format to US (JavaScript) format
const Globalize = require('globalize');
Globalize.load(
  require('cldr-data/main/de/numbers.json'),
  require('cldr-data/main/de/ca-gregorian.json'),
  require('cldr-data/main/de/timeZoneNames.json'),
  require('cldr-data/supplemental/likelySubtags.json'),
  require('cldr-data/supplemental/numberingSystems.json'),
  require('cldr-data/supplemental/metaZones.json'),
  require('cldr-data/supplemental/timeData.json'),
  require('cldr-data/supplemental/weekData.json'),
  require('cldr-data/supplemental/weekData.json'),
);
Globalize.locale('de');
const parser = Globalize.numberParser();

async function convert2csv(file, csvFileName) {
  const csvStringify = require('csv-stringify')({ delimiter: ',' });
  const csvFile = fs.createWriteStream('csv/' + csvFileName);
  const dataBuffer = fs.readFileSync(file);
  const data = await pdfParse(dataBuffer);
  const lines = data.text.split('\n');

  csvStringify.pipe(csvFile);
  csvStringify.on('error', (err) => console.error(err.message));

  lines.forEach((line) => {
    const dates = line.match(/[0-9][0-9]\.[0-1][0-9]\.20[0-9][0-9]/g);

    let kaufdatum;
    let buchung;
    if (dates !== null) {
      [kaufdatum, buchung] = dates;
    }
    if (buchung !== void 0) {
      const parts = line.split(/[0-9][0-9]\.[0-1][0-9]\.20[0-9][0-9]/);
      const umsatz = parts[1];
      let betrag = parts[2];

      // geez, waht a clusterfuck

      betrag = betrag.split(' ');
      if (betrag.length > 1)
        betrag = betrag[1] === '+' ? betrag[0] : betrag[1] + betrag[0];
      else if (betrag[0].match('-')) betrag = '-' + betrag[0].slice(0, -1);
      else betrag = betrag[0].slice(0, -1);
      betrag = isNaN(parser(betrag)) ? betrag : parser(betrag);
      csvStringify.write([kaufdatum, buchung, umsatz, betrag]);
    }
  });
}

glob('pdf/*.pdf', null, (err, files) => {
  files.forEach((file) => {
    let csvFileName = file.split('/')[1];
    csvFileName = csvFileName.split('.')[0] + '.csv';
    convert2csv(file, csvFileName);
  });
});
