const USD_TO_RUB = {
  "0.99": [85, 89], "1.19": [99, 109], "1.79": [149, 159], "1.89": [159, 169], "1.99": [169, 179], "2.49": [209, 219], "2.99": [249, 269], "3.99": [339, 359], "4.99": [429, 449], "5.99": [509, 529], "6.99": [589, 619], "7.99": [679, 709], "8.99": [769, 799], "9.99": [849, 889], "10.99": [939, 979], "11.99": [1019, 1069],
  "12.99": [1099, 1159], "13.99": [1189, 1249], "14.99": [1269, 1339], "15.99": [1359, 1419], "16.99": [1439, 1509], "17.99": [1529, 1599], "18.99": [1619, 1689], "19.99": [1699, 1779],
  "24.99": [2129, 2229], "29.99": [2549, 2669], "32.99": [2799, 2939], "34.99": [2969, 3109], "37.99": [3229, 3379], "49.99": [4249, 4449], "99.99": [8489, 8899]
};

function getRubPrice(usdPrice, isOld = false) {
  const prices = USD_TO_RUB[usdPrice];
  if (prices) return isOld ? prices[1] : prices[0];
  return Math.round(parseFloat(usdPrice) * (isOld ? 89 : 85));
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
  // Пропуски
  [1, "Brawl Pass", "8.99", "8.99", "Пропуск", "Пропуски", 1, [1,2,3], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/BrawlPass.JPEG"],
  [2, "Brawl Pass Plus", "12.99", "12.99", "Пропуск", "Пропуски", 1, [1,2,3], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/BrawlPassPlus.JPEG"],
  [3, "Улучш. до BP+", "4.99", "4.99", "Пропуск", "Пропуски", 1, [1,2,3], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/BrawlPassPlus.JPEG"],
  [4, "Pro Pass", "24.99", "24.99", "Пропуск", "Пропуски", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ProPass.JPEG"],

  // Боец Нори
  //[47, "Боец Нори", "24.99", "24.99", "Боец Нори", "Боец Нори", 1, [47,48,91], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Nori.JPEG"],
  //[48, "Набор: Нори", "29.99", "29.99", "Боец Нори", "Боец Нори", 1, [47,48,91], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Nori.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriGT1.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriGT2.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriSP1.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriSP2.JPEG"],
  //["Боец Нори", "Гаджет «Сеть для рыбы»", "Гаджет «Рыбный перекус»", "Зв. сила «Весь в маму»", "Зв. сила «Крупный улов»"]],
  //[91, "Набор: Нори", "37.99", "37.99", "Боец Нори", "Боец Нори", 1, [47,48,91], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Nori.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/PR11.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriGT1.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriGT2.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriSP1.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NoriSP2.JPEG"],
  //["Боец Нори", "Улучшение до 11 силы", "Гаджет «Сеть для рыбы»", "Гаджет «Рыбный перекус»", "Зв. сила «Весь в маму»", "Зв. сила «Крупный улов»"]],
  
  // Гиперзарядные скины
  //[84, "Монарх Рико", "16.99", "16.99", "Гипер. скин", "Гипер. скины", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/0be3e4ba65f42da3d73f1a29c8e9b20d7f680baa32d7d2ba83d0b088cd0c9b8e/brawlstars.29000920-x1-Skin_5000000-x250-Gems_5000001-x1500-Coins.png"],
  //[85, "Кристальный монарх Рико", "16.99", "16.99", "Гипер. скин", "Гипер. скины", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/718a2b8d839df2274c2fae1cff838514648f1e3167320d1add4c6452929929c0/brawlstars.29000926-x1-Skin_5000001-x3000-Coins_5000022-x500-PowerPoints.png"],
  //[86, "Блинговый монарх Рико", "16.99", "16.99", "Гипер. скин", "Гипер. скины", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/a404d18b7d0eee32a92b53c8b1a58a67f22377e3cbf60ddbf7b9436e4ffc0f38/brawlstars.29000925-x1-Skin_5000023-x10000-Bling_5000001-x1000-Coins.png"],

  // Моя геройская академия
  //[49, "Набор: MHA", "32.99", "32.99", "MHA", "Hero Academy", 1, [49,50,51,52,53], true, "https://store.supercell.com/assets/offer-images/brawlstars/df876f611fb401294842243f161f4d32c5ee10a9381114ce27aedb75bdb6cac8/brawlstars.29001603-x1-Skin_29001598-x1-Skin_29001597-x1-Skin_29001596-x1-Skin.png"],
  //[50, "Томура Сигараки Гас", "9.99", "9.99", "MHA", "Hero Academy", 1, [49,50], true, "https://store.supercell.com/assets/offer-images/brawlstars/c4750e2c419aad6253eccdc2be2f7aefca730e5a91667d60d5943125075c7226/brawlstars.29001597-x1-Skin.png"],
  //[51, "Деку Фэнг", "7.99", "7.99", "MHA", "Hero Academy", 1, [49,51], true, "https://store.supercell.com/assets/offer-images/brawlstars/045fdd3cf0c31c2f5d269919227048617b4e693ede08071e6174de7867131132/brawlstars.29001598-x1-Skin.png"],
  //[52, "Всемогущий Эль Примо", "13.99", "13.99", "MHA", "Hero Academy", 1, [49,52], true, "https://store.supercell.com/assets/offer-images/brawlstars/cd373618e8c19d219c0c127fd6fe1c8ec8e3587c744de3b08c7cfca39649ee8c/brawlstars.29001603-x1-Skin.png"],
  //[53, "Бакуго Эдгар", "9.99", "9.99", "MHA", "Hero Academy", 1, [49,53], true, "https://store.supercell.com/assets/offer-images/brawlstars/05d23915f6f720cba5b06b728e5b17369ee9dc70b2eecbecfb76f4b277eb5c6b/brawlstars.29001596-x1-Skin.png"],
  //[61, "Уравити Джанет", "7.99", "7.99", "MHA", "Hero Academy", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/567884c788d3b7ddd622c00b7f9455b95c80f9ee77938a2d2b59256dcb4365f0/brawlstars.29001595-x1-Skin.png"],

  // Летн. распродажа
  //[11, "300 гемов", "9.99", "9.99", "Летн. распродажа", "Летн. распродажа", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/360Gems.JPEG"],
  //[12, "10000 блингов", "4.99", "4.99", "Летн. распродажа", "Летн. распродажа", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],

  //[11, "Набор: 3 скина", "24.99", "24.99", "Strikers", "Strikers", 1, [11,12], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/StrikersSet.JPEG"],
  //[12, "Табло Вольт", "9.99", "9.99", "Strikers", "Strikers", 1, [11,12], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TabloVolt.JPEG"],
  //[13, "Судья Милп", "9.99", "9.99", "Strikers", "Strikers", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/JudgeMilp.JPEG"],
  //[14, "Суперфорвард Лу", "14.99", "14.99", "Strikers", "Strikers", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SuperforwardLu.JPEG"],
  
  // Нано лапша
  //[124, "Набор: 3 скина", "29.99", "29.99", "Нано лапша", "Нано лапша", 1, [124,125,126,127], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CyberShelly.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/TickoYaki.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TechTara.JPEG"],
  //["Скин «Кибер шелли»", "Скин «Тикояки»", "Скин «Техно тара»"]],
  [124, "Скин: Виндсток грей", "14.99", "14.99", "Виндсток", "Виндсток", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/WindstockGray.JPEG",],
  [125, "Скин: Турбина мо", "9.99", "9.99", "Виндсток", "Виндсток", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TurbineMo.JPEG",],
  [126, "Скин: Заряженный спраут", "9.99", "9.99", "Виндсток", "Виндсток", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ChargedSprout.JPEG",],
  [127, "Скин: Матёрый кэндзи", "9.99", "9.99", "Виндсток", "Виндсток", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/MatureKenji.JPEG",],

  // Esports скины
  //[15, "Победитель Отис", "4.99", "4.99", "Esports", "Esports", 1, [], true, "https://storage.botpapa.me/files/12adebb0-505b-11f1-bef9-f1ec7a2c6e45.jpeg"],
  //[16, "Чемпион мира Гас", "4.99", "4.99", "Esports", "Esports", 1, [], true, "https://storage.botpapa.me/files/0de56720-505b-11f1-bef9-f1ec7a2c6e45.jpeg"],
  //[17, "Яростная Тара", "4.99", "4.99", "Esports", "Esports", 1, [], true, "https://storage.botpapa.me/files/08e35c00-505b-11f1-bef9-f1ec7a2c6e45.jpeg"],
  //[45, "Фанат Фэнг", "4.99", "4.99", "Esports", "Esports", 1, [], true, "https://storage.botpapa.me/files/1fdcdc10-505b-11f1-bef9-f1ec7a2c6e45.jpeg"],
  //[46, "Хоккеист Мортис", "4.99", "4.99", "Esports", "Esports", 1, [], true, "https://storage.botpapa.me/files/cd577140-60d0-11f1-af2e-f7a93121b83b.jpeg"],
  //[18, "Кошка-воровка Джесси", "3.99", "3.99", "Esports", "Esports", 1, [], true, "https://storage.botpapa.me/files/027f28d0-505b-11f1-bef9-f1ec7a2c6e45.jpeg"],

  // Особые акции
  //[58, "90 гемов", "0.99", "0.99", "Особая акция", "Особые акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  //[59, "190 гемов", "5.99", "5.99", "Особая акция", "Особые акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  //[60, "300 гемов", "9.99", "9.99", "Особая акция", "Особые акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/360Gems.JPEG"],
  //[128, "Эль Квотербек", "4.99", "4.99", "Особая акция", "Особые акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ElQuarterback.JPEG"],
  //[129, "Набор: 2 иконки", "2.99", "2.99", "Особая акция", "Особые акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Eagle1.JPEG", null, null, false, ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/Eagle2.JPEG"]],

  // Еженедельные акции
  //[21, "Гипнос Сенди", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://storage.botpapa.me/files/c079d530-60d0-11f1-af2e-f7a93121b83b.jpeg"],
  //[22, "Фигурка Пенни", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://storage.botpapa.me/files/c76b2d30-60d0-11f1-af2e-f7a93121b83b.jpeg"],
  //[23, "Равана Гром", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://storage.botpapa.me/files/ca413090-60d0-11f1-af2e-f7a93121b83b.jpeg"],
  //[24, "Вирус Чарли", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://storage.botpapa.me/files/c3f8c2c0-60d0-11f1-af2e-f7a93121b83b.jpeg"],
  //[55, "Злая королева Пэм", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/94f663077bdf674241b0e60705aa2949eb3e96a5c4bd9672f6540bc29b5e6d00/brawlstars.29000354-x1-Skin.png"],
  //[56, "Арджуна Бо", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/6fe55fe9ac9cde53a0eef8ad9a63909fc063ca6cb5de88a78438f192d138f6e7/brawlstars.29000731-x1-Skin.png"],
  //[57, "Снежная королева Амбер", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/c49da0d47d2b1873a81c33dcbd6e6b501155b205266ddfe6ec8db2a290168037/brawlstars.29000597-x1-Skin.png"],
  //[80, "Карнавальная Менди", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/26766d0e3f1ff7b9ef68509a6b9de650255dc046f9a9b0633cb6a14995f0f360/brawlstars.29001111-x1-Skin.png"],
  //[81, "Зевс Брок", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/ad1e2810ae49f4e2d18f6e91accdfa29aff3c35a188e7c8434c0dfa8e17f955d/brawlstars.29000656-x1-Skin.png"],
  //[82, "Призрачный всадник Драко", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/9052f82dbec7d57547803a640d3c5b095010210866ff378b6ab3062dd75b66c4/brawlstars.29000943-x1-Skin.png"],
  //[83, "Родео Хэнк", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://store.supercell.com/assets/offer-images/brawlstars/0cfd49ba9b17b30f2e64a6219d645b0504bb908afa30d82ab8568e456c227a95/brawlstars.29000700-x1-Skin.png"],
  //[87, "Мультяшка Спайк", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CartoonSpike.JPEG"],
  //[88, "Тор Биби", "8.99", "8.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TorBibi.JPEG"],
  //[89, "Афина Пайпер", "6.99", "6.99", "Ежен. акция", "Ежен. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/AthenaPiper.JPEG"],

  // Bling Deals
  [19, "4000 блингов", "0.99", "0.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  [20, "5000 блингов", "4.99", "4.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  [41, "8000 блингов", "5.99", "5.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  [42, "8500 блингов", "5.99", "5.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  [130, "12000 блингов", "7.99", "7.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  [43, "12500 блингов", "7.99", "7.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  [54, "16000 блингов", "8.99", "8.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
  [44, "20000 блингов", "8.99", "8.99", "Bling Deal", "Bling Deals", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Blings.JPEG"],
    
  // Esports наборы
  //[62, "Набор: SK Gaming", "2.49", "2.49", "Esports", "Esports", 1, [64,90,91,92], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKIcon.JPEG"],
  //["Спрей SK Gaming", "Значок SK Gaming", "Иконка SK Gaming"]],
  //[90, "Иконка SK Gaming", "1.19", "1.19", "Esports", "Esports", 1, [64,90], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKIcon.JPEG"],
  //[91, "Значок SK Gaming", "1.89", "1.89", "Esports", "Esports", 1, [64,91], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKPin.JPEG"],
  //[92, "Спрей SK Gaming", "1.89", "1.89", "Esports", "Esports", 1, [64,92], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/SKSpray.JPEG"],
  //[63, "Набор: ZETA Division", "2.49", "2.49", "Esports", "Esports", 1, [63,93,94,95], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETASpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETAPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETAIcon.JPEG"],
  //["Спрей ZETA Division", "Значок ZETA Division", "Иконка ZETA Division"]],
  //[93, "Иконка ZETA Division", "1.19", "1.19", "Esports", "Esports", 1, [63,93], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETAIcon.JPEG"],
  //[94, "Значок ZETA Division", "1.89", "1.89", "Esports", "Esports", 1, [63,94], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETAPin.JPEG"],
  //[95, "Спрей ZETA Division", "1.89", "1.89", "Esports", "Esports", 1, [63,95], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/ZETASpray.JPEG"],
  //[64, "Набор: LOUD", "2.49", "2.49", "Esports", "Esports", 1, [64,96,97,98], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUDSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUDPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUDIcon.JPEG"],
  //["Спрей LOUD", "Значок LOUD", "Иконка LOUD"]],
  //[96, "Иконка LOUD", "1.19", "1.19", "Esports", "Esports", 1, [64,96], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUDIcon.JPEG"],
  //[97, "Значок LOUD", "1.89", "1.89", "Esports", "Esports", 1, [64,97], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUDPin.JPEG"],
  //[98, "Спрей LOUD", "1.89", "1.89", "Esports", "Esports", 1, [64,98], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/LOUDSpray.JPEG"],
  //[65, "Набор: Team Heretics", "2.49", "2.49", "Esports", "Esports", 1, [65,99,100,101], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/THSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/THPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/THIcon.JPEG"],
  //["Спрей Team Heretics", "Значок Team Heretics", "Иконка Team Heretics"]],
  //[99, "Иконка Team Heretics", "1.19", "1.19", "Esports", "Esports", 1, [65,99], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/THIcon.JPEG"],
  //[100, "Значок Team Heretics", "1.89", "1.89", "Esports", "Esports", 1, [65,100], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/THPin.JPEG"],
  //[101, "Спрей Team Heretics", "1.89", "1.89", "Esports", "Esports", 1, [65,101], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/THSpray.JPEG"],
  //[66, "Набор: Reply Totem", "2.49", "2.49", "Esports", "Esports", 1, [66,102,103,104], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TOTEMSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/TOTEMPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TOTEMIcon.JPEG"],
  //["Спрей Reply Totem", "Значок Reply Totem", "Иконка Reply Totem"]],
  //[102, "Иконка Reply Totem", "1.19", "1.19", "Esports", "Esports", 1, [66,102], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TOTEMIcon.JPEG"],
  //[103, "Значок Reply Totem", "1.89", "1.89", "Esports", "Esports", 1, [66,103], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TOTEMPin.JPEG"],
  //[104, "Спрей Reply Totem", "1.89", "1.89", "Esports", "Esports", 1, [66,104], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TOTEMSpray.JPEG"],
  //[67, "Набор: Natus Vincere", "2.49", "2.49", "Esports", "Esports", 1, [67,105,106,107], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NAVISpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/NAVIPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NAVIIcon.JPEG"],
  //["Спрей Natus Vincere", "Значок Natus Vincere", "Иконка Natus Vincere"]],
  //[105, "Иконка Natus Vincere", "1.19", "1.19", "Esports", "Esports", 1, [67,105], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NAVIIcon.JPEG"],
  //[106, "Значок Natus Vincere", "1.89", "1.89", "Esports", "Esports", 1, [67,106], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NAVIPin.JPEG"],
  //[107, "Спрей Natus Vincere", "1.89", "1.89", "Esports", "Esports", 1, [67,107], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/NAVISpray.JPEG"],
  //[68, "Набор: TRIBE Gaming", "2.49", "2.49", "Esports", "Esports", 1, [68,108,109,110], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBESpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBEPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBEIcon.JPEG"],
  //["Спрей TRIBE Gaming", "Значок TRIBE Gaming", "Иконка TRIBE Gaming"]],
  //[108, "Иконка TRIBE Gaming", "1.19", "1.19", "Esports", "Esports", 1, [68,108], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBEIcon.JPEG"],
  //[109, "Значок TRIBE Gaming", "1.89", "1.89", "Esports", "Esports", 1, [68,109], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBEPin.JPEG"],
  //[110, "Спрей TRIBE Gaming", "1.89", "1.89", "Esports", "Esports", 1, [68,110], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/TRIBESpray.JPEG"],
  //[69, "Набор: Crazy Raccoon", "2.49", "2.49", "Esports", "Esports", 1, [69,111,112,113], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRIcon.JPEG"],
  //["Спрей Crazy Raccoon", "Значок Crazy Raccoon", "Иконка Crazy Raccoon"]],
  //[111, "Иконка Crazy Raccoon", "1.19", "1.19", "Esports", "Esports", 1, [69,111], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRIcon.JPEG"],
  //[112, "Значок Crazy Raccoon", "1.89", "1.89", "Esports", "Esports", 1, [69,112], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRPin.JPEG"],
  //[113, "Спрей Crazy Raccoon", "1.89", "1.89", "Esports", "Esports", 1, [69,113], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/CRSpray.JPEG"],
  //[70, "Набор: HMBLE", "2.49", "2.49", "Esports", "Esports", 1, [70,114,115,116], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBIcon.JPEG"],
  //["Спрей HMBLE", "Значок HMBLE", "Иконка HMBLE"]],
  //[114, "Иконка HMBLE", "1.19", "1.19", "Esports", "Esports", 1, [70,114], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBIcon.JPEG"],
  //[115, "Значок HMBLE", "1.89", "1.89", "Esports", "Esports", 1, [70,115], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBPin.JPEG"],
  //[116, "Спрей HMBLE", "1.89", "1.89", "Esports", "Esports", 1, [70,116], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/HMBSpray.JPEG"],
  //[71, "Набор: FUT Esports", "2.49", "2.49", "Esports", "Esports", 1, [71,117,118,119], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTIcon.JPEG"],
  //["Спрей FUT Esports", "Значок FUT Esports", "Иконка FUT Esports"]],
  //[117, "Иконка FUT Esports", "1.19", "1.19", "Esports", "Esports", 1, [71,117], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTIcon.JPEG"],
  //[118, "Значок FUT Esports", "1.89", "1.89", "Esports", "Esports", 1, [71,118], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTPin.JPEG"],
  //[119, "Спрей FUT Esports", "1.89", "1.89", "Esports", "Esports", 1, [71,119], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FUTSpray.JPEG"],
  //[120, "Набор: FENNEL", "2.49", "2.49", "Esports", "Esports", 1, [120,121,122,123], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLSpray.JPEG", null, null, false,
  //["https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLPin.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLIcon.JPEG"],
  //["Спрей FENNEL", "Значок FENNEL", "Иконка FENNEL"]],
  //[121, "Иконка FENNEL", "1.19", "1.19", "Esports", "Esports", 1, [120,121], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLIcon.JPEG"],
  //[122, "Значок FENNEL", "1.89", "1.89", "Esports", "Esports", 1, [120,122], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLPin.JPEG"],
  //[123, "Спрей FENNEL", "1.89", "1.89", "Esports", "Esports", 1, [120,123], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/FLSpray.JPEG"],
  
  // Начальный набор профи
  [131, "Набор: Мортис", "1.79", "1.79", "Набор профи", "Набор профи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Mortis.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/RogueMortis.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  ["Боец Мортис", "Скин «Коварный Мортис»", "100 гемов"] 
  ],
  [132, "Набор: Спайк", "2.99", "2.99", "Набор профи", "Набор профи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Spike.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/PoopSpike.JPEG", "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  ["Боец Спайк", "Скин «Какашка Спайк»", "100 гемов"] 
  ],

  // Ежедневные акции
  [76, "500 монет", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG"],
  [35, "600 монет", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG"],
  [36, "900 монет", "0.99", "0.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG"],
  [37, "1100 монет", "3.99", "3.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG"],
  [78, "1255 монет", "4.99", "4.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG"],
  [38, "1750 монет", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG"],
  [39, "900 очков силы", "0.99", "0.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  [40, "1000 очков силы", "2.99", "2.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  [75, "1800 очков силы", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  [79, "2000 очков силы", "6.99", "6.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"], 
  [72, "750 монет + 500 оч. силы", "4.99", "4.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  ["750 монет", "500 очков силы"]],
  [73, "1400 монет + 800 оч. силы", "6.99", "6.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  ["1400 монет", "800 очков силы"]],
  [74, "1500 монет + 900 оч. силы", "6.99", "6.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  ["1500 монет", "900 очков силы"]],
  [77, "2000 монет + 500 оч. силы", "7.99", "7.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/Coins.JPEG", null, null, false,
  ["https://cdn.jsdelivr.net/gh/placedgames/media/bs/Points.JPEG"],
  ["2000 монет", "500 очков силы"]],
  [25, "50 гемов", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/30Gems.JPEG"],
  [26, "60 гемов", "2.99", "2.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  [27, "90 гемов", "0.99", "0.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  [28, "95 гемов", "3.99", "3.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  [29, "100 гемов", "4.99", "4.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  [30, "120 гемов", "5.99", "5.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  [31, "140 гемов", "6.99", "6.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  [32, "160 гемов", "7.99", "7.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  [33, "180 гемов", "8.99", "8.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  [34, "180 гемов", "1.99", "1.99", "Ежедн. акция", "Ежедн. акции", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  
  // Кристаллы
  [5, "30 гемов", "1.99", "1.99", "Кристаллы", "Кристаллы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/30Gems.JPEG"],
  [6, "80 гемов", "4.99", "4.99", "Кристаллы", "Кристаллы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/80Gems.JPEG"],
  [7, "170 гемов", "8.99", "8.99", "Кристаллы", "Кристаллы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/170Gems.JPEG"],
  [8, "360 гемов", "19.99", "19.99", "Кристаллы", "Кристаллы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/360Gems.JPEG"],
  [9, "950 гемов", "49.99", "49.99", "Кристаллы", "Кристаллы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/950Gems.JPEG"],
  [10, "2000 гемов", "99.99", "99.99", "Кристаллы", "Кристаллы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/bs/2000Gems.JPEG"]
];
window.brawlProducts = makeProducts(brawlRaw, 'bs_');
window.products = window.brawlProducts; // для обратной совместимости

// Clash Royale
const crRaw = [
  // Пропуски
  [1, "Pass Royale", "11.99", "11.99", "Пропуск", "Пропуски", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/PassRoyale.JPEG"],
  [2, "Мини-пропуск", "4.99", "4.99", "Пропуск", "Пропуски", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/MiniPass.JPEG"],
  
  // Акции
 
  // Герои
  [9, "Герой: Мини пекка", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HMiniPekka.JPEG"],
  [10, "Герой: Вышибала", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HBowler.JPEG"],
  [11, "Герой: Мушкетёр", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HMusketeer.JPEG"],
  [12, "Герой: Тёмный рыцарь", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HDarkPrince.JPEG"],
  [13, "Герой: Колдун", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HWizard.JPEG"],
  [14, "Герой: Гоблины", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HGoblins.JPEG"],
  [15, "Герой: Шар", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HBalloon.JPEG"],
  [16, "Герой: Мегаминьон", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HMegaMinion.JPEG"],
  [17, "Герой: Надгробие", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HTombstone.JPEG"],
  [18, "Герой: Ледяной голем", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/HIceGolem.JPEG"],
  [87, "Герой: Варварская бочка", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CBarbarianBarrel.JPEG"],
  [88, "Герой: Гигант", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CGiant.JPEG"],
  [89, "Герой: Магический лучник", "14.99", "14.99", "Герой", "Герои", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CMagicArcher.JPEG"],

  // Чемпионы
  [19, "Главная бандитка: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CBossBandit.JPEG"],
  [20, "Гоблинштейн: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CGoblinstein.JPEG"],
  [21, "Маленький принц: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CLittlePrince.JPEG"],
  [22, "Королева лучниц: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CArcherQueen.JPEG"],
  [23, "Король скелетов: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CSkeletonKing.JPEG"],
  [24, "Золотой рыцарь: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CGoldenKnight.JPEG"],
  [25, "Монах: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CMonk.JPEG"],
  [26, "Шустрый шахтёр: 2 карты", "3.99", "3.99", "Чемпион", "Чемпионы", 10, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/CMightyMiner.JPEG"],
 
  // Лег. карты
  [27, "Мегарыцарь: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCMegaKnight.JPEG"],
  [28, "Императрица духов: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCSpiritEmpress.JPEG"],
  [29, "Громовержец: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCElectroWizard.JPEG"],
  [30, "Пламенный дракон: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCInfernoDragon.JPEG"],
  [31, "Шахтёр: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCMiner.JPEG"],
  [32, "Принцесса: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCPrincess.JPEG"],
  [33, "Всадница на баране: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCRamRider.JPEG"],
  [34, "Спарки: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCSparky.JPEG"],
  [35, "Бревно: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCTheLog.JPEG"],
  [36, "Кладбище: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCGraveyard.JPEG"],
  [37, "Ледяной колдун: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCIceWizard.JPEG"],
  [38, "Феникс: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCPhoenix.JPEG"],
  [39, "Королевский призрак: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCRoyalGhost.JPEG"],
  [40, "Гоблинская машина: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCGoblinMachine.JPEG"],
  [41, "Бандитка: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCBandit.JPEG"],
  [42, "Адская гончая: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCLavaHound.JPEG"],
  [43, "Магический лучник: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCMagicArcher.JPEG"],
  [44, "Дровосек: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCLumberjack.JPEG"],
  [45, "Ночная ведьма: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCNightWitch.JPEG"],
  [46, "Ведьмина бабушка: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCMotherWitch.JPEG"],
  [47, "Рыбак: 6 карт", "5.99", "5.99", "Лег. карта", "Лег. карты", 5, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/LCFisherman.JPEG"],
  
  // Эмодзи
  [90, "Эмодзи: Смыв свинья", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EHogFlush.JPEG"],
  [91, "Эмодзи: Тук-тук", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EKnockKnock.JPEG"],
  [92, "Эмодзи: Грустный мушкетёр", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESadMusketeer.JPEG"],
  [93, "Эмодзи: Скелетный флосс", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESkeletonFloss.JPEG"],
  [94, "Эмодзи: Подкравшийся голем", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESneakyGolem.JPEG"],
  [95, "Эмодзи: Тик-Так", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ETickTock.JPEG"],
  [96, "Эмодзи: Золотое сечение", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EGoldenRatio.JPEG"],
  [97, "Эмодзи: 6-7", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/E67.JPEG"],
  [98, "Эмодзи: Варварский флекс", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EBarbarianFlex.JPEG"],
  [99, "Эмодзи: Улыбка вышибалы", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EBowlerGrin.JPEG"],
  [100, "Эмодзи: Танцующий гоблин", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EDancerGoblin.JPEG"],
  [101, "Эмодзи: Танцующий дракон", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EDragonDance.JPEG"],
  [102, "Эмодзи: Яростный мушкетёр", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EFuriosMusketeer.JPEG"],
  [103, "Эмодзи: Плачущий гоблин", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EGoblinBoohoo.JPEG"],
  [104, "Эмодзи: Кашель миньона", "4.99", "4.99", "Эмодзи", "Эмодзи", 1, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/EGoughing.JPEG"],

  // Эволюции
  [48, "Разряд: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESZap.JPEG"],
  [49, "Королевские Рекруты: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESRoyalRecruits.JPEG"],
  [50, "Бочка со скелетами: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESSkeletonBarrel.JPEG"],
  [51, "Скелеты: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESSkeletons.JPEG"],
  [52, "Валькирия: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESValkyrie.JPEG"],
  [53, "Разрушители стен: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESWallBreakers.JPEG"],
  [54, "Колдун: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESWizard.JPEG"],
  [55, "Мегарыцарь: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESMegaKnight.JPEG"],
  [56, "Орда миньонов: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESMinionHorde.JPEG"],
  [57, "Мортира: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESMortar.JPEG"],
  [58, "Мушкетёр: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESMusketeer.JPEG"],
  [59, "Пекка: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESPekka.JPEG"],
  [60, "Принцесса: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESPrincess.JPEG"],
  [61, "Королевский Призрак: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESRoyalGhost.JPEG"],
  [62, "Королевский Великан: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESRoyalGiant.JPEG"],
  [63, "Королевские Кабаны: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESRoyalHogs.JPEG"],
  [64, "Петарда: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESFirecracker.JPEG"],
  [65, "Снежок: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESGiantSnowball.JPEG"],
  [66, "Бочка с гоблинами: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESGoblinBarrel.JPEG"],
  [67, "Гоблин-бур: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESGoblinDrill.JPEG"],
  [68, "Гоблин-великан: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESGoblinGiant.JPEG"],
  [69, "Охотник: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESHunter.JPEG"],
  [70, "Ледяной дух: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESIceSpirit.JPEG"],
  [71, "Дракон Инферно: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESInfernoDragon.JPEG"],
  [72, "Рыцарь: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESKnight.JPEG"],
  [73, "Дровосек: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESLumberjack.JPEG"],
  [74, "Маленький дракон: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESBabyDragon.JPEG"],
  [75, "Летучие мыши: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESBats.JPEG"],
  [76, "Боевой таран: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESBattleRam.JPEG"],
  [77, "Бомбардир: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESBomber.JPEG"],
  [78, "Пушка: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESCannon.JPEG"],
  [79, "Гоблин с дротиками: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESDartGoblin.JPEG"],
  [80, "Электро-дракон: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESElectroDragon.JPEG"],
  [81, "Палач: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESExicutioner.JPEG"],
  [82, "Варвары: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESBarbarians.JPEG"],
  [83, "Лучницы: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESArchers.JPEG"],
  [84, "Тесла: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESTesla.JPEG"],
  [85, "Ведьма: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESWitch.JPEG"],
  [86, "Армия скелетов: 3 осколка", "5.99", "5.99", "Эволюция", "Эволюции", 2, [], true, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/ESSkeletonArmy.JPEG"],

  // Кристаллы
  [3, "80 гемов", "0.99", "0.99", "Кристаллы", "Кристаллы", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/80Gems.JPEG"],
  [4, "500 гемов", "4.99", "4.99", "Кристаллы", "Кристаллы", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/500Gems.JPEG"],
  [5, "1200 гемов", "9.99", "9.99", "Кристаллы", "Кристаллы", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/1200Gems.JPEG"],
  [6, "2500 гемов", "19.99", "19.99", "Кристаллы", "Кристаллы", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/2500Gems.JPEG"],
  [7, "6500 гемов", "49.99", "49.99", "Кристаллы", "Кристаллы", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/6500Gems.JPEG"],
  [8, "14000 гемов", "99.99", "99.99", "Кристаллы", "Кристаллы", 1, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/cr/14000Gems.JPEG"],
];
window.crProducts = makeProducts(crRaw, 'cr_');

// Roblox
const robloxRaw = [
  [1, "40 робуксов", "0.49", "0.49", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  [2, "80 робуксов", "0.99", "0.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  [3, "400 робуксов", "4.99", "4.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  [4, "800 робуксов", "9.99", "9.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  [5, "1200 робуксов", "14.99", "14.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  [6, "1700 робуксов", "19.99", "19.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  [7, "3150 робуксов", "34.99", "34.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],
  [7, "4500 робуксов", "49.99", "49.99", "Робуксы", "Робуксы", 3, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/rb/Robux.JPEG"],

];
window.robloxProducts = makeProducts(robloxRaw, 'roblox_');

// Telegram
const tgRaw = [  
  // Telegram Gifts
  [1, "13 звёзд", null, null, "Подарок", "Подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Bear.JPEG", 22,  24,  true],
  [2, "21 звезда", null, null, "Подарок", "Подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Gift.JPEG", 36,  39,  true],
  [3, "43 звезды", null, null, "Подарок", "Подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Cake.JPEG", 72,  79,  true],
  //[4, "85 звезд", null, null, "Подарок", "Подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Cup.JPEG", 129,  135,  true],
  [19, "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Dec20P.JPEG", 72, 79, true],
  [20, "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Dec31B.JPEG", 72, 79, true],
  [21, "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Feb14B.JPEG", 72, 79, true],
  [22, "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Feb14H.JPEG", 72, 79, true],
  [23, "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Mar7B.JPEG", 72, 79, true],
  [24, "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Mar17B.JPEG", 72, 79, true],
  [25, "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Mar31B.JPEG", 72, 79, true],
  [26, "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Apr12B.JPEG", 72, 79, true],
  [27, "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/May1B.JPEG", 72, 79, true],
  [28, "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Jul19B.JPEG", 72, 79, true],
  [29, "43 звезды", null, null, "Уд. подарок", "Уд. подарки", 9, [], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/Aug12B.JPEG", 72, 79, true],
  // Telegram Stars
  [5, "100 звёзд", null, null, "Звёзды", "Звёзды", 1, [5,6,7,8,9,10,11,12,13,14,15], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 135,  139,  true],
  [6, "150 звёзд", null, null, "Звёзды", "Звёзды", 1, [5,6,7,8,9,10,11,12,13,14,15], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 199,  209,  true],
  [7, "250 звёзд", null, null, "Звёзды", "Звёзды", 1, [5,6,7,8,9,10,11,12,13,14,15], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 329,  349,  true],
  [8, "350 звёзд", null, null, "Звёзды", "Звёзды", 1, [5,6,7,8,9,10,11,12,13,14,15], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 459,  489,  true],
  [9, "500 звёзд", null, null, "Звёзды", "Звёзды", 1, [5,6,7,8,9,10,11,12,13,14,15], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 649,  699,  true],
  [10, "750 звёзд", null, null, "Звёзды", "Звёзды", 1, [5,6,7,8,9,10,11,12,13,14,15], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 969,  1049,  true],
  [11, "1000 звёзд", null, null, "Звёзды", "Звёзды", 1, [5,6,7,8,9,10,11,12,13,14,15], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 1289,  1389,  true],
  [12, "1500 звёзд", null, null, "Звёзды", "Звёзды", 1, [5,6,7,8,9,10,11,12,13,14,15], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/1500Stars.JPEG", 1939,  2079,  true],
  [13, "2500 звёзд", null, null, "Звёзды", "Звёзды", 1, [5,6,7,8,9,10,11,12,13,14,15], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/2500Stars.JPEG", 3229,  3459,  true],
  [14, "5000 звёзд", null, null, "Звёзды", "Звёзды", 1, [5,6,7,8,9,10,11,12,13,14,15], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/2500Stars.JPEG", 6459,  6919,  true],
  //[15, "10000 звёзд", null, null, "Звёзды", "Звёзды", 1, [5,6,7,8,9,10,11,12,13,14,15], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/2500Stars.JPEG", 12899,  13829,  true],

  // Telegram Premium
  [16, "3 мес. премиум", null, null, "Премиум", "Премиум", 1,  [22,23,24], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/100Stars.JPEG", 999, 1019, true],
  [17, "6 мес. премиум", null, null, "Премиум", "Премиум", 1, [22,23,24], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/1500Stars.JPEG", 1329, 1349, true],
  [18, "1 год премиум", null, null, "Премиум", "Премиум", 1, [22,23,24], false, "https://cdn.jsdelivr.net/gh/placedgames/media/tg/2500Stars.JPEG", 2399, 2419, true],

];
window.tgProducts = makeProducts(tgRaw, 'tg_');

const products = window.brawlProducts;
window.products = products;