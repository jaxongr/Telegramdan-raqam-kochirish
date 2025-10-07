/**
 * LOGISTIKA VA SHAHARLARARO TAKSI KALIT SO'ZLAR BAZASI
 * 500+ kalit so'z - O'zbekiston transport va logistika uchun
 */

// O'ZBEKISTON SHAHARLARI (Barcha viloyat va asosiy shaharlar)
const UZBEKISTAN_CITIES = [
  // Toshkent
  'toshkent', 'tashkent', 'ташкент', 'олмалик', 'olmaliq', 'angren', 'ангрен',
  'chirchiq', 'chirchik', 'чирчик', 'ohangaron', 'ахангаран', 'bekobod', 'бекабад',
  'yangiyol', 'янгиюл', 'parkent', 'паркент', 'toytepa', 'тойтепа',

  // Samarqand
  'samarqand', 'samarkand', 'самарканд', 'kattaqorgon', 'kattaqurgan', 'каттакурган',
  'jomboy', 'jambay', 'джамбай', 'urgut', 'ургут', 'payariq', 'паярык',

  // Buxoro
  'buxoro', 'bukhara', 'бухара', 'kogon', 'kagan', 'каган', 'olot', 'алат',
  'gijduvon', 'гиждуван', 'vobkent', 'вабкент', 'romitan', 'ромитан',

  // Xorazm
  'urganch', 'urgench', 'ургенч', 'xiva', 'khiva', 'хива', 'hazorasp', 'хазарасп',
  'shovot', 'шават', 'qoshkopir', 'кошкупыр', 'yangiariq', 'янгиарык',

  // Farg'ona
  'fargona', 'fergana', 'фергана', 'margilan', 'margilon', 'маргилан',
  'qoqon', 'kokand', 'коканд', 'quvasoy', 'quva', 'кува', 'rishton', 'риштан',
  'beshariq', 'бешарык', 'toshloq', 'ташлок', 'yaypan', 'яйпан',

  // Andijon
  'andijon', 'andijan', 'андижан', 'asaka', 'асака', 'shahrixon', 'шахрихан',
  'xonobod', 'ханабад', 'oltinko\'l', 'марғилон', 'baliqchi', 'балыкчи',
  'paxtaobod', 'пахтаабад', 'jalolquduq', 'жалалкудук',

  // Namangan
  'namangan', 'наманган', 'chust', 'чуст', 'pop', 'поп', 'chortoq', 'чартак',
  'kosonsoy', 'касансай', 'uchqorgon', 'учкурган', 'mingbuloq', 'мингбулак',
  'yangiqorgon', 'янгикурган', 'uychi', 'уйчи',

  // Sirdaryo
  'guliston', 'гулистан', 'sirdaryo', 'сырдарья', 'yangiyer', 'янгиер',
  'boyovut', 'баяут', 'shirin', 'ширин', 'pahtaobod', 'пахтаабад',

  // Jizzax
  'jizzax', 'jizzakh', 'джизак', 'zominsor', 'заамин', 'forish', 'фариш',
  'gagarin', 'гагарин', 'dostlik', 'дустлик', 'zomin', 'заамин',

  // Navoiy
  'navoiy', 'navoi', 'навои', 'zarafshon', 'зарафшан', 'uchquduq', 'учкудук',
  'nurota', 'нурата', 'karmana', 'кармана', 'konimex', 'канимех',

  // Qashqadaryo
  'qarshi', 'karshi', 'карши', 'shahrisabz', 'shahrisabiz', 'шахрисабз',
  'guzor', 'gʻuzor', 'гузар', 'kamashi', 'камаши', 'koson', 'касан',
  'kitob', 'китаб', 'muborak', 'мубарак', 'yakkabog', 'yakkabag', 'яккабаг',
  'chiroqchi', 'чиракчи', 'nishon', 'нишан', 'dehqonobod', 'дехканабад',

  // Surxondaryo
  'termiz', 'termez', 'термез', 'denov', 'denau', 'денау', 'sherobod', 'шеробад',
  'boysun', 'байсун', 'jarqorgon', 'жаркурган', 'qumqorgon', 'кумкурган',
  'sariosiyo', 'сариасия', 'oltinsoy', 'алтынсай',

  // Qoraqalpog'iston
  'nukus', 'нукус', 'xojayli', 'ходжейли', 'chimboy', 'чимбай',
  'moynoq', 'муйнак', 'qongirot', 'kungirot', 'кунград', 'beruniy', 'беруни',
  'taqiatosh', 'takiatash', 'такиаташ', 'shumanay', 'шуманай'
];

