/*

  Copyright (c) 2016 IQumulus LLC

  Original author: Chris Vasseng

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

*/

const templates = require('./templates.js')();
const mkdir = require('mkdirp');
const async = require('async');
const fs = require('fs');

//Dump model to file
function dump(outputPath, files, fn) {
  var funs = [];

  function addFiles(path, obj) {
    if (typeof obj === 'string' || obj instanceof String) {
      funs.push(
        function (next) {
          fs.writeFile(path, obj, 'utf8', next);
        }
      );
    } else if (typeof obj !== 'undefined') {
      funs.push(
        function (next) {
          mkdir(path, function (err) {
            //for some reason feeding next right in doesn work
            next(err);
          });
        }
      );
      Object.keys(obj).forEach(function (key) {
        addFiles(path + '/' + key, obj[key]);
      });      
    }
  }

  addFiles(outputPath, files);
  async.waterfall(funs, fn);
}

//This generates a single module. We need to process the dictionary to fit
//with handlebars philosophy of "logic-less" templates.
//This makes it easier to write the templates (the alternative is to
//add a bunch of custom handlebar functions)
//The model object should be an object containing a single table.
function generateModule(target, model, mainModel, doneFn) {
  if (model.pk && model.pk.length > 0) model.hasPK = true;

  model.insertColumns = [];
  model.updateColumns = [];
  model.searchColumns = [];
  model.filterColumns = [];

  //Process columns
  Object.keys(model.columns).forEach(function (name) {
    var column = model.columns[name];

    column.name = name;
    column.pname = column.pname.replace(/\s/g, '_');
    column.ptype = column.type;

    if (column.type === 'enum') column.ptype = column.dbType.split(',').join('|').replace(/'/g, '').replace(/enum\(/g, '').replace(/\)/g, '');

    if (column.allowInsert) model.insertColumns.push(column);
    if (column.allowUpdate) model.updateColumns.push(column);
    if (column.allowSearch) model.searchColumns.push(column);
    if (column.allowFilter) model.filterColumns.push(column);
  });

  //Now dump the template
  //templates.dmp('model.module', outputDir + 'model_' + model.shortname + '.js', model);
  target['model_' + model.shortname + '.js'] = templates.compile('model.module', model);
}

//Main generation entry point
function generateModel(modelBase, doneFn) {
  var model = JSON.parse(JSON.stringify(modelBase)),
      files = {}
  ;  

  if (!model || !model.name) {
    return;
  }

  files[model.name] = {

  };

  model.gentime = new Date();
  model.copyright = model.copyright.join('\n');

  Object.keys(model.model).forEach(function (name) {
    model.model[name].name = name;
    model.model[name].shortname = model.model[name].shortname.replace(/\s/g, '_');
    model.model[name].version = model.version;
    model.model[name].copyright = model.copyright;
    model.model[name].gentime = (new Date());

    generateModule(files[model.name], model.model[name], model);
  });

  //Generate the TOC
  files[model.name]['model.js'] = templates.compile('model.toc', model);


  if (doneFn) {
    doneFn(files);
  }
}

templates.load(__dirname + '/../templates/node/');

module.exports = {
  dump: dump,
  generate: generateModel
};