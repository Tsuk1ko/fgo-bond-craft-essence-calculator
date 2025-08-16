import { write } from 'bun';
import { load } from 'cheerio';
import { keyBy, uniqBy } from 'es-toolkit';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import PromisePool from '@supercharge/promise-pool';
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

const fetchData = async (type: number, url: string) => {
  console.log('fetching:', url);
  const $ = load(await (await fetch(url)).text());
  const $row = $('.tabber__panel[data-title^="持有该"]').first().find('tbody tr:not(.nodesktop)');
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
    const classImg = $classImg.attr('data-src')!;
    classImgMap[className] = classImg;

    $tr.find('td img').each((i, el) => {
      const $img = $(el);
      const imgName = $img.attr('alt')!;
      const imgUrl = $img.attr('data-src')!;
      const id = parseInt(/\d+/.exec(imgName)![0]);
      servantList.push({ id, cls: className, imgName, imgUrl, typeComment: commentMap[id] });
    });
  });

  return { type, classImgMap, servantList };
};

const typeList = [
  '特性：兽科',
  '特性：活在当下的人类',
  '属性：秩序·善',
  '特性：持有灵衣之人',
  '特性：秩序的女性',
];

const typeToIndex = Object.fromEntries(typeList.map((t, i) => [t, i]));

const dataList = await Promise.all(
  typeList.map((type, i) => fetchData(i, `https://fgo.wiki/w/${encodeURIComponent(type)}`)),
);

const classImgMap: Record<string, string> = Object.assign(
  {},
  ...dataList.map(data => data.classImgMap),
);
const servantList = uniqBy(
  dataList.flatMap(data => data.servantList),
  s => s.imgName,
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
        class: s.cls,
        star: charData.star,
        name: charData.name,
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

// 补充所长
{
  const types = [
    typeToIndex['特性：活在当下的人类'],
    typeToIndex['属性：秩序·善'],
    typeToIndex['特性：秩序的女性'],
  ].sort((a, b) => a - b);
  servantMap[444] = {
    id: 444,
    class: 'Beast',
    star: 5,
    name: 'U－奥尔加玛丽',
    types,
    typeComments: Object.fromEntries(types.map(t => [t, '战斗形象3'])),
  };
}

const dataJson = {
  typeList,
  servantList: Object.values(servantMap).sort((a, b) => a.id - b.id),
};

await write(dataJsonPath, JSON.stringify(dataJson, null, 2));
