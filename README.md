Data Wrangler Mark IV
===

## What

Generates a set of models by analyzing a database schema.
Generation is done using handlebars (see `templates/` for the template files).

## Why & How

Database interface code is one of the more tedious things to write. It's repetitive, it's easy, and most of all --- it's boring. Using ORMs may make things somewhat quicker, but in the end, it's just moving the tediousness from one place to another, and does nothing to alleviate the repetitiveness. 

The Data Wrangler started as a way of (very) quickly getting a database interface up and running, and evolved into a generator system capable of outputting tidy models in (potentially) several languages. 

The wrangler uses a well-defined JSON dictionary (that to some extent mirrors the  meta tables available in most relational databases) to produce source code. The JSON dictionary can be generated automatically from analyzing an existing database using the bundled CLI tool, making it very quick to get up and running.

## Take it for a spin

To test it out, run `node bin/wrangler-cli.js`.
This will prompt you for connection info to a mysql database.
Once supplied, it will generate a set of model files and put them
in `tests/<schemaname>/`.

## License

[MIT](LICENSE)