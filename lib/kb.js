/* Knowledge base for retrieval-augmented answers (RAG).
   Articles live in SQLite. A full-text index (FTS5, BM25 ranking) finds the most relevant ones,
   and Ask Mkulima AI reads them before answering advice questions.
   Admins manage articles through /api/admin/kb (create, read, update, delete). */

const SEED_SOURCE = 'Mkulima Market team';

// Starter articles written by the Mkulima Market team. Platform guidance and widely known
// handling practice only: no prices, statistics or legal claims. Edit or remove them in /admin.
const SEED_ARTICLES = [
  {
    slug: 'good-listing-en', lang: 'en', category: 'selling', tags: 'listing photos price description sell',
    title: 'How to write a listing that sells',
    body: `Buyers compare many listings, so make yours easy to trust.
1. Title: say the produce, variety and grade, for example "Shangi potatoes, Grade A".
2. Quantity: give the amount in kg. If you sell in bags or crates, also say how many kg one bag or crate holds.
3. Price: give the price per kg and say if it is negotiable.
4. Location: name the nearest market or town so buyers can judge transport.
5. Description: describe size, freshness, harvest date and how the produce is packed. Only describe what is true.
6. Photos: take clear photos in daylight showing the real produce.
7. Keep stock up to date. Mark the listing "Almost out" or "Sold" as soon as it changes, so buyers do not waste a trip.`
  },
  {
    slug: 'good-listing-sw', lang: 'sw', category: 'selling', tags: 'tangazo picha bei maelezo kuuza',
    title: 'Jinsi ya kuandika tangazo linalouza',
    body: `Wanunuzi hulinganisha matangazo mengi, kwa hivyo fanya lako liaminike.
1. Kichwa: taja zao, aina na daraja, kwa mfano "Viazi Shangi, Daraja A".
2. Kiasi: weka kiasi kwa kilo. Ukiuza kwa magunia au kreti, sema gunia au kreti moja ina kilo ngapi.
3. Bei: weka bei kwa kilo na sema kama inajadilika.
4. Eneo: taja soko au mji ulio karibu ili wanunuzi wakadirie usafiri.
5. Maelezo: eleza ukubwa, ubichi, tarehe ya kuvuna na jinsi mazao yamefungwa. Eleza ukweli pekee.
6. Picha: piga picha wazi mchana zinazoonyesha mazao halisi.
7. Sasisha akiba. Weka "Karibu kuisha" au "Imeuzwa" mara moja ili wanunuzi wasipoteze safari.`
  },
  {
    slug: 'safe-trading-en', lang: 'en', category: 'safety', tags: 'safety fraud scam payment mpesa meet',
    title: 'Trading safely on Mkulima Market',
    body: `- Meet at a public market or a known business location, not a private home.
- Inspect and weigh produce before paying. Agree the weight in kg, not only "bags".
- Do not send money before you have seen the produce or have a trusted arrangement.
- Keep M-Pesa messages and receipts as a record of every payment.
- Be careful of prices far below other listings, and of anyone who pressures you to pay quickly.
- Never share your password or M-Pesa PIN. Mkulima Market staff will never ask for them.
- Report suspicious listings or users to the Mkulima Market team.`
  },
  {
    slug: 'safe-trading-sw', lang: 'sw', category: 'safety', tags: 'usalama ulaghai malipo mpesa kukutana',
    title: 'Kufanya biashara salama kwenye Mkulima Market',
    body: `- Kutaneni sokoni au kwenye eneo la biashara linalojulikana, si nyumbani.
- Kagua na pima mazao kabla ya kulipa. Kubalianeni uzito kwa kilo, si "magunia" pekee.
- Usitume pesa kabla ya kuona mazao au kuwa na makubaliano ya kuaminika.
- Hifadhi ujumbe na risiti za M-Pesa kama kumbukumbu ya kila malipo.
- Kuwa mwangalifu na bei za chini mno kuliko matangazo mengine, na mtu anayekulazimisha kulipa haraka.
- Usimpe mtu nenosiri lako wala PIN ya M-Pesa. Wafanyakazi wa Mkulima Market hawataziomba kamwe.
- Ripoti matangazo au watumiaji wanaotiliwa shaka kwa timu ya Mkulima Market.`
  },
  {
    slug: 'prices-explained-en', lang: 'en', category: 'platform', tags: 'price asking reported confirmed distance straight-line',
    title: 'How prices and distances work on Mkulima Market',
    body: `Asking price: the price a seller sets on a listing. It is what they hope to get, not a market average.
Reported market price: a price collected at a market from an official or named source, shown with its date and source.
Confirmed price: the price in a completed trade.
These are never mixed in one chart. Trends are shown only when there is enough reported data.
Distances: unless a page says "by road", distances are straight-line. Road distance is usually longer.
Transport costs: only a transporter can give a real quote. Any figure based on a per-km rate is marked "indicative".`
  },
  {
    slug: 'prices-explained-sw', lang: 'sw', category: 'platform', tags: 'bei kuuliza iliyoripotiwa iliyothibitishwa umbali',
    title: 'Jinsi bei na umbali vinavyofanya kazi kwenye Mkulima Market',
    body: `Bei ya kuuliza: bei anayoweka muuzaji kwenye tangazo. Ndiyo anayotarajia, si wastani wa soko.
Bei ya soko iliyoripotiwa: bei iliyokusanywa sokoni kutoka chanzo rasmi au kinachotajwa, ikiwa na tarehe na chanzo.
Bei iliyothibitishwa: bei katika biashara iliyokamilika.
Bei hizi hazichanganywi kwenye chati moja. Mwelekeo huonyeshwa tu data ikitosha.
Umbali: isipokuwa ukurasa useme "kwa barabara", umbali ni wa mstari ulionyooka. Umbali wa barabara kwa kawaida ni mrefu zaidi.
Gharama za usafiri: msafirishaji pekee ndiye anaweza kutoa bei halisi. Kiasi chochote kinachotokana na kiwango cha kwa kilomita kinaitwa "makadirio".`
  },
  {
    slug: 'tomato-handling-en', lang: 'en', category: 'post-harvest', tags: 'tomatoes nyanya handling crates shade transport losses',
    title: 'Reducing tomato losses after harvest',
    body: `- Harvest in the cool part of the day and keep tomatoes in the shade.
- Use clean, rigid crates rather than sacks, which crush fruit.
- Do not overfill crates or stack them too high.
- Sort out damaged or diseased fruit before packing; one rotting tomato spoils those around it.
- Separate by ripeness so buyers get what they expect, and sell the ripest first.
- Load and unload gently, and transport in the cooler hours where possible.`
  },
  {
    slug: 'potato-storage-en', lang: 'en', category: 'post-harvest', tags: 'potatoes viazi storage greening sprouting',
    title: 'Storing potatoes before sale',
    body: `- Store potatoes in a dark, cool, well-ventilated place. Light turns them green, and green potatoes should not be eaten or sold.
- Sort out cut, bruised or rotting tubers before storage.
- Keep them dry and off the bare floor, for example on pallets.
- Check stored potatoes regularly and remove any that rot or sprout.
- Agree with buyers on the weight in kg, because bag sizes vary.`
  },
  {
    slug: 'find-buyers-en', lang: 'en', category: 'selling', tags: 'buyers sell market find customers',
    title: 'How to find buyers for your produce',
    body: `- Create a complete listing with real photos, the quantity in kg, your price and the nearest market.
- Complete your profile so buyers know who you are and where you trade.
- Reply quickly to enquiries; fast replies win more trades.
- Keep your stock status current so buyers trust your listings.
- Ask Mkulima AI which sellers and listings are near you, to understand what others are asking.
- After a trade, ask the buyer to leave a review. Good reviews help you rank higher.`
  },
  {
    slug: 'find-buyers-sw', lang: 'sw', category: 'selling', tags: 'wanunuzi kuuza soko wateja',
    title: 'Jinsi ya kupata wanunuzi wa mazao yako',
    body: `- Unda tangazo kamili lenye picha halisi, kiasi kwa kilo, bei yako na soko lililo karibu.
- Kamilisha wasifu wako ili wanunuzi wakujue na wajue unakofanyia biashara.
- Jibu maswali haraka; majibu ya haraka huleta biashara zaidi.
- Sasisha hali ya akiba yako ili wanunuzi waamini matangazo yako.
- Uliza Mkulima AI kuhusu wauzaji na matangazo yaliyo karibu nawe ili ujue wengine wanauliza bei gani.
- Baada ya biashara, mwombe mnunuzi aache maoni. Maoni mazuri hukusaidia kuonekana juu zaidi.`
  },
  {
    slug: 'transport-en', lang: 'en', category: 'transport', tags: 'transport lorry truck quote delivery route',
    title: 'Arranging transport for your produce',
    body: `- Tell the transporter the pickup point, destination, load in kg, type of produce and the date.
- Ask for a quote before loading. Any "indicative" figure on Mkulima Market is only a guide.
- For perishables like tomatoes, ask for a vehicle with shade or ventilation and travel in cooler hours.
- Agree who pays for loading and offloading.
- Confirm the vehicle capacity is enough for your load.
- Keep payment records and confirm delivery with the buyer.`
  }
];

