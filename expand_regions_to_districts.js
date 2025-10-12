/**
 * Viloyat yo'nalishlarini tumanlar bo'yicha kengaytirish
 * Masalan: "fargona → toshkent" → "marg'ilon → toshkent", "qo'qon → toshkent" va h.k.
 */

const { getAllRoutes, getRouteById, createRoute } = require('./src/database/routes');

// O'zbekiston viloyatlari va ularning tumanlari/shaharlari
const REGIONS_DISTRICTS = {
  // Farg'ona viloyati
  fargona: [
    { name: 'Marg\'ilon', keywords: 'marg\'ilon,margilon,margilan' },
    { name: 'Qo\'qon', keywords: 'qo\'qon,kokand,quqon,kokhan' },
    { name: 'Farg\'ona', keywords: 'farg\'ona,fergana,farghona' },
    { name: 'Beshariq', keywords: 'beshariq,besharik,beshariq tumani' },
    { name: 'Bog\'dot', keywords: 'bog\'dot,bogdod,baghdod' },
    { name: 'Buvayda', keywords: 'buvayda,buvaydo' },
    { name: 'Dang\'ara', keywords: 'dang\'ara,dangara' },
    { name: 'Furqat', keywords: 'furqat,furkat' },
    { name: 'Oltiariq', keywords: 'oltiariq,oltiariq tumani,altiarik' },
    { name: 'O\'zbekiston', keywords: 'o\'zbekiston tumani,ozbekiston' },
    { name: 'Quva', keywords: 'quva,kuva' },
    { name: 'Qo\'shtepa', keywords: 'qo\'shtepa,qushtepa,kushtepa' },
    { name: 'Rishton', keywords: 'rishton,rishtan' },
    { name: 'So\'x', keywords: 'so\'x,sox,sokh' },
    { name: 'Toshloq', keywords: 'toshloq,toshloq tumani' },
    { name: 'Uchko\'prik', keywords: 'uchko\'prik,uchkuprik,uchkoprik' },
    { name: 'Yozyovon', keywords: 'yozyovon,yazyavan' }
  ],

  // Andijon viloyati
  andijon: [
    { name: 'Andijon', keywords: 'andijon,andijan,andijan shahri' },
    { name: 'Xonobod', keywords: 'xonobod,xonobod shahri,khanabad' },
    { name: 'Asaka', keywords: 'asaka' },
    { name: 'Baliqchi', keywords: 'baliqchi,balikchi,balykchi' },
    { name: 'Bo\'z', keywords: 'bo\'z,boz,buz' },
    { name: 'Buloqboshi', keywords: 'buloqboshi,bulokboshi,bulakbashi' },
    { name: 'Jalaquduq', keywords: 'jalaquduq,jalakuduk,jalalquduq' },
    { name: 'Izboskan', keywords: 'izboskan,izboskan tumani' },
    { name: 'Qo\'rg\'ontepa', keywords: 'qo\'rg\'ontepa,qurgontepa,kurgontepa' },
    { name: 'Marhamat', keywords: 'marhamat' },
    { name: 'Oltinko\'l', keywords: 'oltinko\'l,oltinkol,altinkul' },
    { name: 'Paxtaobod', keywords: 'paxtaobod,pakhtaabad,paxtaabad' },
    { name: 'Ulug\'nor', keywords: 'ulug\'nor,ulugnor' },
    { name: 'Xo\'jaobod', keywords: 'xo\'jaobod,xojaobod,khojaabad' },
    { name: 'Shahrixon', keywords: 'shahrixon,shahrihon,shahrikhan' }
  ],

  // Namangan viloyati
  namangan: [
    { name: 'Namangan', keywords: 'namangan,namangan shahri' },
    { name: 'Chortoq', keywords: 'chortoq,chartaq,chortak' },
    { name: 'Chust', keywords: 'chust,chust shahri' },
    { name: 'Kosonsoy', keywords: 'kosonsoy,kasansay' },
    { name: 'Mingbuloq', keywords: 'mingbuloq,mingbulak' },
    { name: 'Norin', keywords: 'norin' },
    { name: 'Pop', keywords: 'pop,pop tumani' },
    { name: 'To\'raqo\'rg\'on', keywords: 'to\'raqo\'rg\'on,turaqurgon,turakurgan' },
    { name: 'Uchqo\'rg\'on', keywords: 'uchqo\'rg\'on,uchqurgon,uchkurgan' },
    { name: 'Uychi', keywords: 'uychi,uychi tumani' },
    { name: 'Yangiqo\'rg\'on', keywords: 'yangiqo\'rg\'on,yangikurgan,yangiqurgon' }
  ],

  // Samarqand viloyati
  samarqand: [
    { name: 'Samarqand', keywords: 'samarqand,samarkand,samarkand shahri' },
    { name: 'Bulung\'ur', keywords: 'bulung\'ur,bulungur' },
    { name: 'Ishtixon', keywords: 'ishtixon,ishtikhon' },
    { name: 'Jomboy', keywords: 'jomboy,jambay' },
    { name: 'Kattaqo\'rg\'on', keywords: 'kattaqo\'rg\'on,kattakurgan,kattaqurgon' },
    { name: 'Narpay', keywords: 'narpay' },
    { name: 'Nurobod', keywords: 'nurobod,nurabad' },
    { name: 'Oqdaryo', keywords: 'oqdaryo,akdarya' },
    { name: 'Payariq', keywords: 'payariq,payarik' },
    { name: 'Pastdarg\'om', keywords: 'pastdarg\'om,pastdargom' },
    { name: 'Paxtachi', keywords: 'paxtachi,pakhtachi' },
    { name: 'Qo\'shrabot', keywords: 'qo\'shrabot,qushrabat,kushrabat' },
    { name: 'Samarqand tumani', keywords: 'samarqand tumani,samarkand rayon' },
    { name: 'Toyloq', keywords: 'toyloq,toylak' },
    { name: 'Urgut', keywords: 'urgut' }
  ],

  // Buxoro viloyati
  buxoro: [
    { name: 'Buxoro', keywords: 'buxoro,bukhara,bukhara shahri' },
    { name: 'Olot', keywords: 'olot,alat' },
    { name: 'G\'ijduvon', keywords: 'g\'ijduvon,gijduvan,ghijduvon' },
    { name: 'Jondor', keywords: 'jondor' },
    { name: 'Kogon', keywords: 'kogon,kagan' },
    { name: 'Qorako\'l', keywords: 'qorako\'l,karakol,karakul' },
    { name: 'Qorovulbozor', keywords: 'qorovulbozor,karavulbazar' },
    { name: 'Peshku', keywords: 'peshku' },
    { name: 'Romitan', keywords: 'romitan' },
    { name: 'Shofirkon', keywords: 'shofirkon,shafrikan' },
    { name: 'Vobkent', keywords: 'vobkent,vabkent' }
  ],

  // Qashqadaryo viloyati
  qashqadaryo: [
    { name: 'Qarshi', keywords: 'qarshi,karshi' },
    { name: 'Shaxrisabz', keywords: 'shaxrisabz,shahrisabz,shakhrisabz' },
    { name: 'Chiroqchi', keywords: 'chiroqchi,chirakchi' },
    { name: 'Dehqonobod', keywords: 'dehqonobod,dekhkanabad' },
    { name: 'G\'uzor', keywords: 'g\'uzor,guzar,ghuzor' },
    { name: 'Kasbi', keywords: 'kasbi,kasbi tumani' },
    { name: 'Kitob', keywords: 'kitob,kitab' },
    { name: 'Koson', keywords: 'koson,kassan' },
    { name: 'Mirishkor', keywords: 'mirishkor' },
    { name: 'Muborak', keywords: 'muborak' },
    { name: 'Nishon', keywords: 'nishon,nishan' },
    { name: 'Qamashi', keywords: 'qamashi,kamashi' },
    { name: 'Qarshi tumani', keywords: 'qarshi tumani,karshi rayon' },
    { name: 'Shahrisabz tumani', keywords: 'shahrisabz tumani' },
    { name: 'Yakkabog\'', keywords: 'yakkabog\',yakkabag,yakkabagh' }
  ],

  // Jizzax viloyati
  jizzax: [
    { name: 'Jizzax', keywords: 'jizzax,jizzak,jizzakh' },
    { name: 'Arnasoy', keywords: 'arnasoy' },
    { name: 'Baxmal', keywords: 'baxmal,bakhmal' },
    { name: 'Do\'stlik', keywords: 'do\'stlik,dustlik' },
    { name: 'Forish', keywords: 'forish,farish' },
    { name: 'G\'allaorol', keywords: 'g\'allaorol,gallaorol,gallaaral' },
    { name: 'Sharof Rashidov', keywords: 'sharof rashidov,zafarobod,zafarabad' },
    { name: 'Mirzacho\'l', keywords: 'mirzacho\'l,mirzachul' },
    { name: 'Paxtakor', keywords: 'paxtakor,pakhtakor' },
    { name: 'Yangiobod', keywords: 'yangiobod,yangiabad' },
    { name: 'Zafarobod', keywords: 'zafarobod,zafarabad' },
    { name: 'Zarbdor', keywords: 'zarbdor' },
    { name: 'Zomin', keywords: 'zomin' }
  ],

  // Xorazm viloyati
  xorazm: [
    { name: 'Urganch', keywords: 'urganch,urgench' },
    { name: 'Xiva', keywords: 'xiva,khiva' },
    { name: 'Bog\'ot', keywords: 'bog\'ot,bagat,bogat' },
    { name: 'Gurlan', keywords: 'gurlan,gurlen' },
    { name: 'Qo\'shko\'pir', keywords: 'qo\'shko\'pir,qushkupir,kushkupir' },
    { name: 'Shovot', keywords: 'shovot,shavat' },
    { name: 'Tuproqqal\'a', keywords: 'tuproqqal\'a,tupraqqala,toprakqala' },
    { name: 'Urganch tumani', keywords: 'urganch tumani,urgench rayon' },
    { name: 'Xazorasp', keywords: 'xazorasp,khazarasp,khazorasp' },
    { name: 'Xonqa', keywords: 'xonqa,khanka,honqa' },
    { name: 'Yangiariq', keywords: 'yangiariq,yangiarik' },
    { name: 'Yangibozor', keywords: 'yangibozor,yangibazar' }
  ],

  // Surxondaryo viloyati
  surxondaryo: [
    { name: 'Termiz', keywords: 'termiz,termez' },
    { name: 'Angor', keywords: 'angor' },
    { name: 'Boysun', keywords: 'boysun,baysun' },
    { name: 'Denov', keywords: 'denov,denau' },
    { name: 'Jarqo\'rg\'on', keywords: 'jarqo\'rg\'on,jarkurgan' },
    { name: 'Muzrabot', keywords: 'muzrabot,muzrabat' },
    { name: 'Oltinsoy', keywords: 'oltinsoy,altinsay' },
    { name: 'Qiziriq', keywords: 'qiziriq,kizirik' },
    { name: 'Qumqo\'rg\'on', keywords: 'qumqo\'rg\'on,kumkurgan' },
    { name: 'Sho\'rchi', keywords: 'sho\'rchi,shorchi' },
    { name: 'Termiz tumani', keywords: 'termiz tumani,termez rayon' },
    { name: 'Uzun', keywords: 'uzun' }
  ],

  // Navoiy viloyati
  navoiy: [
    { name: 'Navoiy', keywords: 'navoiy,navoi' },
    { name: 'Zarafshon', keywords: 'zarafshon,zerafshan' },
    { name: 'Konimex', keywords: 'konimex,kanimekh' },
    { name: 'Karmana', keywords: 'karmana' },
    { name: 'Qiziltepa', keywords: 'qiziltepa,kiziltepa' },
    { name: 'Navbahor', keywords: 'navbahor,navbahor tumani' },
    { name: 'Nurota', keywords: 'nurota,nurata' },
    { name: 'Tomdi', keywords: 'tomdi' },
    { name: 'Uchquduq', keywords: 'uchquduq,uchkuduk' },
    { name: 'Xatirchi', keywords: 'xatirchi,khatirchi' }
  ],

  // Sirdaryo viloyati
  sirdaryo: [
    { name: 'Guliston', keywords: 'guliston,gulistan' },
    { name: 'Boyovut', keywords: 'boyovut,bayaut' },
    { name: 'Oqoltin', keywords: 'oqoltin,akaltyn' },
    { name: 'Sardoba', keywords: 'sardoba,sardarya' },
    { name: 'Sayhunobod', keywords: 'sayhunobod,syrdarya,saykhunabad' },
    { name: 'Sirdaryo tumani', keywords: 'sirdaryo tumani,syrdarya rayon' },
    { name: 'Xovos', keywords: 'xovos,khavas' }
  ],

  // Toshkent viloyati
  toshkent: [
    { name: 'Toshkent', keywords: 'toshkent,tashkent' },
    { name: 'Angren', keywords: 'angren' },
    { name: 'Bekobod', keywords: 'bekobod,bekabad' },
    { name: 'Chirchiq', keywords: 'chirchiq,chirchik' },
    { name: 'Olmaliq', keywords: 'olmaliq,almalyk' },
    { name: 'Ohangaron', keywords: 'ohangaron,akhangaran' },
    { name: 'Yangiyol', keywords: 'yangiyol,yangiyo\'l' },
    { name: 'Bo\'ka', keywords: 'bo\'ka,buka,boka' },
    { name: 'Bo\'stonliq', keywords: 'bo\'stonliq,bostanlyk' },
    { name: 'Chinoz', keywords: 'chinoz,chinaz' },
    { name: 'Qibray', keywords: 'qibray,kibray' },
    { name: 'Oqqo\'rg\'on', keywords: 'oqqo\'rg\'on,akkurgan,okkurgon' },
    { name: 'Parkent', keywords: 'parkent' },
    { name: 'Piskent', keywords: 'piskent' },
    { name: 'Quyichirchiq', keywords: 'quyichirchiq,kuyichirchik' },
    { name: 'Yuqorichirchiq', keywords: 'yuqorichirchiq,yukari chirchik' },
    { name: 'Zangiota', keywords: 'zangiota,zangiata' },
    { name: 'O\'rtachirchiq', keywords: 'o\'rtachirchiq,urta chirchik' }
  ]
};

