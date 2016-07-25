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

var prompt = require('prompt'),
    DBWrapper = require('node-dbi').DBWrapper,
    async = require('async'),
    fs = require('fs')
;

function genDictionary(options, doneFn, logFn) {
  var db,
      meta = {
        name: options.modelName || options.schema,
        version: '0.0.1',
        customFuns: {
          filters: [],
          actions: []
        },
        copyright: [
          'Copyright 2016, MyCompany',
          'All rights reserved.'
        ],
        db: {
          engine: "mysql",
          schema: options.schema,
          host: options.host,
          user: options.username
        },
        enums: {

        },
        model: {
          
        }
      },
      addedTables = {}
  ;

  function doLog() {
    if (logFn) {
      return logFn.apply(undefined, [Array.prototype.slice.call(arguments).join(' ')]);
    }
    console.log.apply(undefined, arguments);
  }

  /////////////////////////////////////////////////////////////////////////////
  
  function fetchFKs(callback) {
    db.fetchAll('SELECT table_name, column_name, constraint_name, referenced_table_name, referenced_column_name FROM information_schema.key_column_usage WHERE REFERENCED_TABLE_SCHEMA = ?', [options.schema], function (err, res) {
      if (err) {
        return callback(err);
      }
      
      doLog('Found', res.length, 'keys...');    
      
      res.forEach(function (row) {
        meta.model[row.table_name] = meta.model[row.table_name] || {};

        if (meta.model[row.referenced_table_name].relations.filter(function (a) {
          return (a.type === 'many' && a.fromcol === row.referenced_column_name && a.tocol === row.column_name && a.totbl === row.table_name);
        }).length === 0) {          
          var relId = 'get_owned_' + row.table_name;
          meta.model[row.referenced_table_name].relations.push({
            type: 'many',
            comment: 'Gets related rows from ' + row.table_name + ', where ' + row.column_name + ' matches the supplied id',
            name: relId + '_through_' + row.column_name,
            fromcol: row.referenced_column_name,
            tocol: row.column_name,
            totbl: row.table_name
          }); 
        }

        if (meta.model[row.table_name].relations.filter(function (a) {
          return (a.type === 'one' && a.fromcol === row.column_name && a.tocol === row.referenced_column_name && a.totbl === row.referenced_table_name);
        }).length === 0) {          
          meta.model[row.table_name].relations.push({
            type: 'one',
            fromcol: row.column_name,
            tocol: row.referenced_column_name,
            totbl: row.referenced_table_name
          });  

          //var relId = 'get_owned_' + row.table_name;
          //meta.model[row.referenced_table_name].extQueries = meta.model[row.referenced_table_name].extQueries || {};

          //Add an extended query on referenced_table_name?
          // if (Object.keys(meta.model[row.referenced_table_name].extQueries || {}).filter(function (key) {
          //   return meta.model[row.referenced_table_name].extQueries[key].id !== relId;
          // }).length === 0) {
          //   meta.model[row.referenced_table_name].extQueries[relId] = {
          //     id: relId,
          //     comment: 'Gets all rows where ' + row.table_name + '.' + row.column_name + ' matches the supplied id',
          //     args: ['id'],
          //     select: {    
          //       from: {}, 
          //       where: {}
          //     }
          //   };

          //   meta.model[row.referenced_table_name].extQueries[relId].select.from[row.table_name] = 'reltable';
          //   meta.model[row.referenced_table_name].extQueries[relId].select.where[row.referenced_column_name] = ':id';

          // }

        }

        //Validate relations - remove invalid ones

      
        //We could hide the from col too
        meta.model[row.table_name].columns[row.column_name].hide = true;

      });

      callback(null);
    });
  }

  function fetchPKCreator(tableName) {
    return function (callback) {
      db.fetchAll('SHOW KEYS FROM ' + tableName + ' WHERE key_name = ?', ['PRIMARY'], function (err, res) {
        if (err) {
          return callback(err);
        }

        //doLog('Found', ('' + res.length).bold, 'primary keys...');
        
        res.forEach(function (row) {
          //target.pk = row.Column_name;
          meta.model[tableName].pk = row.Column_name;
          //Assuming primary keys have auto_increment
          meta.model[tableName].columns[row.Column_name].required = false;
          //meta.model[tableName].columns[row.Column_name];
        });

        callback(null);
      });
    };
  }

  function getDT(s) {
    var options = {
      'varchar': 'string',
      'longtext': 'string',
      'text': 'string',
      'mediumtext': 'string',
      'int': 'integer',
      'bigint': 'integer',
      'tinyint': 'integer',
      'smallint': 'integer',
      'decimal': 'double',
      'char': 'string'
    };
    return options[s] || s;
  }
  
  function fetchColumns(callback) {
    db.fetchAll('SELECT column_default, data_type, table_name, column_name, column_type, character_maximum_length, is_nullable FROM information_schema.columns WHERE table_schema = ?', [options.schema], function (err, res) {
      var edata, efound = false;

      if (err) {
        return callback(err);
      }
      
      doLog('Found', res.length, 'columns...');
      
      res.forEach(function(row) {
        meta.model[row.table_name].columns[row.column_name] = meta.model[row.table_name].columns[row.column_name] || {
          pname: row.column_name,
          hide: false,
          allowInsert: true,
          allowUpdate: true,
          allowSearch: false,
          allowFilter: false,
          joinOn: []
        };
        
        if (row.is_nullable === 'NO' && !row.column_default) {
          meta.model[row.table_name].columns[row.column_name].required = true;
        }

        meta.model[row.table_name].columns[row.column_name].type = getDT(row.data_type);
        meta.model[row.table_name].columns[row.column_name].maxLength = row.character_maximum_length || 0;

        meta.model[row.table_name].columns[row.column_name].dbType = row.column_type;

        if (row.column_default) {
          meta.model[row.table_name].columns[row.column_name].dbDefault = row.column_default;
        }

        if (row.column_type.substr(0, 4) === 'enum') {
          edata = row.column_type.substr(5, row.column_type.lastIndexOf(')') - 5).replace(/\'/g, '').split(',');
          //meta.model[row.table_name].columns[row.column_name].enumData = edata;
        
          //Find or create the enum 
          efound = false;
          Object.keys(meta.enums).some(function (name) {
            if (meta.enums[name].length === edata.length) {
              //Check that all fiels match perfectly - super inefficient 
              var m = edata.filter(function (entry) {
                for (var i = 0; i < meta.enums[name].length; i++) {
                  if (meta.enums[name][i] === entry) {
                    return false;
                  }
                }
                return true;
              });

              if (m.length === 0) {
                //Use this one
                meta.model[row.table_name].columns[row.column_name].enumData = name;
                efound = true;
                return true;
              } 
            }
          });

          if (!efound) {
            meta.model[row.table_name].columns[row.column_name].enumData = {
              comment: row.column_name + 'enum',
              entries: row.column_name
            };
            meta.enums[row.column_name] = edata;      
          }
        }

        addedTables[row.table_name][row.column_name] = true;
        
      });
      
      callback(null);
    });
  }
    
  function fetchTables(callback) {
    db.fetchAll('SELECT table_name, table_comment FROM information_schema.tables WHERE table_schema=?', [options.schema], function (err, res) {
      if (err) {
        return callback(err);
      }

      doLog('Found', res.length, 'tables..');
      
      res.forEach(function (row) {
        meta.model[row.table_name] = meta.model[row.table_name] || {
          shortname: row.table_name,
          columns: {},
          relations: []
        };
        if (typeof row.table_comment !== 'undefined' && row.table_comment.length > 0) {
          meta.model[row.table_name].comment = row.table_comment;          
        }
        addedTables[row.table_name] = {};
      });
      
      callback(null);    
    });
  }


  function removeDeadTables(callback) {
    if (options.removeDeadEnds && options.removeDeadEnds !== 'no' && options.removeDeadEnds !== 'n') {
      //Need to do some bookeeping here
      Object.keys(meta.model).forEach(function (table) {
        if (typeof addedTables[table] !== 'undefined') {
          Object.keys(meta.model[table].columns).forEach(function (col) {
            if (!addedTables[table][col]) {
              doLog('Removing dead colum', col, 'in', table);
              delete meta.model[table].columns[col];
            }
          });
        } else {
          doLog('Removing dead table', table);
          delete meta.model[table];
        }
      });
    }
    callback(null);
  }

  /////////////////////////////////////////////////////////////////////////////

  if (options.mergeWith && options.mergeWith.length > 0) {
    try {
      meta = JSON.parse(fs.readFileSync(options.mergeWith, 'utf8'))
    } catch (e) {
      doLog('Could not open dictionary', options.mergeWith, 'to merge with: ' + e);
      return false;
    }
  }

  meta.enums = meta.enums || {};

  if (options.schema.length === 0) {
    doLog('No schema specified');
    return false;
  }
  
  options.outputFile = options.outputFile === '<schemaname>.dict.json' ? options.schema + '.dict.json' : options.outputFile;
  
  //Connect to db
  db = new DBWrapper('mysql', {
    host: options.host, 
    user: options.username, 
    password: options.password, 
    database: options.schema
  });
  
  doLog('Analyzing', options.schema + '@' + options.host,'(this might take a moment)...');
  
  db.connect();

  async.waterfall([
    fetchTables,
    fetchColumns,
    fetchFKs
  ], function(err) {
    var pfuns = [];

    if (err) {
      return doLog('Error:', err);
    }

    doLog('Done with first pass, fetching primary keys...');

    //Fetch primary keys 
    Object.keys(addedTables).forEach(function (key) {
      pfuns.push(fetchPKCreator(key));
    });

    async.waterfall(pfuns.concat([
      removeDeadTables
    ]), function (err) {
      if (err) doLog('error:', err);
      doLog('All done! Enjoy your dictionary!');
      if (doneFn) {
        doneFn(err, meta);
      }
      //db.disconnect();
    });
  });
}

//Public interface
module.exports = {
  generate: genDictionary
};