// QO'SHNI DAVLATLAR SHAHARLARI (Rossiya, Qozog'iston)
const NEIGHBORING_CITIES = [
  // Rossiya
  'moskva', 'moscow', 'москва', 'piter', 'petersburg', 'санкт-петербург',
  'kazan', 'казань', 'yekaterinburg', 'екатеринбург', 'samara', 'самара',
  'novosibirsk', 'новосибирск', 'chelyabinsk', 'челябинск', 'omsk', 'омск',
  'rostov', 'ростов', 'ufa', 'уфа', 'krasnoyarsk', 'красноярск',
  'voronezh', 'воронеж', 'perm', 'пермь', 'volgograd', 'волгоград',
  'krasnodar', 'краснодар', 'saratov', 'саратов', 'tyumen', 'тюмень',
  'tolyatti', 'тольятти', 'izhevsk', 'ижевск', 'barnaul', 'барнаул',
  'irkutsk', 'иркутск', 'ulyanovsk', 'ульяновск', 'vladivostok', 'владивосток',
  'yaroslavl', 'ярославль', 'tomsk', 'томск', 'orenburg', 'оренбург',
  'kemerovo', 'кемерово', 'novokuznetsk', 'новокузнецк', 'ryazan', 'рязань',
  'astrakhan', 'астрахань', 'penza', 'пенза', 'lipetsk', 'липецк',

  // Qozog'iston
  'almati', 'almaty', 'алматы', 'astana', 'nur-sultan', 'астана', 'нурсултан',
  'shymkent', 'chimkent', 'шымкент', 'aktobe', 'актобе', 'taraz', 'тараз',
  'pavlodar', 'павлодар', 'ust-kamenogorsk', 'oskemen', 'усть-каменогорск',
  'karaganda', 'караганда', 'semey', 'семей', 'aktau', 'актау', 'atirau', 'атырау',
  'kostanay', 'костанай', 'petropavl', 'петропавловск', 'kokshetau', 'кокшетау',
  'taldykorgan', 'талдыкорган', 'turkistan', 'туркестан'
];

// YO'NALISH VA HARAKAT SO'ZLARI
const DIRECTION_WORDS = [
  // Asosiy harakatlar
  'ketamiz', 'ketaman', 'ketmoqdamiz', 'ketmoqda', 'кетамиз', 'кетаман',
  'boraman', 'boramiz', 'bormoqdamiz', 'борамиз', 'бораман',
  'yuramiz', 'yuraman', 'yurmoqdamiz', 'юрамиз', 'юраман',
  'ketyapmiz', 'ketyapman', 'кетяпмиз', 'кетяпман',
  'kerak', 'керак', 'zarur', 'зарур', 'lozim', 'лозим',
  'ketyapti', 'кетяпти', 'qaytaman', 'qaytamiz', 'кайтаман', 'кайтамиз',

  // Yo'nalish belgilari
  'dan', 'дан', 'ga', 'га', 'dan', 'дан', 'tomon', 'томон',
  'ga', 'ға', 'taraf', 'тараф', 'qa', 'ка', 'ko\'cha', 'куча',
  'yo\'nalish', 'йуналиш', 'marshrut', 'маршрут',

  // Vaqt
  'bugun', 'бугун', 'ertaga', 'эртага', 'hozir', 'хозир',
  'srochno', 'срочно', 'tezda', 'тезда', 'shoshilinch', 'шошилинч',
  'soatda', 'соатда', 'minutda', 'минутда', 'kecha', 'кеча',
  'erta', 'эрта', 'kech', 'кеч', 'tun', 'тун', 'kunduzi', 'кундузи'
];