async function expandRegionsToDistricts() {
  console.log('📋 Viloyat yo\'nalishlarini tumanlar bo\'yicha kengaytirish...\n');

  const allRoutes = await getAllRoutes();
  let newRoutesCreated = 0;
  let viloyatRoutesFound = 0;

  for (const route of allRoutes) {
    // Viloyat yo'nalishini aniqlash
    const fromRegion = route.from_keywords.toLowerCase().split(',')[0].trim();
    const toKeywords = route.to_keywords;

    // Agar bu viloyat bo'lsa
    if (REGIONS_DISTRICTS[fromRegion]) {
      viloyatRoutesFound++;
      console.log(`\n✅ Viloyat topildi: ${fromRegion} → ${route.name.split(' → ')[1]}`);
      console.log(`   Tumanlar: ${REGIONS_DISTRICTS[fromRegion].length} ta`);

      // Har bir tuman uchun alohida yo'nalish yaratish
      for (const district of REGIONS_DISTRICTS[fromRegion]) {
        try {
          const newRouteName = `${district.name} → ${route.name.split(' → ')[1]}`;

          // Mavjudligini tekshirish
          const existingRoute = allRoutes.find(r => r.name === newRouteName);
          if (existingRoute) {
            console.log(`   ⏭  ${newRouteName} - allaqachon mavjud`);
            continue;
          }

          // Yangi yo'nalish yaratish
          await createRoute(
            newRouteName,
            district.keywords,
            toKeywords,
            route.sms_template || '',
            route.time_window_minutes || 120
          );

          newRoutesCreated++;
          console.log(`   ➕ ${newRouteName} - yaratildi`);
        } catch (error) {
          console.error(`   ❌ ${district.name} - xato:`, error.message);
        }
      }
    }
  }

  console.log(`\n\n📊 Natija:`);
  console.log(`   Viloyat yo'nalishlari topildi: ${viloyatRoutesFound} ta`);
  console.log(`   Yangi tuman yo'nalishlari yaratildi: ${newRoutesCreated} ta`);
  console.log(`\n✅ Tayyor! Endi ${newRoutesCreated} ta yangi yo'nalish bor.`);

  process.exit(0);
}

expandRegionsToDistricts().catch(error => {
  console.error('❌ Xato:', error);
  process.exit(1);
});
