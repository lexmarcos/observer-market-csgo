const axios = require("axios");
const fs = require("fs");
const loki = require("lokijs");
const crypto = require("crypto");
const { sendDiscordMessage } = require("./discord");
const { DiscordMessageQueue } = require("./DiscordQueue");

const discordMessageQueue = new DiscordMessageQueue();
let skinsCollection;

function databaseInitialize() {
  skinsCollection = db.getCollection("skins");
  if (skinsCollection === null) {
    skinsCollection = db.addCollection("skins", { indices: ["_id"] });
  }
}

const db = new loki("skins.db", {
  autoload: true,
  autoloadCallback: databaseInitialize,
  autosave: true,
  autosaveInterval: 4000,
});

// Faz a primeira requisição à API para pegar o número total de skins
const url =
  "https://dashskins.com.br/api/listing?search=&item_type=&rarity=&itemset=&exterior=&weapon=&has_sticker=0&has_stattrak=&is_souvenir=&is_instant=1&sort_by=&sort_dir=&limit=120&page=1";

axios
  .get(url)
  .then((response) => {
    const data = response.data;
    const total_skins = data.count;

    // Define os parâmetros da API
    const params = {
      item_type: "",
      rarity: "",
      itemset: "",
      exterior: "",
      weapon: "",
      has_sticker: 0,
      has_stattrak: "",
      is_souvenir: "",
      is_instant: 1,
      sort_by: "",
      sort_dir: "",
      limit: 120,
    };

    // Faz a requisição para cada página
    const all_skins = [];
    const totalPages = Math.ceil(total_skins / params.limit);

    const getPage = async (page) => {
      console.log(`Requisitando página ${page} de ${totalPages}...`);
      const response = await axios.get(
        `https://dashskins.com.br/api/listing?search=&item_type=${params.item_type}&rarity=${params.rarity}&itemset=${params.itemset}&exterior=${params.exterior}&weapon=${params.weapon}&has_sticker=${params.has_sticker}&has_stattrak=${params.has_stattrak}&is_souvenir=${params.is_souvenir}&is_instant=${params.is_instant}&sort_by=${params.sort_by}&sort_dir=${params.sort_dir}&limit=${params.limit}&page=${page}`
      );
      const data = response.data;
      all_skins.push(...data.results);

      if (page === 1) {
        await getPage(page + 1);
      } else {
        processResults();
      }
    };

    getPage(1);

    const createId = (str) => {
      return crypto.createHash("md5").update(str).digest("hex");
    };

    const processResults = () => {
      const groupedSkins = {};

      all_skins.forEach((skin) => {
        const marketHashName = skin.market_hash_name;
        if (!groupedSkins[marketHashName]) {
          groupedSkins[marketHashName] = {
            market_hash_name: marketHashName,
            item_type: skin.item_type,
            quality: skin.quality,
            weapon: skin.weapon,
            exterior: skin.exterior,
            image: skin.icon_url,
            items: [],
            site_url_of_item: "",
            price_history: [],
          };
        }

        groupedSkins[marketHashName].items.push({
          _id: skin._id,
          name: skin.name,
          discount: skin.discount,
          price: skin.price,
          steam_price: skin.steamPrice,
        });
      });

      // Atualizar 'site_url_of_item' e 'price_history' para cada grupo de skins
      for (const marketHashName in groupedSkins) {
        const group = groupedSkins[marketHashName];
        const highestDiscountItem = group.items.reduce((maxDiscountItem, currentItem) => {
          return currentItem.discount > maxDiscountItem.discount ? currentItem : maxDiscountItem;
        }, group.items[0]);

        const name = marketHashName
          .toLowerCase()
          .replace(/[\s()|'",!?.:,;\u2122]+/g, " ")
          .replace("★", " ")
          .trim()
          .replace(/\s+/g, "-");
        const id = highestDiscountItem._id;
        const url = `https://dashskins.com.br/item/${name}/${id}`;

        group.site_url_of_item = url;

        const currentDate = new Date().toISOString().split("T")[0];
        group.totalItems = group.items.length;
        group.price_history.push({
          date: currentDate,
          price: highestDiscountItem.price,
          steam_price: highestDiscountItem.steam_price,
          discount: highestDiscountItem.discount,
        });
      }

      // Salva as skins agrupadas na database LokiJS
      for (const marketHashName in groupedSkins) {
        const _id = createId(marketHashName);
        const existingSkin = skinsCollection.findOne({ _id });

        const group = groupedSkins[marketHashName];
        const highestDiscountItem = group.items.reduce((maxDiscountItem, currentItem) => {
          return currentItem.discount > maxDiscountItem.discount ? currentItem : maxDiscountItem;
        }, group.items[0]);

        const currentDate = new Date();

        const newPriceHistoryEntry = {
          date: currentDate,
          price: highestDiscountItem.price,
          steam_price: highestDiscountItem.steam_price,
          discount: highestDiscountItem.discount,
        };

        const lastPriceHistoryEntry = existingSkin
          ? existingSkin.price_history[existingSkin.price_history.length - 1]
          : null;
        const lastDate = lastPriceHistoryEntry ? new Date(lastPriceHistoryEntry.date) : null;

        const dateDifferenceInDays = lastDate
          ? Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24))
          : null;

        const shouldUpdatePriceHistory =
          !lastPriceHistoryEntry ||
          newPriceHistoryEntry.discount > lastPriceHistoryEntry.discount ||
          dateDifferenceInDays >= 1;

        if (existingSkin) {
          existingSkin.items = group.items;
          existingSkin.totalItems = group.items.length;

          if (shouldUpdatePriceHistory) {
            existingSkin.price_history.push(newPriceHistoryEntry);
            discordMessageQueue.sendMessage(existingSkin, newPriceHistoryEntry);
          }

          skinsCollection.update(existingSkin);
        } else {
          group._id = _id;
          group.price_history = [newPriceHistoryEntry];
          skinsCollection.insert(group);
          discordMessageQueue.sendMessage(group, newPriceHistoryEntry);
        }
      }

      // Salva a database LokiJS em um arquivo
      db.saveDatabase((err) => {
        if (err) {
          console.error("Ocorreu um erro ao salvar a database:", err);
        } else {
          console.log("Skins agrupadas e salvas na database LokiJS!");
        }
      });
    };
  })
  .catch((error) => {
    console.error("Erro ao requisitar dados da API:", error.message);
  });