function ftsQuery(text) {
  const words = String(text || '').toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [];
  const unique = [...new Set(words)].slice(0, 12);
  return unique.map((w) => `"${w}"*`).join(' OR ');
}

module.exports = function createKb({ run, get, all }) {
  let ftsEnabled = true;

  async function init() {
    await run(`
      CREATE TABLE IF NOT EXISTS kb_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        lang TEXT NOT NULL DEFAULT 'en' CHECK(lang IN ('en', 'sw')),
        category TEXT,
        tags TEXT,
        source TEXT,
        published INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      await run(`CREATE VIRTUAL TABLE IF NOT EXISTS kb_fts USING fts5(
        title, body, tags, content='kb_articles', content_rowid='id', tokenize='unicode61 remove_diacritics 2')`);
      // Keep the search index in sync with the table.
      await run(`CREATE TRIGGER IF NOT EXISTS kb_ai AFTER INSERT ON kb_articles BEGIN
        INSERT INTO kb_fts(rowid, title, body, tags) VALUES (new.id, new.title, new.body, new.tags); END`);
      await run(`CREATE TRIGGER IF NOT EXISTS kb_ad AFTER DELETE ON kb_articles BEGIN
        INSERT INTO kb_fts(kb_fts, rowid, title, body, tags) VALUES ('delete', old.id, old.title, old.body, old.tags); END`);
      await run(`CREATE TRIGGER IF NOT EXISTS kb_au AFTER UPDATE ON kb_articles BEGIN
        INSERT INTO kb_fts(kb_fts, rowid, title, body, tags) VALUES ('delete', old.id, old.title, old.body, old.tags);
        INSERT INTO kb_fts(rowid, title, body, tags) VALUES (new.id, new.title, new.body, new.tags); END`);
    } catch (e) {
      ftsEnabled = false;
      console.warn('FTS5 not available, knowledge search falls back to LIKE:', e.message);
    }
    const count = await get('SELECT COUNT(*) AS c FROM kb_articles');
    if (!count.c) {
      for (const a of SEED_ARTICLES) {
        await run('INSERT INTO kb_articles (slug, title, body, lang, category, tags, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [a.slug, a.title, a.body, a.lang, a.category, a.tags, SEED_SOURCE]);
      }
    }
  }

  // Retrieval: best matching published articles, preferring the user's language.
  async function search(query, { lang = null, limit = 3 } = {}) {
    const q = ftsQuery(query);
    if (!q) return [];
    let rows;
    if (ftsEnabled) {
      rows = await all(
        `SELECT a.id, a.title, a.body, a.lang, a.category, a.source, a.updated_at, bm25(kb_fts, 5.0, 1.0, 3.0) AS score
         FROM kb_fts JOIN kb_articles a ON a.id = kb_fts.rowid
         WHERE kb_fts MATCH ? AND a.published = 1
         ORDER BY score LIMIT 20`, [q]);
    } else {
      const words = q.match(/"([^"]+)"/g).map((w) => w.replace(/"/g, ''));
      const where = words.map(() => '(LOWER(title) LIKE ? OR LOWER(body) LIKE ? OR LOWER(tags) LIKE ?)').join(' OR ');
      rows = await all(`SELECT id, title, body, lang, category, source, updated_at, 0 AS score FROM kb_articles WHERE published = 1 AND (${where}) LIMIT 20`,
        words.flatMap((w) => [`%${w}%`, `%${w}%`, `%${w}%`]));
    }
    if (lang) rows.sort((x, y) => (x.lang === lang ? 0 : 1) - (y.lang === lang ? 0 : 1) || x.score - y.score);
    return rows.slice(0, limit);
  }

  function validate(body, partial) {
    const out = {};
    const b = body || {};
    if (!partial || b.title !== undefined) {
      out.title = String(b.title || '').trim();
      if (!out.title || out.title.length > 160) return { error: 'Title is required (max 160 characters)' };
    }
    if (!partial || b.body !== undefined) {
      out.body = String(b.body || '').trim();
      if (!out.body || out.body.length > 20000) return { error: 'Body is required (max 20,000 characters)' };
    }
    if (!partial || b.lang !== undefined) {
      out.lang = b.lang === 'sw' ? 'sw' : 'en';
    }
    for (const k of ['category', 'tags', 'source']) {
      if (!partial || b[k] !== undefined) out[k] = String(b[k] || '').trim().slice(0, 200) || null;
    }
    if (!partial || b.published !== undefined) out.published = b.published === false || b.published === 0 || b.published === '0' ? 0 : 1;
    return { value: out };
  }

  function registerRoutes(app, { requireAdmin, publicLimiter }) {
    // Public: search and read published articles.
    app.get('/api/kb', publicLimiter, async (req, res) => {
      try {
        const q = String(req.query.q || '').slice(0, 200);
        const lang = req.query.lang === 'sw' ? 'sw' : req.query.lang === 'en' ? 'en' : null;
        const rows = q
          ? await search(q, { lang, limit: 10 })
          : await all(`SELECT id, title, body, lang, category, source, updated_at FROM kb_articles WHERE published = 1 ${lang ? 'AND lang = ?' : ''} ORDER BY category, title`, lang ? [lang] : []);
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json({ articles: rows.map(({ score, ...r }) => r) });
      } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to search articles' }); }
    });
    app.get('/api/kb/:id', publicLimiter, async (req, res) => {
      const row = await get('SELECT id, title, body, lang, category, tags, source, updated_at FROM kb_articles WHERE id = ? AND published = 1', [Number(req.params.id)]);
      if (!row) return res.status(404).json({ error: 'Article not found' });
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.json(row);
    });

    // Admin CRUD
    app.get('/api/admin/kb', requireAdmin, async (req, res) => {
      res.json(await all('SELECT * FROM kb_articles ORDER BY updated_at DESC'));
    });
    app.post('/api/admin/kb', requireAdmin, async (req, res) => {
      const v = validate(req.body, false);
      if (v.error) return res.status(400).json({ error: v.error });
      const a = v.value;
      const r = await run('INSERT INTO kb_articles (title, body, lang, category, tags, source, published) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [a.title, a.body, a.lang, a.category, a.tags, a.source, a.published]);
      res.status(201).json({ id: r.id, message: 'Article created' });
    });
    app.put('/api/admin/kb/:id', requireAdmin, async (req, res) => {
      const v = validate(req.body, true);
      if (v.error) return res.status(400).json({ error: v.error });
      const keys = Object.keys(v.value);
      if (!keys.length) return res.status(400).json({ error: 'Nothing to update' });
      const r = await run(`UPDATE kb_articles SET ${keys.map((k) => k + ' = ?').join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...keys.map((k) => v.value[k]), Number(req.params.id)]);
      if (!r.changes) return res.status(404).json({ error: 'Article not found' });
      res.json({ ok: true, message: 'Article updated' });
    });
    app.delete('/api/admin/kb/:id', requireAdmin, async (req, res) => {
      const r = await run('DELETE FROM kb_articles WHERE id = ?', [Number(req.params.id)]);
      if (!r.changes) return res.status(404).json({ error: 'Article not found' });
      res.json({ ok: true, message: 'Article deleted' });
    });
  }

  return { init, search, registerRoutes };
};
