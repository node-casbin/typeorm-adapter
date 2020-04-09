TypeORM Adapter
====
[![NPM version][npm-image]][npm-url]
[![NPM download][download-image]][download-url]
[![codebeat badge](https://codebeat.co/badges/7b938f17-ac89-4ee9-b3cc-787b5e94720d)](https://codebeat.co/projects/github-com-node-casbin-typeorm-adapter-master)
[![Build Status](https://travis-ci.org/node-casbin/typeorm-adapter.svg?branch=master)](https://travis-ci.org/node-casbin/typeorm-adapter)
[![Coverage Status](https://coveralls.io/repos/github/node-casbin/typeorm-adapter/badge.svg?branch=master)](https://coveralls.io/github/node-casbin/typeorm-adapter?branch=master)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/casbin/lobby)

[npm-image]: https://img.shields.io/npm/v/typeorm-adapter.svg?style=flat-square
[npm-url]: https://npmjs.org/package/typeorm-adapter
[download-image]: https://img.shields.io/npm/dm/typeorm-adapter.svg?style=flat-square
[download-url]: https://npmjs.org/package/typeorm-adapter

TypeORM Adapter is the [TypeORM](https://github.com/typeorm/typeorm) adapter for [Node-Casbin](https://github.com/casbin/node-casbin). With this library, Node-Casbin can load policy from TypeORM supported database or save policy to it.

Based on [Officially Supported Databases](http://typeorm.io), the current supported databases are:

- MySQL
- PostgreSQL
- MariaDB
- SQLite
- MS SQL Server
- Oracle
- WebSQL
- MongoDB 


You may find other 3rd-party supported DBs in TypeORM website or other places.

## Installation

    npm install typeorm-adapter

## Simple Example

```typescript
import { newEnforcer } from 'casbin';
import TypeORMAdapter from 'typeorm-adapter';

async function myFunction() {
    // Initialize a TypeORM adapter and use it in a Node-Casbin enforcer:
    // The adapter can not automatically create database.
    // But the adapter will automatically and use the table named "casbin_rule".
    // I think ORM should not automatically create databases.  
    const a = await TypeORMAdapter.newAdapter({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: '',
        database: 'casbin',
    });


    const e = await newEnforcer('examples/rbac_model.conf', a);

    // Load the policy from DB.
    await e.loadPolicy();

    // Check the permission.
    e.enforce('alice', 'data1', 'read');

    // Modify the policy.
    // await e.addPolicy(...);
    // await e.removePolicy(...);

    // Save the policy back to DB.
    await e.savePolicy();
}
```

## Getting Help

- [Node-Casbin](https://github.com/casbin/node-casbin)

## License

This project is under Apache 2.0 License. See the [LICENSE](LICENSE) file for the full license text.
