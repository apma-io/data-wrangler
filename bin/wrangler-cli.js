#!/usr/bin/env node

/*

  Copyright (c) 2016 IQumulus LLC

  All rights reserved.

*/

const prompt = require('prompt');
const dictGen = require('./../lib/dictionary.generator.js');
const modelGen = require('./../lib/model.generator.js');

//Prompts the user for generation options
function genDictionary(defs, onDone) {  
  if (defs) {
    return genDictionary(defs);
  }

  onDone = onDone || function(err, result) {
    //console.log(err, result);
    modelGen.generate(result, function (files) {
      modelGen.dump('tests', files, process.exit);
      //process.exit();
    });    
  };

  prompt.message = "wrangle";
  prompt.delimiter = ": ";
  prompt.start();
  
  prompt.get({
    properties: {
      host: {
        description: 'DB Host',
        default: 'local.void'
      },
      username: {
        description: 'DB User Name',
        default: 'dev'
      },
      schema: {
        description: 'DB Schema',
        default: 'mysql'
      },
      password: {
        description: 'DB Password',
        default: 'password'
      },
      mergeWith: {
        description: 'Dictionary to merge with',
        default: ''
      }
    }
  }, function (err, result) {
    if (err) {
      console.log('Error: ' + err);
      return false;
    }

    if (result.mergeWith.length > 0) {

      prompt.get({
        properties: {
          removeDeadEnds: {
            description: 'Remove dead tables?',
            default: 'yes'
          }
        }
      }, function (err, ext) {
        result.removeDeadEnds = ext.removeDeadEnds;
        dictGen.generate(result, onDone);
      });

    } else {
      dictGen.generate(result, onDone);      
    }
  });
}

console.log("     _                                _           ");
console.log("  __| |_      ___ __ __ _ _ __   __ _| | ___ _ __ ");
console.log(" / _` \\ \\ /\\ / / '__/ _` | '_ \\ / _` | |/ _ \\ '__|");
console.log("| (_| |\\ V  V /| | | (_| | | | | (_| | |  __/ |   ");
console.log(" \\__,_| \\_/\\_/ |_|  \\__,_|_| |_|\\__, |_|\\___|_|   ");
console.log("                                |___/             ");
console.log("Data Wrangler Mark IV CLI          Mark IV - v.0.1");
console.log("")

genDictionary();