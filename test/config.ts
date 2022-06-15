import { DataSourceOptions } from 'typeorm';

export const connectionConfig: DataSourceOptions = {
  type: 'mysql',
  host: 'localhost',
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  username: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD === '' ? undefined : process.env.MYSQL_PASSWORD : 'password',
  database: process.env.MYSQL_DB || 'casbin',
  dropSchema: true,
};
