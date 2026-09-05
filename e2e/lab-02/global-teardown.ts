import { cleanupE2EData, database } from './database.js'

export default async function globalTeardown() {
  await cleanupE2EData()
  await (await database()).$disconnect()
}
