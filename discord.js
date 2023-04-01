async function sendDiscordMessage(skin, newPriceHistoryEntry) {
  const webhookUrl =
    "https://discord.com/api/webhooks/1091795149782274168/B6XU3v9wwJzVnisz8SYKjIMAxBopuIOCbUXU9LaRTageL-T9GZWKqShxUwfeH9NNhrg8";
  const { market_hash_name, image, site_url_of_item } = skin;
  const { price, steam_price, discount } = newPriceHistoryEntry;

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
