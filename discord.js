require("dotenv").config({ path: `.env.local` });
async function sendDiscordMessage(skin, newPriceHistoryEntry) {
  const webhooksByChannel = {
    USP_S: process.env.USP_S,
    GLOCK_18: process.env.GLOCK_18,
    P2000: process.env.P2000,
    P250: process.env.P250,
    TEC_9: process.env.TEC_9,
    CZ75_AUTO: process.env.CZ75_AUTO,
    DEAGLE: process.env.DEAGLE,
    FIVE_SEVEN: process.env.FIVE_SEVEN,
    R8_REVOLVER: process.env.R8_REVOLVER,
    DUAL_BERETTAS: process.env.DUAL_BERETTAS,
    P90: process.env.P90,
    MP7: process.env.MP7,
    MP9: process.env.MP9,
    MAC_10: process.env.MAC_10,
    UMP_45: process.env.UMP_45,
    PP_BIZON: process.env.PP_BIZON,
    MP5_SD: process.env.MP5_SD,
    NOVA: process.env.NOVA,
    SAWED_OFF: process.env.SAWED_OFF,
    XM1014: process.env.XM1014,
    MAG_7: process.env.MAG_7,
    M249: process.env.M249,
    NEGEV: process.env.NEGEV,
    GALIL_AR: process.env.GALIL_AR,
    FAMAS: process.env.FAMAS,
    AK_47: process.env.AK_47,
    M4A4: process.env.M4A4,
    M4A1_S: process.env.M4A1_S,
    SSG_08: process.env.SSG_08,
    SG_553: process.env.SG_553,
    AUG: process.env.AUG,
    AWP: process.env.AWP,
    KNIFE: process.env.KNIFE,
    CASE: process.env.CASE,
    GLOVE: process.env.GLOVE,
    MUSIC_KIT: process.env.MUSIC_KIT,
    STICKER: process.env.STICKER,
  };

  const { market_hash_name, image, site_url_of_item } = skin;
  const { price, steam_price, discount } = newPriceHistoryEntry;

  function findWebhookUrl(marketHashName) {
    for (const key in webhooksByChannel) {
      console.log(
        marketHashName.toLowerCase(),
        key.toLowerCase().replace("_", "-"),
        marketHashName.toLowerCase().includes(key.toLowerCase().replace("_", "-")) ||
          marketHashName.toLowerCase().includes(key.toLowerCase().replace("_", " "))
      );
      if (marketHashName.toLowerCase().includes(key.toLowerCase().replace("_", "-"))) {
        return webhooksByChannel[key];
      }
    }
    return null;
  }

  const webhookUrl = findWebhookUrl(market_hash_name);
  if (!webhookUrl) {
    console.error("Nenhum webhook encontrado para a arma:", market_hash_name);
    return;
  }

  const embed = {
    title: market_hash_name,
    image: {
      url: `https://steamcommunity-a.akamaihd.net/economy/image/${image}`,
    },
    url: site_url_of_item,
    fields: [
      {
        name: "Preço",
        value: `${price} BRL`,
        inline: true,
      },
      {
        name: "Preço na Steam",
        value: `${steam_price} BRL`,
        inline: true,
      },
      {
        name: "Desconto",
        value: `${discount}%`,
        inline: true,
      },
    ],
    color: 0x0099ff,
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ embeds: [embed] }),
  });

  this.rateLimitRemaining = parseInt(response.headers.get("x-ratelimit-remaining"));
  this.rateLimitResetTime = parseInt(response.headers.get("x-ratelimit-reset")) * 1000;

  if (!response.ok) {
    console.error(
      "Erro ao enviar a mensagem para o Discord webhook:",
      response.status,
      response.statusText
    );
  }
}

module.exports = {
  sendDiscordMessage,
};
