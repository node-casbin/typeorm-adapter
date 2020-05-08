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

import {Adapter, Helper, Model} from 'casbin';
import {CasbinRule} from './casbinRule';
import {Connection, ConnectionOptions, createConnection, getRepository, getConnection} from 'typeorm';
import {CasbinMongoRule} from './casbinMongoRule';

type GenericCasbinRule = CasbinRule | CasbinMongoRule;
type CasbinRuleConstructor = new (...args: any[]) => GenericCasbinRule;

/**
 * TypeORMAdapter represents the TypeORM adapter for policy storage.
 */
export default class TypeORMAdapter implements Adapter {
    private option: ConnectionOptions;
    private typeorm: Connection;

    private constructor(option: ConnectionOptions) {
        this.option = option;
    }

    /**
     * newAdapter is the constructor.
     * @param option typeorm connection option
     */
    public static async newAdapter(option: ConnectionOptions) {
        const defaults = {
            synchronize: true,
            name: 'node-casbin-official',
        };
        const entities = {entities: [this.getCasbinRuleType(option.type)]};
        const configuration = Object.assign(defaults, option);
        const a = new TypeORMAdapter(Object.assign(configuration, entities));
        await a.open();
        return a;
    }

    private async open() {
        this.typeorm = await createConnection(this.option);
        if (!this.typeorm.isConnected) {
            await this.typeorm.connect();
        }
    }

    public async close() {
        if (this.typeorm.isConnected) {
            await this.typeorm.close();
        }
    }

    private async clearTable() {
        await getRepository(this.getCasbinRuleConstructor(), this.option.name).clear();
    }

    private loadPolicyLine(line: GenericCasbinRule, model: Model) {
        const result = line.ptype + ', ' + [line.v0, line.v1, line.v2, line.v3, line.v4, line.v5].filter(n => n).join(', ');
        Helper.loadPolicyLine(result, model);
    }

    /**
     * loadPolicy loads all policy rules from the storage.
     */
    public async loadPolicy(model: Model) {
        const lines = await getRepository(this.getCasbinRuleConstructor(), this.option.name).find();

        for (const line of lines) {
            this.loadPolicyLine(line, model);
        }
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

        const queryRunner = this.typeorm.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.manager.save(lines);
            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }

        return true;
    }

    /**
     * addPolicy adds a policy rule to the storage.
     */
    public async addPolicy(sec: string, ptype: string, rule: string[]) {
        const line = this.savePolicyLine(ptype, rule);
        await getRepository(this.getCasbinRuleConstructor(), this.option.name).save(line);
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

        const queryRunner = this.typeorm.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.manager.save(lines);
            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * removePolicy removes a policy rule from the storage.
     */
    public async removePolicy(sec: string, ptype: string, rule: string[]) {
        const line = this.savePolicyLine(ptype, rule);
        await getRepository(this.getCasbinRuleConstructor(), this.option.name).delete(line);
    }

    /**
     * removePolicies removes policy rules from the storage.
     */
    public async removePolicies(sec: string, ptype: string, rules: string[][]) {
        const queryRunner = this.typeorm.createQueryRunner();
        const type = TypeORMAdapter.getCasbinRuleType(this.option.type);

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            for (const rule of rules) {
                const line = this.savePolicyLine(ptype, rule);
                await queryRunner.manager.delete(type, line);
            }
            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * removeFilteredPolicy removes policy rules that match the filter from the storage.
     */
    public async removeFilteredPolicy(sec: string, ptype: string, fieldIndex: number, ...fieldValues: string[]) {
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
        await getRepository(this.getCasbinRuleConstructor(), this.option.name).delete(line);
    }

    private getCasbinRuleConstructor(): CasbinRuleConstructor {
        return TypeORMAdapter.getCasbinRuleType(this.option.type);
    }

    /**
     * Returns either a {@link CasbinRule} or a {@link CasbinMongoRule}, depending on the type. This switch is required as the normal
     * {@link CasbinRule} does not work when using MongoDB as a backend (due to a missing ObjectID field).
     * @param type
     */
    private static getCasbinRuleType(type: string): CasbinRuleConstructor {
        if (type === 'mongodb') {
            return CasbinMongoRule;
        }
        return CasbinRule;
    }
}
