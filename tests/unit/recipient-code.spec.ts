import { sql } from 'kysely'
import { describe, expect, it } from 'vitest'
import { blobsMap, recipientCode } from '../../server/utils/access-log'
import { compileAnalyticsQuery, createAnalyticsQuery } from '../../server/utils/analytics-sql'
import { buildAnalyticsFilter } from '../../server/utils/query-filter'

// Jafa Kids fork: a newsletter's per-recipient code (?r=) and the bot verdict, kept as blob17 and blob18.
describe('recipient code', () => {
  it('keeps 8 to 16 letters and digits, lower-cased', () => {
    expect(recipientCode('f3a9c2kd0m')).toBe('f3a9c2kd0m')
    expect(recipientCode(' F3A9C2KD0M ')).toBe('f3a9c2kd0m')
    expect(recipientCode('abcd1234')).toBe('abcd1234')
    expect(recipientCode('abcdefgh12345678')).toBe('abcdefgh12345678')
  })

  it('drops anything else', () => {
    expect(recipientCode(undefined)).toBe('')
    expect(recipientCode('')).toBe('')
    expect(recipientCode('short')).toBe('')
    expect(recipientCode('abcdefgh123456789')).toBe('')
    expect(recipientCode('abc-1234-x')).toBe('')
    expect(recipientCode('someone@example.com')).toBe('')
    expect(recipientCode(['abcd1234', 'efgh5678'])).toBe('')
  })

  it('adds its fields after the existing ones', () => {
    expect(blobsMap.blob16).toBe('COLO')
    expect(blobsMap.blob17).toBe('recipient')
    expect(blobsMap.blob18).toBe('bot')
    expect(Object.keys(blobsMap)).toHaveLength(18)
  })

  it('filters analytics by recipient and bot', () => {
    const filter = buildAnalyticsFilter({ limit: 500, recipient: 'abcd1234,efgh5678', bot: '1' })
    const query = createAnalyticsQuery('sink').selectAll().where(filter!).limit(sql.lit(10))

    expect(compileAnalyticsQuery(query))
      .toBe('select * from sink where blob17 in (\'abcd1234\', \'efgh5678\') and blob18 in (\'1\') limit 10')
  })
})
