import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import PromisePool from '@supercharge/promise-pool';
import { write } from 'bun';
import { load } from 'cheerio';
import { groupBy, keyBy, pick, uniqBy } from 'es-toolkit';
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

enum CommentType {
  NORMAL,
  STAGE,
  SKIN_STAGE,
}

type CommentItem =
  | { type: CommentType.NORMAL; text: string }
  | { type: CommentType.STAGE; stage: string }
  | { type: CommentType.SKIN_STAGE; name: string; stage: string };

type ExtractCommentItem<T extends CommentType> = Extract<CommentItem, { type: T }>;

const parseSingleComment = (comment: string): CommentItem => {
  let match: RegExpExecArray | null;
  if ((match = /战斗形象「第(\d+)阶段」/.exec(comment))) {
    return { type: CommentType.STAGE, stage: match[1] };
  }
  if ((match = /战斗形象「([^」]+?)(?:（第(.)再临）)?」.*灵衣/.exec(comment))) {
    let name = match[1];
    if (name.startsWith('简易灵衣：')) {
      name = name.slice(5);
    }
    return match[2]
      ? { type: CommentType.SKIN_STAGE, name, stage: match[2] }
      : { type: CommentType.NORMAL, text: `灵衣「${name}」` };
  }
  return { type: CommentType.NORMAL, text: comment.trim() };
};

const mergeCommentStage = (items: Array<{ stage: string }>) => items.map(c => c.stage).join('/');

const mergeComments = (comments: CommentItem[]) => {
  if (comments.length <= 1) return comments;
  const result: CommentItem[] = [];
  const typeGroup = groupBy(comments, c => c.type);
  let tmpArray: CommentItem[] = [];
  if ((tmpArray = typeGroup[CommentType.STAGE])?.length) {
    result.push({
      type: CommentType.STAGE,
      stage: mergeCommentStage(tmpArray as ExtractCommentItem<CommentType.STAGE>[]),
    });
  }
  if ((tmpArray = typeGroup[CommentType.SKIN_STAGE])?.length) {
    const nameGroup = groupBy(
      tmpArray as ExtractCommentItem<CommentType.SKIN_STAGE>[],
      c => c.name,
    );
    Object.entries(nameGroup).forEach(([name, items]) => {
      result.push({
        type: CommentType.SKIN_STAGE,
        name,
        stage: mergeCommentStage(items as ExtractCommentItem<CommentType.SKIN_STAGE>[]),
      });
    });
  }
  if ((tmpArray = typeGroup[CommentType.NORMAL])?.length) {
    result.push(...tmpArray);
  }
  return result;
};

const commentToString = (comment: CommentItem) => {
  switch (comment.type) {
    case CommentType.NORMAL:
      return comment.text;
    case CommentType.STAGE:
      return `战斗形象${comment.stage}`;
    case CommentType.SKIN_STAGE:
      return `灵衣「${comment.name}（第${comment.stage}再临）」`;
  }
};

enum CommentCondition {
  ANY,
  ALL_NOT,
}

const getCommentCondition = (text: string) => {
  if (text.includes('(满足任一条件)：')) return CommentCondition.ANY;
  if (text.includes('(不满足所有条件)：')) return CommentCondition.ALL_NOT;
  throw new Error(`unknown comment condition: ${text}`);
};

const commentsToString = (comments: CommentItem[], condition: CommentCondition) => {
  switch (condition) {
    case CommentCondition.ANY:
      return comments.map(commentToString).join('、');
    case CommentCondition.ALL_NOT:
      return comments.map(comment => `非${commentToString(comment)}`).join('、');
  }
};

const parseComment = (text: string) => {
  const commentPart = text.slice(text.indexOf('：') + 1);
  if (!commentPart) return;
  const comments = mergeComments(commentPart.split('、').map(parseSingleComment));
  const condition = getCommentCondition(text);
  return commentsToString(comments, condition);
};

const fetchData = async (url: string) => {
  console.log('fetching:', url);
  const html = await (await fetch(url)).text();
  const $ = load(html);
  const $panel = $('.tabber__panel[id^="tabber-持有该"]').first();
  const $row = $panel.find('tbody tr:not([class])');
  const $comment = $panel.find('tr.mw-collapsible li');

  const commentMap: Record<number, string | undefined> = {};
  $comment.each((i, el) => {
    const $li = $(el);
    const text = $li.text().replaceAll('\n', '');
    const comment = parseComment(text);
    if (!comment) return;
    const $name = $li.find('a').first();
    const nameLink = $name.text();
    const id = charMapByNameLink[nameLink]?.id;
    if (id) commentMap[id] = comment;
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
  ['特性：混沌且七骑士'],
];

const dataList = await Promise.all(
  typeList.map(async (types, i) => {
    const resultList = await Promise.all(
      types.map(type =>
        fetchData(`https://fgo.wiki/w/${encodeURIComponent(type)}`).catch(e => {
          console.error(`fetch ${type} failed`);
          console.error(e);
          throw e;
        }),
      ),
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
