const { sendDiscordMessage } = require("./discord");

class DiscordMessageQueue {
  constructor() {
    this.queue = [];
    this.sending = false;
    this.rateLimitResetTime = null;
    this.rateLimitRemaining = null;
  }

  async sendMessage(skin, newPriceHistoryEntry) {
    this.queue.push({ skin, newPriceHistoryEntry });

    if (!this.sending) {
      this.sending = true;
      await this.processQueue();
      this.sending = false;
    }
  }

  async processQueue() {
    while (this.queue.length > 0) {
      const { skin, newPriceHistoryEntry } = this.queue.shift();
      await sendDiscordMessage(skin, newPriceHistoryEntry);

      if (this.rateLimitRemaining === 0) {
        const currentTime = new Date().getTime();
        const sleepTime = this.rateLimitResetTime - currentTime + 1000;

        await new Promise((resolve) => setTimeout(resolve, sleepTime));
      }
    }
  }
}

module.exports = {
  DiscordMessageQueue,
};
