import { DataSourceOptions } from 'typeorm';

const SHOULD_USE_MYSQL =
  process.env.MYSQL_USER != null ||
  process.env.MYSQL_PORT != null ||
  process.env.MYSQL_PASSWORD != null ||
  process.env.MYSQL_DB != null;

export const connectionConfig: DataSourceOptions = SHOULD_USE_MYSQL
  ? {
      type: 'mysql',
      host: 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '', 10) || 3306,
      username: process.env.MYSQL_USER || 'root',
      password:
        process.env.MYSQL_PASSWORD !== undefined
          ? process.env.MYSQL_PASSWORD === ''
            ? undefined
            : process.env.MYSQL_PASSWORD
          : 'password',
      database: process.env.MYSQL_DB || 'casbin',
      dropSchema: true,
    }
  : {
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
    };
