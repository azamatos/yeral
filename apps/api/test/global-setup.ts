import pg from 'pg'
import { createDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { ADMIN_URL, TEMPLATE_DB, urlFor } from './env'

/** Once per run: a fresh template database with every migration applied. */
export default async function setup() {
  const admin = new pg.Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query(`drop database if exists "${TEMPLATE_DB}" with (force)`)
  await admin.query(`create database "${TEMPLATE_DB}"`)
  await admin.end()
  const pool = new pg.Pool({ connectionString: urlFor(TEMPLATE_DB), max: 1 })
  await runMigrations(createDb(pool))
  await pool.end()
}
