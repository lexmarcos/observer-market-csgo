const Loki = require("lokijs");

const db = new Loki("skins.db", {
  autoload: true,
  autoloadCallback: databaseInitialize,
  autosave: true,
  autosaveInterval: 4000,
});

let skinsCollection;

function databaseInitialize() {
  skinsCollection = db.getCollection("skins");
  if (skinsCollection === null) {
    skinsCollection = db.addCollection("skins", { indices: ["_id"] });
  }
}

function printAllSkins() {
  const allSkins = skinsCollection.find();
  console.log("Todos os documentos na coleção 'skins':");
  console.log(JSON.stringify(allSkins, null, 2));
}

module.exports = {
  skinsCollection,
  printAllSkins,
};