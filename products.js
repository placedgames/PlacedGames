function getRubPrice(usdPrice, isOld = false) {
  return Math.round(parseFloat(usdPrice) * (isOld ? 95 : 92));
}

function makeProducts(raw, prefix) {
  return raw.map(p => {
    const extraImages = p[13] || [];
    const images = [p[9], ...extraImages].filter(Boolean);
    return {
      id: prefix + p[0],
      name: p[1],
      price: p[10] ?? getRubPrice(p[2]),
      oldPrice: p[11] ?? getRubPrice(p[3], true),
      rubOnly: p[12] ?? false,
      label: p[4], category: p[5], maxQty: p[6],
      conflictGroup: p[7].map(id => prefix + id),
      warn: p[8],
      image: p[9],   
      images,
      bundleItems: p[14] || null   
    };
  });
}

  // Brawl Stars
  const brawlRaw = [
  // 01 Пропуски
  ["0101", "Brawl Pass", "8.99", "8.99", "Пропуск", "Пропуски", 1, ["0101","0102","0103"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/BrawlPass.JPEG"],
  ["0102", "Brawl Pass Plus", "12.99", "12.99", "Пропуск", "Пропуски", 1, ["0101","0102","0103"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/BrawlPassPlus.JPEG"],
  ["0103", "Улучш. до BP+", "4.99", "4.99", "Пропуск", "Пропуски", 1, ["0101","0102","0103"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/BrawlPassPlus.JPEG"],
  ["0104", "Pro Pass", "24.99", "24.99", "Пропуск", "Пропуски", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ProPass.JPEG"],

  // 02 Боец Нори
  //["0201", "Боец Нори", "24.99", "24.99", "Боец Нори", "Боец Нори", 1, ["0201","0202","0203"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Nori.JPEG"],
  //["0202", "Набор: Нори", "29.99", "29.99", "Боец Нори", "Боец Нори", 1, ["0201","0202","0203"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Nori.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriGT1.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriGT2.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriSP1.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriSP2.JPEG"],
  //["Боец Нори", "Гаджет «Сеть для рыбы»", "Гаджет «Рыбный перекус»", "Зв. сила «Весь в маму»", "Зв. сила «Крупный улов»"]],
  //["0203", "Набор: Нори", "37.99", "37.99", "Боец Нори", "Боец Нори", 1, ["0201","0202","0203"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Nori.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/PR11.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriGT1.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriGT2.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriSP1.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriSP2.JPEG"],
  //["Боец Нори", "Улучшение до 11 силы", "Гаджет «Сеть для рыбы»", "Гаджет «Рыбный перекус»", "Зв. сила «Весь в маму»", "Зв. сила «Крупный улов»"]],
  
  // 03 Гиперзарядные скины
  //["0301", "Монарх Рико", "16.99", "16.99", "Гипер. скин", "Гипер. скины", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/0be3e4ba65f42da3d73f1a29c8e9b20d7f680baa32d7d2ba83d0b088cd0c9b8e/brawlstars.29000920-x1-Skin_5000000-x250-Gems_5000001-x1500-Coins.png"],
  //["0302", "Кристальный монарх Рико", "16.99", "16.99", "Гипер. скин", "Гипер. скины", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/718a2b8d839df2274c2fae1cff838514648f1e3167320d1add4c6452929929c0/brawlstars.29000926-x1-Skin_5000001-x3000-Coins_5000022-x500-PowerPoints.png"],
  //["0303", "Блинговый монарх Рико", "16.99", "16.99", "Гипер. скин", "Гипер. скины", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/a404d18b7d0eee32a92b53c8b1a58a67f22377e3cbf60ddbf7b9436e4ffc0f38/brawlstars.29000925-x1-Skin_5000023-x10000-Bling_5000001-x1000-Coins.png"],

  // 04 Моя геройская академия
  //["0401", "Набор: MHA", "32.99", "32.99", "MHA", "Hero Academy", 1, ["0401","0402","0403","0404","0405"], true, "https://store.supercell.com/assets/offer-images/brawlstars/df876f611fb401294842243f161f4d32c5ee10a9381114ce27aedb75bdb6cac8/brawlstars.29001603-x1-Skin_29001598-x1-Skin_29001597-x1-Skin_29001596-x1-Skin.png"],
  //["0402", "Томура Сигараки Гас", "9.99", "9.99", "MHA", "Hero Academy", 1, ["0401","0402"], true, "https://store.supercell.com/assets/offer-images/brawlstars/c4750e2c419aad6253eccdc2be2f7aefca730e5a91667d60d5943125075c7226/brawlstars.29001597-x1-Skin.png"],
  //["0403", "Деку Фэнг", "7.99", "7.99", "MHA", "Hero Academy", 1, ["0401","0403"], true, "https://store.supercell.com/assets/offer-images/brawlstars/045fdd3cf0c31c2f5d269919227048617b4e693ede08071e6174de7867131132/brawlstars.29001598-x1-Skin.png"],
  //["0404", "Всемогущий Эль Примо", "13.99", "13.99", "MHA", "Hero Academy", 1, ["0401","0404"], true, "https://store.supercell.com/assets/offer-images/brawlstars/cd373618e8c19d219c0c127fd6fe1c8ec8e3587c744de3b08c7cfca39649ee8c/brawlstars.29001603-x1-Skin.png"],
  //["0405", "Бакуго Эдгар", "9.99", "9.99", "MHA", "Hero Academy", 1, ["0401","0405"], true, "https://store.supercell.com/assets/offer-images/brawlstars/05d23915f6f720cba5b06b728e5b17369ee9dc70b2eecbecfb76f4b277eb5c6b/brawlstars.29001596-x1-Skin.png"],
  //["0406", "Уравити Джанет", "7.99", "7.99", "MHA", "Hero Academy", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/567884c788d3b7ddd622c00b7f9455b95c80f9ee77938a2d2b59256dcb4365f0/brawlstars.29001595-x1-Skin.png"],

  // 05 Летн. распродажа
  //["0501", "300 гемов", "9.99", "9.99", "Летн. распродажа", "Летн. распродажа", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/360Gems.JPEG"],
  //["0502", "10000 блингов", "4.99", "4.99", "Летн. распродажа", "Летн. распродажа", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],

  // 06 Strikers
  //["0601", "Набор: 3 скина", "24.99", "24.99", "Strikers", "Strikers", 1, ["0601","0602"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/StrikersSet.JPEG"],
  //["0602", "Табло Вольт", "9.99", "9.99", "Strikers", "Strikers", 1, ["0601","0602"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TabloVolt.JPEG"],
  //["0603", "Судья Милп", "9.99", "9.99", "Strikers", "Strikers", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/JudgeMilp.JPEG"],
  //["0604", "Суперфорвард Лу", "14.99", "14.99", "Strikers", "Strikers", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SuperforwardLu.JPEG"],
  
  // 07 Виндсток
  //["0702", "Скин: Виндсток грей", "14.99", "14.99", "Виндсток", "Виндсток", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/WindstockGray.JPEG",],
  //["0703", "Скин: Турбина мо", "9.99", "9.99", "Виндсток", "Виндсток", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TurbineMo.JPEG",],
  //["0704", "Скин: Заряженный спраут", "9.99", "9.99", "Виндсток", "Виндсток", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ChargedSprout.JPEG",],
  //["0705", "Скин: Матёрый кэндзи", "9.99", "9.99", "Виндсток", "Виндсток", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/MatureKenji.JPEG",],
  
  // 08 Хеллоуин
  ["0801", "Скин: Доктор белльштейн", "9.99", "9.99", "Хеллоуин", "Хеллоуин", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/DR.BELLENSTEIN.JPEG"],
  ["0802", "Скин: Страхонавт дэмиан", "14.99", "14.99", "Хеллоуин", "Хеллоуин", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TERRORNAUTDAMIAN.JPEG"],
  ["0803", "Скин: Чудовище пайпер", "9.99", "9.99", "Хеллоуин", "Хеллоуин", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/BELLENSTEINMONSTER.JPEG"],
  ["0804", "Скин: Пламенный гонщик чак", "9.99", "9.99", "Хеллоуин", "Хеллоуин", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLAMERIDERCHUCK.JPEG"],
  ["0805", "Скин: Зомброк", "1.99", "1.99", "Хеллоуин", "Хеллоуин", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZOMBROCK.JPEG"],
  ["0806", "Скин: Тёмный честер", "1.99", "1.99", "Хеллоуин", "Хеллоуин", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/DARKCHESTER.JPEG"],
  ["0807", "Скин: Адский чак", "1.99", "1.99", "Хеллоуин", "Хеллоуин", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/INFERNOCHUCK.JPEG"],

  // 09 Esports скины
  //["0901", "Победитель Отис", "4.99", "4.99", "Esports", "Esports", 1, [], true, "https://storage.botpapa.me/files/12adebb0-505b-11f1-bef9-f1ec7a2c6e45.jpeg"],
  //["0902", "Чемпион мира Гас", "4.99", "4.99", "Esports", "Esports", 1, [], true, "https://storage.botpapa.me/files/0de56720-505b-11f1-bef9-f1ec7a2c6e45.jpeg"],
  //["0903", "Яростная Тара", "4.99", "4.99", "Esports", "Esports", 1, [], true, "https://storage.botpapa.me/files/08e35c00-505b-11f1-bef9-f1ec7a2c6e45.jpeg"],
  //["0904", "Фанат Фэнг", "4.99", "4.99", "Esports", "Esports", 1, [], true, "https://storage.botpapa.me/files/1fdcdc10-505b-11f1-bef9-f1ec7a2c6e45.jpeg"],
  //["0905", "Хоккеист Мортис", "4.99", "4.99", "Esports", "Esports", 1, [], true, "https://storage.botpapa.me/files/cd577140-60d0-11f1-af2e-f7a93121b83b.jpeg"],
  //["0906", "Кошка-воровка Джесси", "3.99", "3.99", "Esports", "Esports", 1, [], true, "https://storage.botpapa.me/files/027f28d0-505b-11f1-bef9-f1ec7a2c6e45.jpeg"],

  // 10 Особые акции
  //["1001", "90 гемов", "0.99", "0.99", "Особая акция", "Особые акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  //["1002", "190 гемов", "5.99", "5.99", "Особая акция", "Особые акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  //["1003", "300 гемов", "9.99", "9.99", "Особая акция", "Особые акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/360Gems.JPEG"],
  //["1004", "Эль Квотербек", "4.99", "4.99", "Особая акция", "Особые акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ElQuarterback.JPEG"],
  //["1005", "Набор: 2 иконки", "2.99", "2.99", "Особая акция", "Особые акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Eagle1.JPEG", null, null, false, ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/Eagle2.JPEG"]],

  // 11 Еженедельные акции
  //["1101", "Гипнос Сенди", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://storage.botpapa.me/files/c079d530-60d0-11f1-af2e-f7a93121b83b.jpeg"],
  //["1102", "Фигурка Пенни", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://storage.botpapa.me/files/c76b2d30-60d0-11f1-af2e-f7a93121b83b.jpeg"],
  //["1103", "Равана Гром", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://storage.botpapa.me/files/ca413090-60d0-11f1-af2e-f7a93121b83b.jpeg"],
  //["1104", "Вирус Чарли", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://storage.botpapa.me/files/c3f8c2c0-60d0-11f1-af2e-f7a93121b83b.jpeg"],
  //["1105", "Злая королева Пэм", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/94f663077bdf674241b0e60705aa2949eb3e96a5c4bd9672f6540bc29b5e6d00/brawlstars.29000354-x1-Skin.png"],
  //["1106", "Арджуна Бо", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/6fe55fe9ac9cde53a0eef8ad9a63909fc063ca6cb5de88a78438f192d138f6e7/brawlstars.29000731-x1-Skin.png"],
  //["1107", "Снежная королева Амбер", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/c49da0d47d2b1873a81c33dcbd6e6b501155b205266ddfe6ec8db2a290168037/brawlstars.29000597-x1-Skin.png"],
  //["1108", "Карнавальная Менди", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/26766d0e3f1ff7b9ef68509a6b9de650255dc046f9a9b0633cb6a14995f0f360/brawlstars.29001111-x1-Skin.png"],
  //["1109", "Зевс Брок", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/ad1e2810ae49f4e2d18f6e91accdfa29aff3c35a188e7c8434c0dfa8e17f955d/brawlstars.29000656-x1-Skin.png"],
  //["1110", "Призрачный всадник Драко", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/9052f82dbec7d57547803a640d3c5b095010210866ff378b6ab3062dd75b66c4/brawlstars.29000943-x1-Skin.png"],
  //["1111", "Родео Хэнк", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/0cfd49ba9b17b30f2e64a6219d645b0504bb908afa30d82ab8568e456c227a95/brawlstars.29000700-x1-Skin.png"],
  //["1112", "Мультяшка Спайк", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CartoonSpike.JPEG"],
  //["1113", "Тор Биби", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TorBibi.JPEG"],
  //["1114", "Афина Пайпер", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/AthenaPiper.JPEG"],

  // 12 Bling Deals
  ["1201", "4000 блингов", "0.99", "0.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  ["1202", "5000 блингов", "4.99", "4.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  ["1203", "8000 блингов", "5.99", "5.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  ["1204", "8500 блингов", "5.99", "5.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  ["1205", "12000 блингов", "7.99", "7.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  ["1206", "12500 блингов", "7.99", "7.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  ["1207", "16000 блингов", "8.99", "8.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  ["1208", "20000 блингов", "8.99", "8.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
    
  // 13 Esports наборы
  ["1301", "Спрей SK Gaming", "1.89", "1.89", "Esports", "Esports", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKGAMING.JPEG"],
  //["1302", "Набор: SK Gaming", "2.49", "2.49", "Esports", "Esports", 1, ["1302","1303","1304","1305"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKIcon.JPEG"],
  //["Спрей SK Gaming", "Значок SK Gaming", "Иконка SK Gaming"]],
  //["1303", "Иконка SK Gaming", "1.19", "1.19", "Esports", "Esports", 1, ["1302","1303"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKIcon.JPEG"],
  //["1304", "Значок SK Gaming", "1.89", "1.89", "Esports", "Esports", 1, ["1302","1304"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKPin.JPEG"],
  //["1305", "Спрей SK Gaming", "1.89", "1.89", "Esports", "Esports", 1, ["1302","1305"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKSpray.JPEG"],
  
  ["1306", "Спрей ZETA Division", "1.89", "1.89", "Esports", "Esports", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETADIVISION.JPEG"],
  //["1307", "Набор: ZETA Division", "2.49", "2.49", "Esports", "Esports", 1, ["1307","1308","1309","1310"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETASpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETAPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETAIcon.JPEG"],
  //["Спрей ZETA Division", "Значок ZETA Division", "Иконка ZETA Division"]],
  //["1308", "Иконка ZETA Division", "1.19", "1.19", "Esports", "Esports", 1, ["1307","1308"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETAIcon.JPEG"],
  //["1309", "Значок ZETA Division", "1.89", "1.89", "Esports", "Esports", 1, ["1307","1309"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETAPin.JPEG"],
  //["1310", "Спрей ZETA Division", "1.89", "1.89", "Esports", "Esports", 1, ["1307","1310"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETASpray.JPEG"],
 
  ["1311", "Спрей LOUD", "1.89", "1.89", "Esports", "Esports", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUD.JPEG"],
  //["1312", "Набор: LOUD", "2.49", "2.49", "Esports", "Esports", 1, ["1312","1313","1314","1315"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUDSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUDPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUDIcon.JPEG"],
  //["Спрей LOUD", "Значок LOUD", "Иконка LOUD"]],
  //["1313", "Иконка LOUD", "1.19", "1.19", "Esports", "Esports", 1, ["1312","1313"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUDIcon.JPEG"],
  //["1314", "Значок LOUD", "1.89", "1.89", "Esports", "Esports", 1, ["1312","1314"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUDPin.JPEG"],
  //["1315", "Спрей LOUD", "1.89", "1.89", "Esports", "Esports", 1, ["1312","1315"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUDSpray.JPEG"],
  
  ["1316", "Спрей Team Heretics", "1.89", "1.89", "Esports", "Esports", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TEAMHERETICS.JPEG"],
  //["1317", "Набор: Team Heretics", "2.49", "2.49", "Esports", "Esports", 1, ["1317","1318","1319","1320"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/THSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/THPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/THIcon.JPEG"],
  //["Спрей Team Heretics", "Значок Team Heretics", "Иконка Team Heretics"]],
  //["1318", "Иконка Team Heretics", "1.19", "1.19", "Esports", "Esports", 1, ["1317","1318"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/THIcon.JPEG"],
  //["1319", "Значок Team Heretics", "1.89", "1.89", "Esports", "Esports", 1, ["1317","1319"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/THPin.JPEG"],
  //["1320", "Спрей Team Heretics", "1.89", "1.89", "Esports", "Esports", 1, ["1317","1320"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/THSpray.JPEG"],
  
  ["1321", "Спрей Reply Totem", "1.89", "1.89", "Esports", "Esports", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/REPLYTOTEM.JPEG"],
  //["1322", "Набор: Reply Totem", "2.49", "2.49", "Esports", "Esports", 1, ["1322","1323","1324","1325"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TOTEMSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/TOTEMPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TOTEMIcon.JPEG"],
  //["Спрей Reply Totem", "Значок Reply Totem", "Иконка Reply Totem"]],
  //["1323", "Иконка Reply Totem", "1.19", "1.19", "Esports", "Esports", 1, ["1322","1323"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TOTEMIcon.JPEG"],
  //["1324", "Значок Reply Totem", "1.89", "1.89", "Esports", "Esports", 1, ["1322","1324"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TOTEMPin.JPEG"],
  //["1325", "Спрей Reply Totem", "1.89", "1.89", "Esports", "Esports", 1, ["1322","1325"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TOTEMSpray.JPEG"],
 
  ["1326", "Спрей NAVI", "1.89", "1.89", "Esports", "Esports", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NATUSVINCERE.JPEG"],
  //["1327", "Набор: NAVI", "2.49", "2.49", "Esports", "Esports", 1, ["1327","1328","1329","1330"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NAVISpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/NAVIPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NAVIIcon.JPEG"],
  //["Спрей NAVI", "Значок NAVI", "Иконка NAVI"]],
  //["1328", "Иконка NAVI", "1.19", "1.19", "Esports", "Esports", 1, ["1327","1328"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NAVIIcon.JPEG"],
  //["1329", "Значок NAVI", "1.89", "1.89", "Esports", "Esports", 1, ["1327","1329"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NAVIPin.JPEG"],
  //["1330", "Спрей NAVI", "1.89", "1.89", "Esports", "Esports", 1, ["1327","1330"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NAVISpray.JPEG"],
  
  ["1331", "Спрей TRIBE Gaming", "1.89", "1.89", "Esports", "Esports", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBEGAMING.JPEG"],
  //["1332", "Набор: TRIBE Gaming", "2.49", "2.49", "Esports", "Esports", 1, ["1332","1333","1334","1335"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBESpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBEPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBEIcon.JPEG"],
  //["Спрей TRIBE Gaming", "Значок TRIBE Gaming", "Иконка TRIBE Gaming"]],
  //["1333", "Иконка TRIBE Gaming", "1.19", "1.19", "Esports", "Esports", 1, ["1332","1333"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBEIcon.JPEG"],
  //["1334", "Значок TRIBE Gaming", "1.89", "1.89", "Esports", "Esports", 1, ["1332","1334"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBEPin.JPEG"],
  //["1335", "Спрей TRIBE Gaming", "1.89", "1.89", "Esports", "Esports", 1, ["1332","1335"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBESpray.JPEG"],
  
  ["1336", "Спрей Crazy Raccoon", "1.89", "1.89", "Esports", "Esports", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRAZYRACCOON.JPEG"],
  //["1337", "Набор: Crazy Raccoon", "2.49", "2.49", "Esports", "Esports", 1, ["1337","1338","1339","1340"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRIcon.JPEG"],
  //["Спрей Crazy Raccoon", "Значок Crazy Raccoon", "Иконка Crazy Raccoon"]],
  //["1338", "Иконка Crazy Raccoon", "1.19", "1.19", "Esports", "Esports", 1, ["1337","1338"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRIcon.JPEG"],
  //["1339", "Значок Crazy Raccoon", "1.89", "1.89", "Esports", "Esports", 1, ["1337","1339"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRPin.JPEG"],
  //["1340", "Спрей Crazy Raccoon", "1.89", "1.89", "Esports", "Esports", 1, ["1337","1340"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRSpray.JPEG"],
 
  ["1341", "Спрей HMBLE", "1.89", "1.89", "Esports", "Esports", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBLE.JPEG"],
  //["1342", "Набор: HMBLE", "2.49", "2.49", "Esports", "Esports", 1, ["1342","1343","1344","1345"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBIcon.JPEG"],
  //["Спрей HMBLE", "Значок HMBLE", "Иконка HMBLE"]],
  //["1343", "Иконка HMBLE", "1.19", "1.19", "Esports", "Esports", 1, ["1342","1343"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBIcon.JPEG"],
  //["1344", "Значок HMBLE", "1.89", "1.89", "Esports", "Esports", 1, ["1342","1344"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBPin.JPEG"],
  //["1345", "Спрей HMBLE", "1.89", "1.89", "Esports", "Esports", 1, ["1342","1345"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBSpray.JPEG"],
  
  ["1346", "Спрей FUT Esports", "1.89", "1.89", "Esports", "Esports", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTESPORTS.JPEG"],
  //["1347", "Набор: FUT Esports", "2.49", "2.49", "Esports", "Esports", 1, ["1347","1348","1349","1350"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTIcon.JPEG"],
  //["Спрей FUT Esports", "Значок FUT Esports", "Иконка FUT Esports"]],
  //["1348", "Иконка FUT Esports", "1.19", "1.19", "Esports", "Esports", 1, ["1347","1348"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTIcon.JPEG"],
  //["1349", "Значок FUT Esports", "1.89", "1.89", "Esports", "Esports", 1, ["1347","1349"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTPin.JPEG"],
  //["1350", "Спрей FUT Esports", "1.89", "1.89", "Esports", "Esports", 1, ["1347","1350"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTSpray.JPEG"],

  ["1351", "Спрей FENNEL", "1.89", "1.89", "Esports", "Esports", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FENNEL.JPEG"],
  //["1352", "Набор: FENNEL", "2.49", "2.49", "Esports", "Esports", 1, ["1352","1353","1354","1355"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLIcon.JPEG"],
  //["Спрей FENNEL", "Значок FENNEL", "Иконка FENNEL"]],
  //["1353", "Иконка FENNEL", "1.19", "1.19", "Esports", "Esports", 1, ["1352","1353"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLIcon.JPEG"],
  //["1354", "Значок FENNEL", "1.89", "1.89", "Esports", "Esports", 1, ["1352","1354"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLPin.JPEG"],
  //["1355", "Спрей FENNEL", "1.89", "1.89", "Esports", "Esports", 1, ["1352","1355"], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLSpray.JPEG"],

  // 14 Набор профи
  ["1401", "Набор: Мортис", "1.79", "1.79", "Набор профи", "Набор профи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Mortis.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/RogueMortis.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  ["Боец: Мортис", "Скин: Коварный мортис", "100 гемов"]],
  ["1402", "Набор: Спайк", "2.99", "2.99", "Набор профи", "Набор профи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Spike.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/PoopSpike.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  ["Боец: Спайк", "Скин: Какашка пайк", "100 гемов"]],
  
  // 15 С возвращением!
  ["1501", "Набор: Джанет", "4.99", "4.99", "С возвращением!", "С возвращением!", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/JANET.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/FIREWINGJANET.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  ["Боец: Джанет", "Скин: Огнекрылая джанет", "100 гемов"]],
  ["1501", "Набор: Сквик", "4.99", "4.99", "С возвращением!", "С возвращением!", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SQUEAK.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/SCARABSQUEAK.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  ["Боец: Сквик", "Скин: Скарабей сквик", "100 гемов"]],
  
  // 15 Ежедневные акции
  ["1601", "625 блингов", "0.99", "0.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/BLINGS2.JPEG"],
  ["1602", "1275 блингов", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/BLINGS2.JPEG"],
  ["1603", "1375 блингов", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/BLINGS2.JPEG"],
  ["1604", "1500 блингов", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/BLINGS2.JPEG"],
  ["1605", "1700 блингов", "0.99", "0.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/BLINGS2.JPEG"],
  ["1606", "500 монет", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG"],
  ["1607", "600 монет", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG"],
  ["1608", "900 монет", "0.99", "0.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG"],
  ["1609", "1100 монет", "3.99", "3.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG"],
  ["1610", "1255 монет", "4.99", "4.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG"],
  ["1611", "1750 монет", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG"],
  ["1612", "900 очков силы", "0.99", "0.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  ["1613", "1000 очков силы", "2.99", "2.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  ["1614", "1800 очков силы", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  ["1615", "2000 очков силы", "6.99", "6.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"], 
  ["1616", "750 монет + 500 оч. силы", "4.99", "4.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  ["750 монет", "500 очков силы"]],
  ["1617", "1400 монет + 800 оч. силы", "6.99", "6.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  ["1400 монет", "800 очков силы"]],
  ["1618", "1500 монет + 900 оч. силы", "6.99", "6.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  ["1500 монет", "900 очков силы"]],
  ["1619", "2000 монет + 500 оч. силы", "7.99", "7.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  ["2000 монет", "500 очков силы"]],
  ["1620", "50 гемов", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/30Gems.JPEG"],
  ["1621", "60 гемов", "2.99", "2.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  ["1622", "90 гемов", "0.99", "0.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  ["1623", "95 гемов", "3.99", "3.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  ["1624", "100 гемов", "4.99", "4.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  ["1625", "120 гемов", "5.99", "5.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  ["1626", "140 гемов", "6.99", "6.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  ["1627", "160 гемов", "7.99", "7.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  ["1628", "180 гемов", "8.99", "8.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  ["1629", "180 гемов", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  
  // 16 Кристаллы
  ["2001", "30 гемов", "1.99", "1.99", "Кристаллы", "Кристаллы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/30Gems.JPEG"],
  ["2002", "80 гемов", "4.99", "4.99", "Кристаллы", "Кристаллы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  ["2003", "170 гемов", "8.99", "8.99", "Кристаллы", "Кристаллы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  ["2004", "360 гемов", "19.99", "19.99", "Кристаллы", "Кристаллы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/360Gems.JPEG"],
  ["2005", "950 гемов", "49.99", "49.99", "Кристаллы", "Кристаллы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/950Gems.JPEG"],
  ["2006", "2000 гемов", "99.99", "99.99", "Кристаллы", "Кристаллы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/2000Gems.JPEG"]
];
window.brawlProducts = makeProducts(brawlRaw, 'bs_');
window.products = window.brawlProducts; // для обратной совместимости

// Clash Royale
const crRaw = [
  // 01 Пропуски
  ["0101", "Pass Royale", "11.99", "11.99", "Пропуск", "Пропуски", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/PassRoyale.JPEG"],
  ["0102", "Мини-пропуск", "4.99", "4.99", "Пропуск", "Пропуски", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/MiniPass.JPEG"],
  
  // 02 Герои
  ["0201", "Герой: Мини пекка", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HMiniPekka.JPEG"],
  ["0202", "Герой: Вышибала", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HBowler.JPEG"],
  ["0203", "Герой: Мушкетёр", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HMusketeer.JPEG"],
  ["0204", "Герой: Тёмный рыцарь", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HDarkPrince.JPEG"],
  ["0205", "Герой: Колдун", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HWizard.JPEG"],
  ["0206", "Герой: Гоблины", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HGoblins.JPEG"],
  ["0207", "Герой: Шар", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HBalloon.JPEG"],
  ["0208", "Герой: Мегаминьон", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HMegaMinion.JPEG"],
  ["0209", "Герой: Надгробие", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HTombstone.JPEG"],
  ["0210", "Герой: Ледяной голем", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HIceGolem.JPEG"],
  ["0211", "Герой: Варварская бочка", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CBarbarianBarrel.JPEG"],
  ["0212", "Герой: Гигант", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CGiant.JPEG"],
  ["0213", "Герой: Магический лучник", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CMagicArcher.JPEG"],

  // 03 Чемпионы
  ["0301", "Главная бандитка: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CBossBandit.JPEG"],
  ["0302", "Гоблинштейн: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CGoblinstein.JPEG"],
  ["0303", "Маленький принц: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CLittlePrince.JPEG"],
  ["0304", "Королева лучниц: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CArcherQueen.JPEG"],
  ["0305", "Король скелетов: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CSkeletonKing.JPEG"],
  ["0306", "Золотой рыцарь: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CGoldenKnight.JPEG"],
  ["0307", "Монах: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CMonk.JPEG"],
  ["0308", "Шустрый шахтёр: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CMightyMiner.JPEG"],
 
  // 04 Лег. карты
  ["0401", "Мегарыцарь: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCMegaKnight.JPEG"],
  ["0402", "Императрица духов: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCSpiritEmpress.JPEG"],
  ["0403", "Громовержец: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCElectroWizard.JPEG"],
  ["0404", "Пламенный дракон: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCInfernoDragon.JPEG"],
  ["0405", "Шахтёр: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCMiner.JPEG"],
  ["0406", "Принцесса: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCPrincess.JPEG"],
  ["0407", "Всадница на баране: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCRamRider.JPEG"],
  ["0408", "Спарки: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCSparky.JPEG"],
  ["0409", "Бревно: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCTheLog.JPEG"],
  ["0410", "Кладбище: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCGraveyard.JPEG"],
  ["0411", "Ледяной колдун: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCIceWizard.JPEG"],
  ["0412", "Феникс: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCPhoenix.JPEG"],
  ["0413", "Королевский призрак: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCRoyalGhost.JPEG"],
  ["0414", "Гоблинская машина: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCGoblinMachine.JPEG"],
  ["0415", "Бандитка: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCBandit.JPEG"],
  ["0416", "Адская гончая: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCLavaHound.JPEG"],
  ["0417", "Магический лучник: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCMagicArcher.JPEG"],
  ["0418", "Дровосек: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCLumberjack.JPEG"],
  ["0419", "Ночная ведьма: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCNightWitch.JPEG"],
  ["0420", "Ведьмина бабушка: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCMotherWitch.JPEG"],
  ["0421", "Рыбак: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCFisherman.JPEG"],
  
  // 05 Эмодзи
  ["0501", "Эмодзи: Смыв свинья", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EHogFlush.JPEG"],
  ["0502", "Эмодзи: Тук-тук", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EKnockKnock.JPEG"],
  ["0503", "Эмодзи: Грустный мушкетёр", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESadMusketeer.JPEG"],
  ["0504", "Эмодзи: Скелетный флосс", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESkeletonFloss.JPEG"],
  ["0505", "Эмодзи: Подкравшийся голем", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESneakyGolem.JPEG"],
  ["0506", "Эмодзи: Тик-Так", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ETickTock.JPEG"],
  ["0507", "Эмодзи: Золотое сечение", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EGoldenRatio.JPEG"],
  ["0508", "Эмодзи: 6-7", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/E67.JPEG"],
  ["0509", "Эмодзи: Варварский флекс", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EBarbarianFlex.JPEG"],
  ["0510", "Эмодзи: Улыбка вышибалы", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EBowlerGrin.JPEG"],
  ["0511", "Эмодзи: Танцующий гоблин", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EDancerGoblin.JPEG"],
  ["0512", "Эмодзи: Танцующий дракон", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EDragonDance.JPEG"],
  ["0513", "Эмодзи: Яростный мушкетёр", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EFuriosMusketeer.JPEG"],
  ["0514", "Эмодзи: Плачущий гоблин", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EGoblinBoohoo.JPEG"],
  ["0515", "Эмодзи: Кашель миньона", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EGoughing.JPEG"],

  // 06 Эволюции
  ["0601", "Разряд: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESZap.JPEG"],
  ["0602", "Королевские Рекруты: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESRoyalRecruits.JPEG"],
  ["0603", "Бочка со скелетами: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESSkeletonBarrel.JPEG"],
  ["0604", "Скелеты: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESSkeletons.JPEG"],
  ["0605", "Валькирия: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESValkyrie.JPEG"],
  ["0606", "Разрушители стен: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESWallBreakers.JPEG"],
  ["0607", "Колдун: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESWizard.JPEG"],
  ["0608", "Мегарыцарь: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESMegaKnight.JPEG"],
  ["0609", "Орда миньонов: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESMinionHorde.JPEG"],
  ["0610", "Мортира: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESMortar.JPEG"],
  ["0611", "Мушкетёр: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESMusketeer.JPEG"],
  ["0612", "Пекка: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESPekka.JPEG"],
  ["0613", "Принцесса: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESPrincess.JPEG"],
  ["0614", "Королевский Призрак: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESRoyalGhost.JPEG"],
  ["0615", "Королевский Великан: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESRoyalGiant.JPEG"],
  ["0616", "Королевские Кабаны: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESRoyalHogs.JPEG"],
  ["0617", "Петарда: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESFirecracker.JPEG"],
  ["0618", "Снежок: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESGiantSnowball.JPEG"],
  ["0619", "Бочка с гоблинами: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESGoblinBarrel.JPEG"],
  ["0620", "Гоблин-бур: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESGoblinDrill.JPEG"],
  ["0621", "Гоблин-великан: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESGoblinGiant.JPEG"],
  ["0622", "Охотник: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESHunter.JPEG"],
  ["0623", "Ледяной дух: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESIceSpirit.JPEG"],
  ["0624", "Дракон Инферно: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESInfernoDragon.JPEG"],
  ["0625", "Рыцарь: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESKnight.JPEG"],
  ["0626", "Дровосек: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESLumberjack.JPEG"],
  ["0627", "Маленький дракон: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESBabyDragon.JPEG"],
  ["0628", "Летучие мыши: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESBats.JPEG"],
  ["0629", "Боевой таран: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESBattleRam.JPEG"],
  ["0630", "Бомбардир: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESBomber.JPEG"],
  ["0631", "Пушка: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESCannon.JPEG"],
  ["0632", "Гоблин с дротиками: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESDartGoblin.JPEG"],
  ["0633", "Электро-дракон: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESElectroDragon.JPEG"],
  ["0634", "Палач: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESExicutioner.JPEG"],
  ["0635", "Варвары: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESBarbarians.JPEG"],
  ["0636", "Лучницы: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESArchers.JPEG"],
  ["0637", "Тесла: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESTesla.JPEG"],
  ["0638", "Ведьма: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESWitch.JPEG"],
  ["0639", "Армия скелетов: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESSkeletonArmy.JPEG"],

  // 07 Кристаллы
  ["0701", "80 гемов", "0.99", "0.99", "Кристаллы", "Кристаллы", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/80Gems.JPEG"],
  ["0702", "500 гемов", "4.99", "4.99", "Кристаллы", "Кристаллы", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/500Gems.JPEG"],
  ["0703", "1200 гемов", "9.99", "9.99", "Кристаллы", "Кристаллы", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/1200Gems.JPEG"],
  ["0704", "2500 гемов", "19.99", "19.99", "Кристаллы", "Кристаллы", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/2500Gems.JPEG"],
  ["0705", "6500 гемов", "49.99", "49.99", "Кристаллы", "Кристаллы", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/6500Gems.JPEG"],
  ["0706", "14000 гемов", "99.99", "99.99", "Кристаллы", "Кристаллы", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/14000Gems.JPEG"],
];
window.crProducts = makeProducts(crRaw, 'cr_');

// Roblox
const robloxRaw = [
  // 01 Робуксы
  ["0101", "40 робуксов", "0.49", "0.49", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  ["0102", "80 робуксов", "0.99", "0.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  ["0103", "400 робуксов", "4.99", "4.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  ["0104", "800 робуксов", "9.99", "9.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  ["0105", "1200 робуксов", "14.99", "14.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  ["0106", "1700 робуксов", "19.99", "19.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  ["0107", "3150 робуксов", "34.99", "34.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  ["0108", "4500 робуксов", "49.99", "49.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],

];
window.robloxProducts = makeProducts(robloxRaw, 'roblox_');

// Telegram
const tgRaw = [  
  // 01 Подарки
  ["0101", "13 звёзд", null, null, "Подарок", "Подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Bear.JPEG", 22,  24,  true],
  ["0102", "21 звезда", null, null, "Подарок", "Подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Gift.JPEG", 36,  39,  true],
  ["0103", "43 звезды", null, null, "Подарок", "Подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Cake.JPEG", 72,  79,  true],
  //["0104", "85 звезд", null, null, "Подарок", "Подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Cup.JPEG", 129,  135,  true],

  // 02 Уд. подарки
  ["0201", "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Dec20P.JPEG", 72, 79, true],
  ["0202", "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Dec31B.JPEG", 72, 79, true],
  ["0203", "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Feb14B.JPEG", 72, 79, true],
  ["0204", "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Feb14H.JPEG", 72, 79, true],
  ["0205", "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Mar7B.JPEG", 72, 79, true],
  ["0206", "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Mar17B.JPEG", 72, 79, true],
  ["0207", "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Mar31B.JPEG", 72, 79, true],
  ["0208", "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Apr12B.JPEG", 72, 79, true],
  ["0209", "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/May1B.JPEG", 72, 79, true],
  ["0210", "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Jul19B.JPEG", 72, 79, true],
  ["0211", "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Aug12B.JPEG", 72, 79, true],

  // 03 Звёзды
  ["0301", "100 звёзд", null, null, "Звёзды", "Звёзды", 1, ["0301","0302","0303","0304","0305","0306","0307","0308","0309","0310","0311"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 135,  139,  true],
  ["0302", "150 звёзд", null, null, "Звёзды", "Звёзды", 1, ["0301","0302","0303","0304","0305","0306","0307","0308","0309","0310","0311"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 199,  209,  true],
  ["0303", "250 звёзд", null, null, "Звёзды", "Звёзды", 1, ["0301","0302","0303","0304","0305","0306","0307","0308","0309","0310","0311"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 329,  349,  true],
  ["0304", "350 звёзд", null, null, "Звёзды", "Звёзды", 1, ["0301","0302","0303","0304","0305","0306","0307","0308","0309","0310","0311"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 459,  489,  true],
  ["0305", "500 звёзд", null, null, "Звёзды", "Звёзды", 1, ["0301","0302","0303","0304","0305","0306","0307","0308","0309","0310","0311"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 649,  699,  true],
  ["0306", "750 звёзд", null, null, "Звёзды", "Звёзды", 1, ["0301","0302","0303","0304","0305","0306","0307","0308","0309","0310","0311"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 969,  1049,  true],
  ["0307", "1000 звёзд", null, null, "Звёзды", "Звёзды", 1, ["0301","0302","0303","0304","0305","0306","0307","0308","0309","0310","0311"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 1289,  1389,  true],
  ["0308", "1500 звёзд", null, null, "Звёзды", "Звёзды", 1, ["0301","0302","0303","0304","0305","0306","0307","0308","0309","0310","0311"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/1500Stars.JPEG", 1939,  2079,  true],
  ["0309", "2500 звёзд", null, null, "Звёзды", "Звёзды", 1, ["0301","0302","0303","0304","0305","0306","0307","0308","0309","0310","0311"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/2500Stars.JPEG", 3229,  3459,  true],
  ["0310", "5000 звёзд", null, null, "Звёзды", "Звёзды", 1, ["0301","0302","0303","0304","0305","0306","0307","0308","0309","0310","0311"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/2500Stars.JPEG", 6459,  6919,  true],
  //["0311", "10000 звёзд", null, null, "Звёзды", "Звёзды", 1, ["0301","0302","0303","0304","0305","0306","0307","0308","0309","0310","0311"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/2500Stars.JPEG", 12899,  13829,  true],

  // 04 Премиум
  ["0401", "3 мес. премиум", null, null, "Премиум", "Премиум", 1, ["0401","0402","0403"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 999, 1019, true],
  ["0402", "6 мес. премиум", null, null, "Премиум", "Премиум", 1, ["0401","0402","0403"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/1500Stars.JPEG", 1329, 1349, true],
  ["0403", "1 год премиум", null, null, "Премиум", "Премиум", 1, ["0401","0402","0403"], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/2500Stars.JPEG", 2399, 2419, true],

];
window.tgProducts = makeProducts(tgRaw, 'tg_');

const products = window.brawlProducts;
window.products = products;
