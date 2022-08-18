// Copyright 2018 The Casbin Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Helper, Model, FilteredAdapter } from 'casbin';
import { MikroORM, Options, EntityRepository } from '@mikro-orm/core';
import { CasbinRule } from './casbinRule';
import { CasbinMongoRule } from './casbinMongoRule';

type GenericCasbinRule = CasbinRule | CasbinMongoRule;
type CasbinRuleConstructor = new (...args: any[]) => GenericCasbinRule;

interface ExistentConnection {
  connection: MikroORM;
}
export type MikroORMAdapterOptions = ExistentConnection | Options;

export interface MikroORMAdapterConfig {
  customCasbinRuleEntity?: CasbinRuleConstructor;
}

/**
 * MikroORMAdapter represents the TypeORM filtered adapter for policy storage.
 */
export default class MikroORMAdapter implements FilteredAdapter {
  private adapterConfig?: MikroORMAdapterConfig;
  private option: Options;
  private filtered = false;

  private orm: MikroORM;

  private constructor(
    option: MikroORMAdapterOptions,
    adapterConfig?: MikroORMAdapterConfig,
  ) {
    this.adapterConfig = adapterConfig;

    if ((option as ExistentConnection).connection) {
      this.orm = (option as ExistentConnection).connection;
      this.option = this.orm.config.getAll();
    } else {
      this.option = option as Options;
    }
  }

  public isFiltered(): boolean {
    return this.filtered;
  }

  /**
   * newAdapter is the constructor.
   * @param option typeorm connection option
   */
  public static async newAdapter(
    option: MikroORMAdapterOptions,
    adapterConfig?: MikroORMAdapterConfig
  ) {
    let a: MikroORMAdapter;

    const defaults = {
      // synchronize: true,
      // name: 'node-casbin-official',
    };
    if ((option as ExistentConnection).connection) {
      a = new MikroORMAdapter(option, adapterConfig);
    } else {
      const options = option as Options;
      const entities = {
        entities: [
          this.getCasbinRuleType(options.type as string, adapterConfig)
        ]
      };
      const configuration = Object.assign(defaults, options);
      a = new MikroORMAdapter(
        Object.assign(configuration, entities),
        adapterConfig
      );
    }
    await a.open();
    return a;
  }

  private async open() {
    if (!this.orm) {
      this.orm = await MikroORM.init({
        ...this.option
      });
    }

    const isConnected = await this.orm.isConnected();
    if (!isConnected) {
      await this.orm.connect();
    }
  }

  public async close() {
    const isConnected = await this.orm.isConnected();
    if (isConnected) {
      await this.orm.close(true);
    }
  }

  private async clearTable() {
    const em = this.orm.em.fork();
    em.clear();
  }

  private loadPolicyLine(line: GenericCasbinRule, model: Model) {
    const result =
      line.ptype +
      ', ' +
      [line.v0, line.v1, line.v2, line.v3, line.v4, line.v5, line.v6]
        .filter((n) => n)
        .map((n) => `"${n}"`)
        .join(', ');
    Helper.loadPolicyLine(result, model);
  }

  /**
   * loadPolicy loads all policy rules from the storage.
   */
  public async loadPolicy(model: Model) {
    const lines = await this.getRepository().find({});

    for (const line of lines) {
      this.loadPolicyLine(line, model);
    }
  }

  // Loading policies based on filter condition
  public async loadFilteredPolicy(model: Model, filter: object) {
    // const filteredLines = await getRepository(
    //   this.getCasbinRuleConstructor(),
    //   this.option.name,
    // ).find(filter);
    const filteredLines = await this.getRepository().find(filter);
    for (const line of filteredLines) {
      this.loadPolicyLine(line, model);
    }
    this.filtered = true;
  }

  private savePolicyLine(ptype: string, rule: string[]): GenericCasbinRule {
    const line = new (this.getCasbinRuleConstructor())();

    line.ptype = ptype;
    if (rule.length > 0) {
      line.v0 = rule[0];
    }
    if (rule.length > 1) {
      line.v1 = rule[1];
    }
    if (rule.length > 2) {
      line.v2 = rule[2];
    }
    if (rule.length > 3) {
      line.v3 = rule[3];
    }
    if (rule.length > 4) {
      line.v4 = rule[4];
    }
    if (rule.length > 5) {
      line.v5 = rule[5];
    }
    if (rule.length > 6) {
      line.v6 = rule[6];
    }

    return line;
  }