// MASHINA VA TRANSPORT TURLARI
const VEHICLE_TYPES = [
  // Yengil mashinalar
  'cobalt', 'кобалт', 'nexia', 'нексиа', 'matiz', 'матиз',
  'spark', 'спарк', 'lacetti', 'ласетти', 'gentra', 'джентра',
  'tracker', 'трекер', 'malibu', 'малибу', 'captiva', 'каптива',
  'damas', 'дамас', 'labo', 'лабо', 'kia', 'киа', 'hyundai', 'хундай',
  'toyota', 'тойота', 'honda', 'хонда', 'nissan', 'ниссан',
  'lexus', 'лексус', 'camry', 'камри', 'corolla', 'королла',
  'accent', 'акцент', 'solaris', 'солярис', 'rio', 'рио',
  'cerato', 'серато', 'sportage', 'спортаж', 'tucson', 'туксон',

  // Yuk mashinalari
  'isuzu', 'исузу', 'kamaz', 'камаз', 'fura', 'фура', 'foton', 'фотон',
  'dongfeng', 'донгфенг', 'howo', 'хово', 'shacman', 'шакман',
  'refrijerator', 'рефрижератор', 'tentli', 'тентли', 'bortli', 'бортли',
  'konteyner', 'контейнер', 'furgon', 'фургон', 'manipulyator', 'манипулятор',
  'evakuator', 'эвакуатор', 'betonomeshalka', 'бетономешалка',

  // Umumiy
  'mashina', 'машина', 'moshina', 'мошина', 'avto', 'auto', 'авто',
  'transport', 'транспорт', 'taksi', 'такси', 'mikroavtobus', 'микроавтобус'
];

// LOGISTIKA VA YUK SO'ZLARI
const LOGISTICS_WORDS = [
  // Asosiy logistika
  'logistik', 'logistika', 'логистик', 'логистика',
  'dispecher', 'dispetcher', 'диспечер', 'диспетчер',
  'perevozka', 'перевозка', 'tashish', 'ташиш', 'tashuvchi', 'ташувчи',
  'haydovchi', 'хайдовчи', 'voditel', 'водитель', 'shofyor', 'шофёр',

  // Yuk turlari
  'yuk', 'юк', 'yuklar', 'юклар', 'груз', 'gruz', 'cargo', 'карго',
  'pochta', 'почта', 'посылка', 'posilka', 'bagaj', 'багаж',
  'tovar', 'товар', 'maxsulot', 'махсулот', 'mol', 'мол',
  'materiallar', 'материаллар', 'jihozlar', 'жихозлар',
  'texnika', 'техника', 'asboblar', 'асбоблар',

  // Yuk og'irligi
  'tonna', 'тонна', 'kg', 'кг', 'kilogram', 'килограмм',
  'yengil', 'енгил', 'og\'ir', 'огир', 'hajmli', 'хажмли',

  // Xizmatlar
  'dostavka', 'доставка', 'yetkazib berish', 'етказиб бериш',
  'yuklash', 'юклаш', 'tushirish', 'тушириш', 'pochta', 'почта',
  'express', 'экспресс', 'tezkor', 'тезкор'
];

// ODAMLAR VA JOY SO'ZLARI
const PASSENGER_WORDS = [
  // Yo'lovchilar
  'odam', 'одам', 'kishi', 'киши', 'passajir', 'пассажир',
  'yo\'lovchi', 'йуловчи', 'людей', 'lyudey',

  // Sonlar
  'bitta', 'битта', '1ta', '1-ta', 'ikki', 'икки', '2ta', '2-ta',
  'uch', 'уч', '3ta', '3-ta', 'tort', 'турт', '4ta', '4-ta',

  // Joylar
  'joy', 'жой', 'место', 'mesta', 'o\'rin', 'урин',
  'bo\'sh', 'буш', 'bor', 'бор', 'mavjud', 'мавжуд',
  'qoldi', 'колди', 'ochiq', 'очик', 'свободн', 'свободно'
];

