'use strict';

const
  Geocoder = require('node-geocoder'),
  Bluebird = require('bluebird');

/**
 * Compares if 2 addresses are same
 * @param  {object} address1 - {lines:[], zipCode, city, country}
 * @param  {object} address2 - {lines:[], zipCode, city, country}
 * @return {boolean} - true if identical address, false if different
 */
const isSameAddress = (address1, address2) => {
  let result = true;

  if (!address1 && !address2) {
    return true;
  }

  if (!address1 || !address2
    || address1.zipCode !== address2.zipCode
    || address1.city !== address2.city
    || address1.country !== address2.country
    || (!address1.lines && address2.lines) || (address1.lines && !address2.lines)
    || (address1.lines && address2.lines && address1.lines.length !== address2.lines.length)
  ) {
    return false;
  }

  if (address1.lines && address2.lines) {
    address1.lines.sort();
    address2.lines.sort();
    address1.lines.forEach((line, i) => {
      if (line !== address2.lines[i]) {
        result = false;
      }
    });
  }

  return result;
};

/**
 * Transforms an address into geographical coordinates. Uses Google maps API.
 * @param {object} address - {lines:[], zipCode, city, country}
 * @param {object} yggdrasil - current yggdrasil, for logger
 * @return {object|null} - if found a place with this address, {latitude:float, longitude: float...}
 */
const geocode = (address, yggdrasil) => {
  if (address && address.country && address.country.length > 2 && ((address.zipCode && address.zipCode.length > 2) || (address.city && address.city.length > 2))) {
    const geocoder = Geocoder(yggdrasil.config.geocoder.strategies[yggdrasil.config.geocoder.defaultStrategy]);
    let strAddress = '';

    if (address.lines) {
      address.lines.forEach(line => {
        strAddress += line + ' ';
      });
    }

    if (address.zipCode) {
      strAddress += address.zipCode + ' ';
    }

    if (address.city) {
      strAddress += address.city + ' ';
    }

    strAddress += address.country;

    return geocoder.geocode(strAddress)
      .then((res) => {
        // // output :
        // [{
        //   "formattedAddress": "Allée Marc Chagall, 75013 Paris, France",
        //   "latitude": 48.81990829999999,
        //   "longitude": 2.3605084,
        //   "extra": {
        //     "googlePlaceId": "ChIJZyDaJIFx5kcRnM_wpmszcsc",
        //     "confidence": 0.7,
        //     "premise": null,
        //     "subpremise": null,
        //     "neighborhood": "Paris",
        //     "establishment": null
        //   },
        //   "administrativeLevels": {
        //     "level2long": "Paris",
        //     "level2short": "Paris",
        //     "level1long": "Île-de-France",
        //     "level1short": "Île-de-France"
        //   },
        //   "streetName": "Allée Marc Chagall",
        //   "city": "Paris",
        //   "country": "France",
        //   "countryCode": "FR",
        //   "zipcode": "75013",
        //   "provider": "google"
        // }]

        return Bluebird.resolve(res);
      })
      .catch((err) => {
        if (yggdrasil) {
          yggdrasil.logger.error(err, 'string address', strAddress, 'object', address);
        }
        return Bluebird.resolve(null);
      });
  }

  if (yggdrasil) {
    yggdrasil.logger.error('Unable to geocode', address);
  }

  return Bluebird.resolve(null);
};

module.exports = {
  geocode: geocode,
  isSameAddress: isSameAddress
};