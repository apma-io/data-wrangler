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

function Create() {

  var fs = require('fs'),
      templates = {},
      hb = require('handlebars'),
      asycn = require('async')
  ;

  function loadTemplates(tdir, fn) {
    //console.log('Reading and compiling templates..');
    var d = tdir,
        list
    ;
    
    //We use sync so that we know which template barfs if there's errors in it..
    list = fs.readdirSync(d);
    
    if (!list) {
      console.log("Could not read directory " + d);
    } else {
      list.forEach(function (file) {
        try {
          if (file.indexOf('.partial') > 0) {
            //console.log('  Adding partial template ' + file + '...');
            var pname = file.replace('.partial.handlebars', '');
            
            templates[pname] = hb.compile(fs.readFileSync(d + file, 'utf8'));
            hb.registerPartial(pname, templates[pname]);
            
          } else if (file.indexOf('.handlebars') > 0) {
            //console.log('  Adding template ' + file + '...');
            templates[file.replace('.handlebars', '')] = hb.compile(fs.readFileSync(d + file, 'utf8'));
          } 
        } catch (e) {
          console.log("ERROR WHEN PROCESSING", file, e);
        }
      });
      if (fn) {
        fn();        
      }
    }
  }
  
  function compile(tmpl, data) {
    if (!templates[tmpl]) {
      console.log('Could not find template ' + tmpl + ', unable to dump it.');
      return;
    }
    return templates[tmpl](data);
  }

  function dmp(tmpl, fname, data) {  
    
    if (!templates[tmpl]) {
      console.log('Could not find template ' + tmpl + ', unable to dump it.');
      return;
    }
    
    //We use sync so we know which template doesn't compile if there's an error in it
    //console.log('Dumping template', tmpl, "to", fname); 
    fs.writeFileSync(fname, templates[tmpl](data));
  }
  
  return {
    load: loadTemplates,
    dmp: dmp,
    compile: compile
  };
};

module.exports = Create;