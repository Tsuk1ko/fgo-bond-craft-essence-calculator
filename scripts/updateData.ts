import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import PromisePool from '@supercharge/promise-pool';
import { write } from 'bun';
import { load } from 'cheerio';
import { keyBy, pick, uniqBy } from 'es-toolkit';
import { tinyPNG } from './utils/tinypng';

const fetchCharacterListData = async () => {
  console.log('fetching character data');
  const html = await (
    await fetch('https://fgo.wiki/w/%E8%8B%B1%E7%81%B5%E5%9B%BE%E9%89%B4')
  ).text();
  const rawData = /var raw_str = "(.+?)";/.exec(html)![1].split('\\n');
  rawData.shift();
  const overrideData: Record<number, Record<string, string>> = Object.fromEntries(
    /override_data = "(.+?)";/
      .exec(html)![1]
      .split('\\n\\n')
      .map(data => {
        const obj = Object.fromEntries(data.split('\\n').map(line => line.split('=')));
        return [obj.id, obj];
      }),
  );
  return rawData.map(line => {
    const [id, star] = line.split(',').slice(0, 2).map(Number);
    const extend = overrideData[id];
    return { id, star, name: extend.name_cn, nameLink: extend.name_link };
  });
};

const characterList = await fetchCharacterListData();
const charMapById = keyBy(characterList, v => v.id);
const charMapByNameLink = keyBy(characterList, v => v.nameLink);

const fetchData = async (url: string) => {
  console.log('fetching:', url);
  const html = await (await fetch(url)).text();
  const $ = load(html);
  const $row = $('.tabber__panel[id^="tabber-持有该"]').first().find('tbody tr:not(.nodesktop)');
  const $comment = $('#mw-content-text ul:contains(仅有):contains(持有) li');

  const commentMap: Record<number, string | undefined> = {};
  $comment.each((i, el) => {
    const $li = $(el);
    const text = $li.text();
    const startI = text.indexOf('仅有') + 2;
    const endI = text.indexOf('持有');
    const comment = text.slice(startI, endI);
    if (!comment) return;
    $li.find('a').each((i, el) => {
      const $a = $(el);
      const nameLink = $a.text();
      const id = charMapByNameLink[nameLink]?.id;
      if (id) commentMap[id] = comment;
    });
  });

  const classImgMap: Record<string, string> = {};
  const servantList: Array<{
    id: number;
    cls: string;
    imgName: string;
    imgUrl: string;
    typeComment?: string;
  }> = [];

  $row.each((i, el) => {
    const $tr = $(el);

    const $classImg = $tr.find('th img');
    const className = $classImg.parent().attr('title')!;
    if (!className.match(/^\w+$/)) return;
    const classImg = $classImg.attr('src')!;
    classImgMap[className] = classImg;

    $tr.find('td img').each((i, el) => {
      const $img = $(el);
      const imgUrl = $img.attr('src')!;
      const idStr = /\d+/.exec($img.parent().attr('title')!)![0];
      const id = parseInt(idStr);
      const imgName = `Servant${idStr}.jpg`;
      servantList.push({ id, cls: className, imgName, imgUrl, typeComment: commentMap[id] });
    });
  });

  return { classImgMap, servantList };
};

const typeList = [
  ['特性：兽科'],
  ['特性：活在当下的人类'],
  ['属性：秩序·善'],
  ['特性：持有灵衣之人'],
  ['特性：秩序的女性'],
  ['副属性：星', '属性：恶'],
];

const dataList = await Promise.all(
  typeList.map(async (types, i) => {
    const resultList = await Promise.all(
      types.map(type => fetchData(`https://fgo.wiki/w/${encodeURIComponent(type)}`)),
    );
    return {
      type: i,
      classImgMap: Object.assign({}, ...resultList.map(data => data.classImgMap)),
      servantList: uniqBy(
        resultList.flatMap(data => data.servantList),
        s => s.id,
      ),
    };
  }),
);

const classImgMap: Record<string, string> = Object.assign(
  {},
  ...dataList.map(data => data.classImgMap),
);
const servantList = uniqBy(
  dataList.flatMap(data => data.servantList),
  s => s.id,
);

const assetsDir = resolve(import.meta.dir, '../public/assets');
const classImgDir = resolve(assetsDir, 'class');
const servantImgDir = resolve(assetsDir, 'servant');
const dataJsonPath = resolve(import.meta.dir, '../src/assets/data.json');

const imageTasks: Array<{ dist: string; url: string }> = [];

for (const [name, url] of Object.entries(classImgMap)) {
  const filePath = resolve(classImgDir, `${name}.png`);
  if (existsSync(filePath)) continue;
  imageTasks.push({ dist: filePath, url });
}

for (const { imgName, imgUrl } of servantList) {
  const filePath = resolve(servantImgDir, imgName);
  if (existsSync(filePath)) continue;
  imageTasks.push({ dist: filePath, url: imgUrl });
}

await PromisePool.withConcurrency(8)
  .for(imageTasks)
  .handleError(error => {
    throw error;
  })
  .process(async ({ dist, url }) => {
    console.log('downloading image:', url);
    const buffer = await (await fetch(url)).arrayBuffer();
    await write(dist, await tinyPNG(buffer));
  });

const servantMap: Record<
  number,
  {
    id: number;
    class: string;
    star: number;
    name: string;
    types: number[];
    typeComments?: Record<number, string>;
  }
> = Object.fromEntries(
  servantList.map(s => {
    const charData = charMapById[s.id];
    return [
      s.id,
      {
        id: s.id,
        class: s.cls === 'UnBeast' ? 'Beast' : s.cls,
        ...pick(charData, ['star', 'name', 'nameLink']),
        types: [],
      },
    ];
  }),
);

dataList.forEach(({ type, servantList }) => {
  servantList.forEach(({ id, typeComment }) => {
    const servant = servantMap[id];
    servant.types.push(type);
    if (typeComment) {
      if (!servant.typeComments) servant.typeComments = {};
      servant.typeComments[type] = typeComment;
    }
  });
});

const dataJson = {
  typeList: typeList.map(types => types.map(t => t.replace(/^.*：/, '')).join(' | ')),
  servantList: Object.values(servantMap).sort((a, b) => a.id - b.id),
};

await write(dataJsonPath, JSON.stringify(dataJson, null, 2));
