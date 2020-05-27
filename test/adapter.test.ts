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

import {Enforcer, Util} from 'casbin';
import TypeORMAdapter from '../src/adapter';

function testGetPolicy(e: Enforcer, res: string[][]) {
    const myRes = e.getPolicy();
    console.log('Policy: ', myRes);

    expect(Util.array2DEquals(res, myRes)).toBe(true);
}

test('TestAdapter', async () => {
    const a = await TypeORMAdapter.newAdapter({
        // type: 'mysql',
        // host: 'localhost',
        // port: 3306,
        // username: 'root',
        // password: 'password',
        // database: 'casbin',

        type: 'mysql',
        host: '192.168.1.5',
        port: 3306,
        username: 'root',
        password: 'password',
        database: 'casbin',
        //insecureAuth : true
    });
    try {
        // Because the DB is empty at first,
        // so we need to load the policy from the file adapter (.CSV) first.
        let e = await Enforcer.newEnforcer('examples/rbac_model.conf', 'examples/rbac_policy.csv');

        // This is a trick to save the current policy to the DB.
        // We can't call e.savePolicy() because the adapter in the enforcer is still the file adapter.
        // The current policy means the policy in the Node-Casbin enforcer (aka in memory).
        await a.savePolicy(e.getModel());

        // Clear the current policy.
        e.clearPolicy();
        testGetPolicy(e, []);

        // Load the policy from DB.
        await a.loadPolicy(e.getModel());
        testGetPolicy(e, [
            ['alice', 'data1', 'read'],
            ['bob', 'data2', 'write'],
            ['data2_admin', 'data2', 'read'],
            ['data2_admin', 'data2', 'write']]);

        // Note: you don't need to look at the above code
        // if you already have a working DB with policy inside.

        // Now the DB has policy, so we can provide a normal use case.
        // Create an adapter and an enforcer.
        // newEnforcer() will load the policy automatically.
        e = await Enforcer.newEnforcer('examples/rbac_model.conf', a);
        testGetPolicy(e, [
            ['alice', 'data1', 'read'],
            ['bob', 'data2', 'write'],
            ['data2_admin', 'data2', 'read'],
            ['data2_admin', 'data2', 'write']]);

        // Add policy to DB
        await a.addPolicy('', 'p', ['role', 'res', 'action']);
        e = await Enforcer.newEnforcer('examples/rbac_model.conf', a);
        testGetPolicy(e, [
            ['alice', 'data1', 'read'],
            ['bob', 'data2', 'write'],
            ['data2_admin', 'data2', 'read'],
            ['data2_admin', 'data2', 'write'],
            ['role', 'res', 'action']]);

        await a.addPolicies('', 'p', [
            ['role1', 'res1', 'action1'],
            ['role2', 'res2', 'action2'],
            ['role3', 'res3', 'action3'],
            ['role4', 'res4', 'action4'],
            ['role5', 'res5', 'action5']
        ]);
        e = await Enforcer.newEnforcer('examples/rbac_model.conf', a);
        testGetPolicy(e, [
            ['alice', 'data1', 'read'],
            ['bob', 'data2', 'write'],
            ['data2_admin', 'data2', 'read'],
            ['data2_admin', 'data2', 'write'],
            ['role', 'res', 'action'],
            ['role1', 'res1', 'action1'],
            ['role2', 'res2', 'action2'],
            ['role3', 'res3', 'action3'],
            ['role4', 'res4', 'action4'],
            ['role5', 'res5', 'action5']
        ]);

        // Remove policy from DB
        await a.removePolicy('', 'p', ['role', 'res', 'action']);
        e = await Enforcer.newEnforcer('examples/rbac_model.conf', a);
        testGetPolicy(e, [
            ['alice', 'data1', 'read'],
            ['bob', 'data2', 'write'],
            ['data2_admin', 'data2', 'read'],
            ['data2_admin', 'data2', 'write'],
            ['role1', 'res1', 'action1'],
            ['role2', 'res2', 'action2'],
            ['role3', 'res3', 'action3'],
            ['role4', 'res4', 'action4'],
            ['role5', 'res5', 'action5']
        ]);

        await a.removePolicies('', 'p', [
            ['role1', 'res1', 'action1'],
            ['role2', 'res2', 'action2'],
            ['role3', 'res3', 'action3'],
            ['role4', 'res4', 'action4'],
            ['role5', 'res5', 'action5']
        ]);
        e = await Enforcer.newEnforcer('examples/rbac_model.conf', a);
        testGetPolicy(e, [
            ['alice', 'data1', 'read'],
            ['bob', 'data2', 'write'],
            ['data2_admin', 'data2', 'read'],
            ['data2_admin', 'data2', 'write']]);

        // Load Filtered Policy
        //await e.loadFilteredPolicy({ ptype : 'p', v0 : 'alice'  });
        //testGetPolicy(e, [['alice', 'data1', 'read']]);
    } finally {
        a.close();
    }
}, 60 * 1000);
