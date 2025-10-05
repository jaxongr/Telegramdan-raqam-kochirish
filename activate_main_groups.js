const fs = require('fs');

// Logistics kalit so'zlari
const keywords = 'toshkent,samarqand,buxoro,xiva,qarshi,termiz,andijon,fargona,namangan,nukus,jizzax,navoiy,guliston,ketamiz,boraman,kerak,yuk,pochta,odam,moshina,avto,cobalt,nexia,matiz,damas,lacetti,gentra,spark';

// Database'ni o'qish
const db = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));

console.log(`Jami: ${db.groups.length} guruh\n`);

// Barcha guruhlarn active qilish va keywords qo'shish
db.groups.forEach(group => {
  group.active = 1;
  group.keywords = keywords;
  console.log(`✅ Aktiv: ${group.name}`);
});

// Saqlash
fs.writeFileSync('data/database.json', JSON.stringify(db, null, 2));

console.log(`\n✅ ${db.groups.length} guruh active va keywords qo'shildi!`);