// NARX VA TO'LOV SO'ZLARI
const PRICE_WORDS = [
  // Pul birliklari
  'som', 'сум', 'ming', 'минг', 'mln', 'млн', 'million', 'миллион',
  'rubl', 'рубль', 'dollar', 'доллар', 'evro', 'евро',

  // Narx
  'narx', 'нарх', 'narxi', 'нархи', 'цена', 'цени', 'стоимость', 'стоимост',
  'arzon', 'арзон', 'qimmat', 'киммат', 'tushunishib', 'тушунишиб',
  'kelishish', 'келишиш', 'kelishamiz', 'келишамиз', 'договор', 'договорн',

  // To'lov
  'to\'lov', 'тулов', 'оплата', 'uplata', 'nal', 'нал', 'nalichka', 'наличка',
  'beznal', 'безнал', 'karta', 'карта', 'перевод', 'перечисл'
];

// QO'SHIMCHA SIGNAL SO'ZLARI
const ADDITIONAL_KEYWORDS = [
  // Aloqa
  'telefon', 'телефон', 'raqam', 'ракам', 'номер', 'nomer',
  'aloqa', 'алока', 'связь', 'svyaz', 'qo\'ng\'iroq', 'кунгирок',
  'звонок', 'zvonok', 'yozing', 'ёзинг', 'напишите', 'пишите',

  // Sharoit
  'obhavo', 'обхаво', 'погода', 'pogoda', 'yo\'l', 'йул',
  'doroga', 'дорога', 'trassa', 'трасса', 'serpantin', 'серпантин',
  'to\'g\'ri', 'тугри', 'paputi', 'попути', 'попутка', 'poputka',

  // Holat
  'tayyor', 'тайёр', 'готов', 'gotov', 'olib', 'олиб',
  'ketamiz', 'кетамиз', 'chiqamiz', 'чикамиз', 'turamiz', 'турамиз',
  'kelamiz', 'келамиз', 'yetib', 'етиб', 'yetkazamiz', 'етказамиз',

  // Maxsus so'zlar
  'kontrakt', 'контракт', 'shartnoma', 'sharnoma', 'шартнома',
  'dogovor', 'договор', 'zakaz', 'заказ', 'buyurtma', 'буюртма',
  'ishonchli', 'ишончли', 'надёжн', 'nadyojn', 'malakali', 'малакали',
  'professional', 'профессионал', 'tajribali', 'тажрибали',
  'kafolat', 'кафолат', 'гарантия', 'garantiya'
];

// BARCHA KALIT SO'ZLARNI BIRLASHTIRISH
const ALL_KEYWORDS = [
  ...UZBEKISTAN_CITIES,
  ...NEIGHBORING_CITIES,
  ...DIRECTION_WORDS,
  ...VEHICLE_TYPES,
  ...LOGISTICS_WORDS,
  ...PASSENGER_WORDS,
  ...PRICE_WORDS,
  ...ADDITIONAL_KEYWORDS
];

// Takrorlanishlarni olib tashlash va kichik harflarga o'tkazish
const UNIQUE_KEYWORDS = [...new Set(ALL_KEYWORDS.map(k => k.toLowerCase()))];

// Export
module.exports = {
  // Kategoriya bo'yicha
  UZBEKISTAN_CITIES,
  NEIGHBORING_CITIES,
  DIRECTION_WORDS,
  VEHICLE_TYPES,
  LOGISTICS_WORDS,
  PASSENGER_WORDS,
  PRICE_WORDS,
  ADDITIONAL_KEYWORDS,

  // Barchasi
  ALL_KEYWORDS: UNIQUE_KEYWORDS,

  // Soni
  TOTAL_COUNT: UNIQUE_KEYWORDS.length,

  // String sifatida (database uchun)
  KEYWORDS_STRING: UNIQUE_KEYWORDS.join(',')
};
