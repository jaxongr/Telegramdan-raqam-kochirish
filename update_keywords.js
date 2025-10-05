const fs = require('fs');

// Database o'qish
const db = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));

// Logistics kalit so'zlari
const keywords = 'toshkent,samarqand,buxoro,xiva,qarshi,termiz,andijon,fargona,namangan,nukus,jizzax,navoiy,guliston,ketamiz,boraman,kerak,yuk,pochta,odam,moshina,avto,cobalt,nexia,matiz,damas,lacetti,gentra,spark';

let updated = 0;

// Hamma guruhga kalit so'zlar qo'shish
db.groups.forEach(group => {
  if (!group.keywords || group.keywords.trim() === '') {
    group.keywords = keywords;
    updated++;
    console.log('Updated: ' + group.name + ' (ID: ' + group.id + ')');
  }
});

// Saqlash
fs.writeFileSync('data/database.json', JSON.stringify(db, null, 2));
console.log('\nTotal updated: ' + updated + ' groups');
