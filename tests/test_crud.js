// NB: Please note this test script is run serially (.serial)
// This means they are supposed to be run in order, due to the
// Get Models setting up context. It's setup this way for flexibility.
import path from 'path';

import test from 'ava';
import dotenv from 'dotenv';

import { SquidexClientManager } from '../src/index';

dotenv.config();

const clientSecret = process.env.SQUIDEX_CLIENT_SECRET;
const clientId = process.env.SQUIDEX_CLIENT_ID;
const url = process.env.SQUIDEX_CONNECT_URL;
const appName = process.env.APP_NAME;

const client = new SquidexClientManager(url, appName, clientId, clientSecret);

function uniqueString(prefix) {
  const dateStamp = new Date().toString();
  return prefix ? `${prefix}-${dateStamp}` : dateStamp;
}

async function simpleWriteCheck(t, modelName, payload) {
  const record = await client.CreateAsync(modelName, payload);
  t.truthy(record.id);

  const records = await client.RecordsAsync(modelName, { top: 0 });
  t.true(records.items.length > 0);

  await client.DeleteAsync(modelName, { id: record.id });
}

test.before('Get Models', async (t) => {
  await client.ensureValidClient();
  const models = client.Models();
  t.true(Object.keys(models).length > 0);
});
 
test.serial('Articles', async (t) => {
  const text = uniqueString('Testo');
  const expected = { data: { title: { iv: text } }, publish: true };
  const article = await client.CreateAsync('Articles', expected);
  t.truthy(article);

  // Make sure we can find the recently created article
  const filter = await client.FilterRecordsAsync('Articles', expected, 'title');
  const created = filter[0];
  t.true(created !== undefined);
  t.true(created.data.title.iv === expected.data.title.iv);

  // Update exiting article and check the changes were made
  const update = await client.UpdateAsync('Articles', {
    id: article.id,
    data: {
      title: { iv: created.data.title.iv },
      text: { iv: 'x' },
    },
  });
  t.true(update.data.text.iv === 'x');
  t.truthy(article.id);

  // Create a image upload
  const upload = await client.CreateAssetAsync(path.resolve(__dirname, '../GitHub/power-by.png'));

  // Check update works via create or update call
  const createOrUpdate = await client.CreateOrUpdateAsync('Articles', {
    id: article.id,
    data: {
      title: { iv: update.data.title.iv },
      text: { iv: 'y' },
      image: { iv: [upload.body.id] },
    },
  }, 'title');
  t.true(createOrUpdate.data.text.iv === 'y');

  // Clean up
  const deleteOp = await client.DeleteAsync('Articles', { id: article.id });
  t.true(deleteOp.status === 204);
});

test.serial('Tag', async (t) => {
  await simpleWriteCheck(t, 'Tag', {
    publish: true,
    data: {
      name: { iv: uniqueString('cool') },
    },
  });
});

test.serial('check drafts', async (t) => {
  let filter = await client.FilterRecordsAsync('Articles', null, null)
  t.true(filter.length > 0);
  const drafts = filter.filter(s => s.status === 'Draft');
  console.log(drafts);
  console.log(JSON.stringify(drafts, null, 2));

  const record = drafts[0];
  if (record.status === 'Draft') {
    await client.ChangeStatus('Articles', drafts[0].id, 'Published')
    await client.ChangeStatus('Articles', drafts[0].id, 'Draft')
  } else {
    await client.ChangeStatus('Articles', drafts[0].id, 'Draft')
  }
})

test.serial('perserve custom fields', async (t) => {
  const customMeta = "Don't overwrite this";
  const createOrUpdate = await client.CreateOrUpdateAsync('Articles', {
    data: {
      title: { iv: 'truly unique' },
      text: { iv: 'y' },
      customMeta: { iv: customMeta },
    },
  }, 'title');
  process.env.SQUIDEX_CLIENT_MERGE_CUSTOM_PREFIX = "custom"
  t.true(createOrUpdate.data.customMeta.iv === customMeta);
  const change = await client.CreateOrUpdateAsync('Articles', {
    data: {
      title: { iv: 'truly unique' },
      text: { iv: 'y' },
      customMeta: { iv: uniqueString(customMeta) },
    },
  }, 'title');
  t.true(change.data.customMeta.iv === customMeta);
})
