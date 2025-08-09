import { write } from 'bun';
import { load } from 'cheerio';
import { uniqBy } from 'es-toolkit';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import PromisePool from '@supercharge/promise-pool';
import { tinyPNG } from './utils/tinypng';

const fetchStarData = async (): Promise<Record<number, number>> => {
  const html = await (
    await fetch('https://fgo.wiki/w/%E8%8B%B1%E7%81%B5%E5%9B%BE%E9%89%B4')
  ).text();
  const table = /var raw_str = "([^"]+)"/.exec(html)![1].split('\\n');
  table.shift();
  return Object.fromEntries(table.map(line => line.split(',').slice(0, 2).map(Number)));
};

const fetchData = async (type: number, url: string) => {
  const $ = load(await (await fetch(url)).text());
  const $row = $('.tabber__panel[data-title^="持有该"]').first().find('tbody tr:not(.nodesktop)');

  const classImgMap: Record<string, string> = {};
  const servantList: Array<{ cls: string; imgName: string; imgUrl: string }> = [];

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
      servantList.push({ cls: className, imgName, imgUrl });
    });
  });

  return { type, classImgMap, servantList };
};

const starMap = await fetchStarData();

const typeList = [
  '特性：兽科',
  '特性：活在当下的人类',
  '属性：秩序·善',
  '特性：持有灵衣之人',
  '特性：秩序的女性',
];

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
  string,
  { id: number; class: string; star: number; name: string; types: number[] }
> = Object.fromEntries(
  servantList.map(s => {
    const id = parseInt(/\d+/.exec(s.imgName)![0]);
    return [
      s.imgName,
      {
        id,
        star: starMap[id] ?? 0,
        class: s.cls,
        name: s.imgName,
        types: [],
      },
    ];
  }),
);

dataList.forEach(({ type, servantList }) => {
  servantList.forEach(({ imgName }) => {
    servantMap[imgName].types.push(type);
  });
});

const dataJson = {
  typeList,
  servantList: Object.values(servantMap),
};

await write(dataJsonPath, JSON.stringify(dataJson, null, 2));
