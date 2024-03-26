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

import { Enforcer, setDefaultFileSystem } from 'casbin';
import {
  CreateDateColumn,
  DataSource,
  Entity,
  EntityNotFoundError,
  UpdateDateColumn,
} from 'typeorm';
import TypeORMAdapter, { CasbinRule } from '../src/index';
import { connectionConfig } from './config';

import * as fs from 'fs';
setDefaultFileSystem(fs as any);

@Entity('custom_rule')
class CustomCasbinRule extends CasbinRule {
  @CreateDateColumn()
  public createdDate: Date;

  @UpdateDateColumn()
  public updatedDate: Date;
}

test(
  'TestAdapter',
  async () => {
    const datasource = new DataSource({
      ...connectionConfig,
      entities: [CustomCasbinRule],
      synchronize: true,
    });

    const a = await TypeORMAdapter.newAdapter(
      { connection: datasource },
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

      const repository = datasource.getRepository(CustomCasbinRule);
      const rules = await repository.find();
      expect(rules[0].createdDate).not.toBeFalsy();
      expect(rules[0].updatedDate).not.toBeFalsy();

      // Verify update method works
      const initialPolicy = ['bob', 'data3', 'write'];
      const updatedPolicy = ['bob', 'data3', 'read'];
      const getCurrentPolicyLinesFromDB = async () => {
        const policyRow = await repository.findOneByOrFail({
          v0: initialPolicy[0],
          v1: initialPolicy[1],
        });
        return [policyRow.v0, policyRow.v1, policyRow.v2];
      };

      await a.addPolicy('', 'p', initialPolicy);
      expect(await getCurrentPolicyLinesFromDB()).toMatchObject(initialPolicy);

      await a.updatePolicy('', 'p', initialPolicy, updatedPolicy);
      expect(await getCurrentPolicyLinesFromDB()).toMatchObject(updatedPolicy);

      // We expect that we won't find a read policy anymore
      await expect(
        repository.findOneByOrFail({
          v0: initialPolicy[0],
          v1: initialPolicy[1],
          v2: initialPolicy[2],
        }),
      ).rejects.toThrow(EntityNotFoundError);
    } finally {
      a.close();
    }
  },
  60 * 1000,
);
