import { Options } from '@mikro-orm/core';
require('dotenv').config()

export const connectionConfig: Options = {
  type: 'mysql',
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '', 10) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password:
    process.env.MYSQL_PASSWORD !== undefined
      ? process.env.MYSQL_PASSWORD === ''
        ? undefined
        : process.env.MYSQL_PASSWORD
      : 'password',
  dbName: process.env.MYSQL_DB || 'casbin'
}
