'use strict';

const Bluebird = require('bluebird');

const getFromLaPosteOpenData = (yggdrasil, query) => {
  let promises = [];

  yggdrasil.config.proxyMesh.entryPoints.forEach(entryPoint => {
    promises.push(_LaPosteOpenDataGetter(yggdrasil, query, entryPoint));
  });

  return Bluebird.any(promises)
    .catch(e => {
      console.log('error on La Poste Opendata get', e);
      return _LaPosteOpenDataGetter(yggdrasil, true);
    });
};

const _LaPosteOpenDataGetter = (yggdrasil, query, entryPoint, useApiKey = false) => {
  const
    uriPrefix = 'https://datanova.legroupe.laposte.fr/api/records/1.0/search/?' +
      'dataset=laposte_hexasmal&rows=80&sort=nom_de_la_commune&facet=code_commune_insee&facet=nom_de_la_commune&facet=code_postal&facet=libell_d_acheminement&facet=ligne_5&q=' +
      query,
    apiKey = '&apikey=' + yggdrasil.config.OpenDataLaposteAPiKey;

  let uri;

  if (useApiKey) {
    uri = uriPrefix + apiKey;
  } else {
    uri = uriPrefix;
  }

  return yggdrasil.proxy.get(uri, true)
    .then(response => {
      let results = [], meta = {}, keys;
      response.records.forEach(v => {
        let entry = {};

        if (v.fields.ligne_5) {
          entry = {
            zip: v.fields.code_postal,
            city: v.fields.nom_de_la_commune,
            place: v.fields.ligne_5
          };
        } else {
          entry = {
            zip: v.fields.code_postal,
            city: v.fields.nom_de_la_commune
          };
        }
        meta[entry.zip] = entry;
      });

      keys = Object.keys(meta);
      keys.sort();

      keys.forEach(k => {
        results.push(meta[k]);
      });

      return Bluebird.resolve(results);
    });
};

module.exports = {
  getFromLaPosteOpenData: getFromLaPosteOpenData
};
