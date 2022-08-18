// Copyright 2018 The Casbin Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { MikroORM, Entity, Property } from '@mikro-orm/core';
import { Enforcer } from 'casbin';
import MikroORMAdapter, { CasbinRule } from '../src/index';
import { connectionConfig } from './config';

@Entity()
class CustomCasbinRule extends CasbinRule {
  @Property()
  public createdDate: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  public updatedDate: Date = new Date();
}

test(
  'TestAdapter',
  async () => {
    const orm = await MikroORM.init({
      ...connectionConfig,
      entities: [CustomCasbinRule]
      
    });

    const generator = orm.getSchemaGenerator();

    // const createDump = await generator.getCreateSchemaSQL();

    await generator.refreshDatabase();

    const a = await MikroORMAdapter.newAdapter(
      { connection: orm },
      {
        customCasbinRuleEntity: CustomCasbinRule,
      },
    );
    try {
      // Because the DB is empty at first,
      // so we need to load the policy from the file adapter (.CSV) first.
      const e = new Enforcer();

      await e.initWithFile(
        'examples/rbac_model.conf',
        'examples/rbac_policy.csv',
      );

      // This is a trick to save the current policy to the DB.
      // We can't call e.savePolicy() because the adapter in the enforcer is still the file adapter.
      // The current policy means the policy in the Node-Casbin enforcer (aka in memory).
      await a.savePolicy(e.getModel());

      const em = orm.em.fork();
      const rules = await (em.getRepository(CustomCasbinRule) as any).find();
      expect(rules[0].createdDate).not.toBeFalsy();
      expect(rules[0].updatedDate).not.toBeFalsy();
    } finally {
      a.close();
    }
  },
  60 * 1000,
);
