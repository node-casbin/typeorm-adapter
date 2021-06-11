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

import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from 'typeorm';

@Entity()
export class CasbinRule extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({
    nullable: true,
  })
  public ptype: string;

  @Column({
    nullable: true,
  })
  public v0: string;

  @Column({
    nullable: true,
  })
  public v1: string;

  @Column({
    nullable: true,
  })
  public v2: string;

  @Column({
    nullable: true,
  })
  public v3: string;

  @Column({
    nullable: true,
  })
  public v4: string;

  @Column({
    nullable: true,
  })
  public v5: string;

  @Column({
    nullable: true,
  })
  public v6: string;
}
