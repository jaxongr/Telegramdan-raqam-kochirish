const { query } = require('./src/database/sqlite');

async function addAllRegionRoutes() {
  console.log('\n=== BARCHA VILOYAT YO\'NALISHLARINI QO\'SHISH ===\n');

  // Barcha viloyatlar
  const regions = [
    {
      name: 'Qashqadaryo',
      keywords: 'qarshi,karshi,qarsi,қарши,карши,shahrisabz,shaxrisabz,shahrisabiz,shaxrisabiz,шахрисабз,шахрисабиз,шаҳрисабз,шаҳрисабиз,kitob,kitab,китоб,китаб,yakkabog,yakkabog\',yakkabogʻ,яккабог,яккабоғ,guzor,g\'uzor,gʻuzor,гузор,ғузор,koson,kassan,косон,кассан,chiroqchi,chirakchi,чироқчи,dehqonobod,dehkanabad,деҳқонобод,дехканабад,muborak,mubarak,муборак,nishon,nishon,нишон,kamashi,qamashi,камаши,қамаши'
    },
    {
      name: 'Samarqand',
      keywords: 'samarqand,samarkand,самарқанд,самарканд,kattaqorgon,kattakurgan,каттақўрғон,каттакурган,urgut,ургут,pastdargom,пастдарғом,bulungur,булунғур,jomboy,жомбой,ishtixon,иштихон,qoshrabot,қўшработ,payariq,паярық,oqdaryo,оқдарё,nurobod,нурабод'
    },
    {
      name: 'Surxondaryo',
      keywords: 'termiz,termez,термиз,термез,denov,denau,денов,денау,qumqorgon,kumkurgan,қумқўрғон,кумкурган,boysun,бойсун,jarqorgon,жарқўрғон,sherobod,шеробод,muzrabot,музработ,oltinsoy,олтинсой,sariosiyo,сариосиё,uzun,узун,anghor,ангор,qiziriq,қизириқ,bandixon,бандихон'
    },
    {
      name: 'Jizzax',
      keywords: 'jizzax,jizzah,жиззах,джизак,zomin,зомин,forish,фориш,gallaorol,gallaaral,ғаллаорол,ғаллаарал,zafarobod,зафаробод,zarbdor,зарбдор,dostlik,дўстлик,mirzachul,мирзачўл,paxtakor,пахтакор,yangiobod,янгиобод,sharof,шароф,rashidov,рашидов'
    },
    {
      name: 'Buxoro',
      keywords: 'buxoro,bukhara,бухоро,бухара,kogon,kagan,когон,каган,gijduvon,ғиждувон,vobkent,вобкент,romitan,ромитан,peshku,пешку,shofirkon,шофиркон,qorako\'l,қоракўл,каракуль,alat,олот,jondor,жондор,qorovulbozor,қоровулбозор'
    },
    {
      name: 'Navoiy',
      keywords: 'navoiy,navoi,навоий,навои,zarafshon,зарафшон,kyzyltepa,qiziltepa,қизилтепа,кызылтепа,uchquduq,учкудук,nurota,нурота,tomdi,томди,xatirchi,хатирчи,navbahor,навбаҳор,konimex,конимех,karmana,қармана'
    },
    {
      name: 'Xorazm',
      keywords: 'urganch,urgench,урганч,ургенч,xiva,khiva,хива,xonqa,ханка,хонқа,ханка,qoshkopir,qoshko\'pir,қўшкўпир,кушкупыр,shovot,шовот,gurlan,гурлан,yangiariq,янгиариқ,yangibozor,янгибозор,hazorasp,ҳазорасп,bogot,боғот,tuproqqala,тупроққала'
    },
    {
      name: 'Andijon',
      keywords: 'andijon,andijan,андижон,андижан,asaka,асака,marhamat,марҳамат,xojaobod,хўжаобод,oltinkol,олтинкўл,baliqchi,балиқчи,boz,боз,jalaquduq,жалақудуқ,izboskan,избоскан,ulugnor,улуғнор,qorgontepa,қўрғонтепа,shahrixon,шаҳрихон,paxtaobod,пахтаобод'
    },
    {
      name: 'Namangan',
      keywords: 'namangan,наманган,pop,pap,поп,пап,uchqorgon,учқўрғон,kosonsoy,косонсой,chortoq,чортоқ,chust,чуст,torakorgan,тўрақўрғон,uychi,уйчи,yangiqorgon,янгиқўрғон,norin,норин,mingbuloq,мингбулоқ'
    },
    {
      name: 'Fargona',
      keywords: 'fargona,fergana,фарғона,фергана,margilan,margilon,марғилон,маргилан,quva,қува,qoqon,kokand,қўқон,коканд,rishton,риштон,oltiariq,олтиариқ,bagdod,бағдод,beshariq,бешариқ,buvayda,бувайда,dangara,данғара,furqat,фурқат,toshloq,тошлоқ,uchkoprik,учкўприк,yozyovon,ёзёвон,sox,сўх'
    },
    {
      name: 'Sirdaryo',
      keywords: 'guliston,gulistan,гулистон,гулистан,sirdaryo,syrdarya,сирдарё,сырдарья,yangiyer,янгиер,sayxunobod,сайхунобод,xovos,ховос,boyovut,боёвут,mirzaobod,мирзаобод,oqoltin,оқолтин,sardoba,сардоба'
    },
    {
      name: 'Qoraqalpogiston',
      keywords: 'nukus,нукус,tortkol,тўрткўл,beruniy,беруний,qongirot,қўнғирот,moynaq,muynak,мўйноқ,муйнак,taxtakopir,тахтакўпир,kegeyli,кегейли,chimboy,чимбой,qaraozak,қараўзак,shomanay,шоманай,amudaryo,амударё,ellikqala,элликқала'
    }
  ];

  const toshkentKeywords = 'toshkent,tashkent,ташкент,тошкент';

  let addedCount = 0;
  let errorCount = 0;

  for (const region of regions) {
    try {
      // Viloyat -> Toshkent
      const route1Name = `${region.name} → Toshkent`;

      // Check if already exists
      const exists1 = await query(
        'SELECT id FROM routes WHERE name = ?',
        [route1Name]
      );

      if (exists1.length === 0) {
        await query(
          `INSERT INTO routes (name, from_keywords, to_keywords, from_region, to_region, use_region_matching, active, sms_template, time_window_minutes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            route1Name,
            region.keywords,
            toshkentKeywords,
            region.name.toLowerCase(),
            'toshkent',
            1, // use_region_matching
            1, // active
            `Assalomu alaykum! ${region.name}dan Toshkentga yo'lovchi kerakmi? Tel: {{phone}}`,
            120 // 2 soat
          ]
        );
        console.log(`✅ Qo'shildi: ${route1Name}`);
        addedCount++;
      } else {
        console.log(`⚠️  Mavjud: ${route1Name}`);
      }

      // Toshkent -> Viloyat
      const route2Name = `Toshkent → ${region.name}`;

      const exists2 = await query(
        'SELECT id FROM routes WHERE name = ?',
        [route2Name]
      );

      if (exists2.length === 0) {
        await query(
          `INSERT INTO routes (name, from_keywords, to_keywords, from_region, to_region, use_region_matching, active, sms_template, time_window_minutes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            route2Name,
            toshkentKeywords,
            region.keywords,
            'toshkent',
            region.name.toLowerCase(),
            1, // use_region_matching
            1, // active
            `Assalomu alaykum! Toshkentdan ${region.name}ga yo'lovchi kerakmi? Tel: {{phone}}`,
            120 // 2 soat
          ]
        );
        console.log(`✅ Qo'shildi: ${route2Name}`);
        addedCount++;
      } else {
        console.log(`⚠️  Mavjud: ${route2Name}`);
      }

    } catch (error) {
      console.error(`❌ Xato (${region.name}):`, error.message);
      errorCount++;
    }
  }

  console.log(`\n=== NATIJA ===`);
  console.log(`✅ Qo'shildi: ${addedCount} ta yo'nalish`);
  console.log(`❌ Xato: ${errorCount} ta`);

  const totalRoutes = await query('SELECT COUNT(*) as total FROM routes');
  console.log(`📊 Jami yo'nalishlar: ${totalRoutes[0].total}`);

  const regionRoutes = await query('SELECT COUNT(*) as total FROM routes WHERE use_region_matching = 1');
  console.log(`🌍 Viloyat yo'nalishlari: ${regionRoutes[0].total}`);
}

addAllRegionRoutes().catch(console.error);