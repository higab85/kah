/* configuration.js
* Reads configuration using nconf.
* Returns a JavaScript object representing the effective configuration.
* taken from:
* https://thejsf.wordpress.com/2015/02/08/node-js-application-configuration-with-nconf/
*/
var config = require(“nconf“);
var fs = require(“fs“);
config.load = function(defaults) {
   config.argv().env({whitelist: [“configFile“]});    var configFile = “config.json“;

   if (config.get(“configFile“)) {
       configFile = config.get(“configFile“);
   }

   if (!fs.existsSync(configFile)) {
       throw {
           name : “FileNotFoundException“,
           message : “Unable to find configFile “ + configFile
       };
   }

   config.file(configFile);

   config.defaults(defaults);

   return config.get();
}

module.exports = config