  /**
   * savePolicy saves all policy rules to the storage.
   */
  public async savePolicy(model: Model) {
    await this.clearTable();

    let astMap = model.model.get('p');
    const lines: GenericCasbinRule[] = [];
    // @ts-ignore
    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        lines.push(line);
      }
    }

    astMap = model.model.get('g');
    // @ts-ignore
    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        lines.push(line);
      }
    }

    await this.getRepository().persistAndFlush(lines);
    return true;
  }

  /**
   * addPolicy adds a policy rule to the storage.
   */
  public async addPolicy(sec: string, ptype: string, rule: string[]) {
    const line = this.savePolicyLine(ptype, rule);
    await this.getRepository().persistAndFlush(line);
  }

  /**
   * addPolicies adds policy rules to the storage.
   */
  public async addPolicies(sec: string, ptype: string, rules: string[][]) {
    const lines: GenericCasbinRule[] = [];
    for (const rule of rules) {
      const line = this.savePolicyLine(ptype, rule);
      lines.push(line);
    }

    await this.getRepository().persistAndFlush(lines);
  }

  /**
   * removePolicy removes a policy rule from the storage.
   */
  public async removePolicy(sec: string, ptype: string, rule: string[]) {
    const line = this.savePolicyLine(ptype, rule);
    await this.getRepository().nativeDelete({ ...line });
  }

  /**
   * removePolicies removes policy rules from the storage.
   */
  public async removePolicies(sec: string, ptype: string, rules: string[][]) {
    for (const rule of rules) {
      const line = this.savePolicyLine(ptype, rule);
      await this.getRepository().nativeDelete({ ...line });
    }
  }

  /**
   * removeFilteredPolicy removes policy rules that match the filter from the storage.
   */
  public async removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ) {
    const line = new (this.getCasbinRuleConstructor())();

    line.ptype = ptype;

    if (fieldIndex <= 0 && 0 < fieldIndex + fieldValues.length) {
      line.v0 = fieldValues[0 - fieldIndex];
    }
    if (fieldIndex <= 1 && 1 < fieldIndex + fieldValues.length) {
      line.v1 = fieldValues[1 - fieldIndex];
    }
    if (fieldIndex <= 2 && 2 < fieldIndex + fieldValues.length) {
      line.v2 = fieldValues[2 - fieldIndex];
    }
    if (fieldIndex <= 3 && 3 < fieldIndex + fieldValues.length) {
      line.v3 = fieldValues[3 - fieldIndex];
    }
    if (fieldIndex <= 4 && 4 < fieldIndex + fieldValues.length) {
      line.v4 = fieldValues[4 - fieldIndex];
    }
    if (fieldIndex <= 5 && 5 < fieldIndex + fieldValues.length) {
      line.v5 = fieldValues[5 - fieldIndex];
    }
    if (fieldIndex <= 6 && 6 < fieldIndex + fieldValues.length) {
      line.v6 = fieldValues[6 - fieldIndex];
    }

    await this.getRepository().nativeDelete({ ...line });
  }

  public getOrm() {
    return this.orm;
  }

  private getCasbinRuleConstructor(): CasbinRuleConstructor {
    return MikroORMAdapter.getCasbinRuleType(
      this.option.type as string,
      this.adapterConfig,
    );
  }

  /**
   * Returns either a {@link CasbinRule} or a {@link CasbinMongoRule}, depending on the type. This switch is required as the normal
   * {@link CasbinRule} does not work when using MongoDB as a backend (due to a missing ObjectID field).
   * @param type
   */
  private static getCasbinRuleType(
    type: string,
    adapterConfig?: MikroORMAdapterConfig,
  ): CasbinRuleConstructor {
    if (adapterConfig?.customCasbinRuleEntity) {
      return adapterConfig.customCasbinRuleEntity;
    }

    if (type === 'mongodb') {
      return CasbinMongoRule;
    }
    return CasbinRule;
  }

  private getRepository(): EntityRepository<GenericCasbinRule> {
    const em = this.orm.em.fork();
    return em.getRepository(this.getCasbinRuleConstructor());
  }
}
