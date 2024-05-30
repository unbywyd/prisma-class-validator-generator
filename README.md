# Prisma Class DTO Generator

[![NPM Version](https://img.shields.io/npm/v/prisma-class-dto-generator.svg)](https://www.npmjs.com/package/prisma-class-dto-generator)
[![License](https://img.shields.io/npm/l/prisma-class-dto-generator.svg)](https://github.com/omar-dulaimi/prisma-class-dto-generator/blob/master/LICENSE)

Prisma 2+ generator to emit TypeScript models of your database with class validator and class transformer.

## Installation

```sh
npm install prisma-class-dto-generator
```

## Usage

```
generator client {
  provider = "node node_modules/prisma-class-dto-generator"
}
```

Run prisma generate to generate the models.

Changes
This project is a fork of [prisma-class-validator-generator](https://github.com/omar-dulaimi/prisma-class-validator-generator) by Omar Dulaimi.

## Original Author
[Omar Dulaimi](https://github.com/omar-dulaimi)

## Contributors
[Artyom Gorlovetskiy](https://github.com/unbywyd)

## License
MIT