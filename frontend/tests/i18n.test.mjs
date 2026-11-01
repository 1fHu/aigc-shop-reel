import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load the real TypeScript modules without adding a test-runner dependency.
function sourceLoader(storage) {
  const cache = new Map();
  return function load(relative) {
    const filename = path.resolve(root, relative.endsWith('.ts') ? relative : `${relative}.ts`);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const javascript = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (specifier) => specifier.startsWith('.')
      ? load(path.resolve(path.dirname(filename), specifier))
      : require(specifier);
    const execute = new Function('require', 'module', 'exports', 'localStorage', javascript);
    execute(localRequire, module, module.exports, storage);
    return module.exports;
  };
}

const load = sourceLoader();
const english = load('src/i18n/locales/en-US').default;
const chinese = load('src/i18n/locales/zh-CN').default;
const { translateText } = load('src/i18n/translate');
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test('both dictionaries cover the same interface and interpolation variables', () => {
  assert.deepEqual(Object.keys(english).sort(), Object.keys(chinese).sort());
  assert.ok(Object.keys(english).length > 900);
  for (const source of Object.keys(english)) {
    assert.ok(english[source].trim(), source);
    assert.ok(chinese[source].trim(), source);
    assert.doesNotMatch(english[source], /[\u3400-\u9fff]/u, source);
    assert.deepEqual(placeholders(english[source]), placeholders(source), source);
    assert.deepEqual(placeholders(chinese[source]), placeholders(source), source);
  }
});

test('source and existing rendered errors can switch in both directions', () => {
  assert.equal(translateText('请输入项目名称', 'en-US'), 'Enter a project name');
  assert.equal(translateText('Enter a project name', 'zh-CN'), '请输入项目名称');
  assert.equal(translateText('Dashboard', 'zh-CN'), '工作台');
  assert.equal(translateText('项目已创建', 'en-US'), 'Project created');
});

test('interpolated confirmations preserve user content and punctuation across switches', () => {
  const name = 'My 中文 Shop $& (test)';
  const source = `确定要删除项目「${name}」吗？删除后不可恢复。`;
  const result = translateText(source, 'en-US');
  assert.equal(result, `Delete project “${name}”? This cannot be undone.`);
  assert.equal(translateText(result, 'zh-CN'), source);
  assert.equal(translateText('{0} 个分镜已提交重新生成，完成后将在编辑器中预览', 'en-US', { 0: 0 }),
    'Submitted 0 shots for regeneration. Preview them in the editor when ready.');
});

test('unknown and user-authored content is preserved', () => {
  const input = '我的商品 My product {unknown} $&';
  assert.equal(translateText(input, 'en-US'), input);
  assert.equal(translateText(input, 'zh-CN'), input);
  assert.equal(translateText('toString', 'en-US'), 'toString');
});

test('language defaults to English and restores only a valid saved choice', () => {
  assert.equal(sourceLoader().call(null, 'src/stores/languageStore').useLanguageStore.getState().language, 'en-US');
  for (const [saved, expected] of [['zh-CN', 'zh-CN'], ['en-US', 'en-US'], ['invalid', 'en-US'], [null, 'en-US']]) {
    const store = sourceLoader({ getItem: () => saved, setItem() {} })('src/stores/languageStore').useLanguageStore;
    assert.equal(store.getState().language, expected);
  }
});

test('language is remembered; blocked storage does not prevent switching', () => {
  const saved = new Map();
  const store = sourceLoader({ getItem: (key) => saved.get(key), setItem: (key, value) => saved.set(key, value) })('src/stores/languageStore').useLanguageStore;
  store.getState().setLanguage('zh-CN');
  assert.equal(saved.get('vidcraft_language'), 'zh-CN');
  store.getState().setLanguage('en-US');
  assert.equal(saved.get('vidcraft_language'), 'en-US');
  const blocked = sourceLoader({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } })('src/stores/languageStore').useLanguageStore;
  blocked.getState().setLanguage('zh-CN');
  assert.equal(blocked.getState().language, 'zh-CN');
});

test('only unmodified fields of known demo items are translated', () => {
  const demoLoad = sourceLoader();
  const { demoText } = demoLoad('src/i18n/demoContent');
  const store = demoLoad('src/stores/languageStore').useLanguageStore;
  const name = '电影级美妆产品展示';
  assert.equal(demoText('ref-video-001', name), 'Cinematic beauty product showcase');
  assert.equal(demoText('user-video', name), name);
  assert.equal(demoText('ref-video-001', 'My custom title'), 'My custom title');
  store.getState().setLanguage('zh-CN');
  assert.equal(demoText('ref-video-001', name), name);
});

function objectLiteral(filename, name) {
  const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let result;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name && ts.isObjectLiteralExpression(node.initializer)) {
      result = Object.fromEntries(node.initializer.properties.map((property) => {
        assert.ok(ts.isPropertyAssignment(property) && ts.isStringLiteral(property.initializer), `${name} must retain literal backend values`);
        return [property.name.getText(source), property.initializer.text];
      }));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(result, name);
  return result;
}

test('default factor values still belong to the backend factor vocabulary', () => {
  const defaults = objectLiteral(path.join(root, 'src/pages/ScriptStudio/index.tsx'), 'DEFAULT_FACTOR_STATE');
  const backend = path.resolve(root, '../backend/src/modules/gene-bank/types/creative-factors.type.ts');
  const groups = { visual_style: 'VisualStyleLabels', opener: 'OpeningMethodLabels', narration: 'NarrationStyleLabels', pacing: 'PaceDensityLabels', cta: 'CTAFormLabels' };
  for (const [key, group] of Object.entries(groups)) {
    assert.ok(Object.values(objectLiteral(backend, group)).includes(defaults[key]), `${key}: ${defaults[key]}`);
  }
});

test('every backend and mock factor option has an English display label', () => {
  const backend = path.resolve(root, '../backend/src/modules/gene-bank/types/creative-factors.type.ts');
  for (const group of ['VisualStyleLabels', 'OpeningMethodLabels', 'NarrationStyleLabels', 'PaceDensityLabels', 'CTAFormLabels']) {
    for (const label of Object.values(objectLiteral(backend, group))) {
      assert.doesNotMatch(translateText(label, 'en-US'), /[\u3400-\u9fff]/u, label);
    }
  }
  const filename = path.join(root, 'src/mocks/handlers/scripts.ts');
  const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  let count = 0;
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'options' && ts.isArrayLiteralExpression(node.initializer)) {
      for (const option of node.initializer.elements) {
        if (!ts.isStringLiteral(option)) continue;
        assert.doesNotMatch(translateText(option.text, 'en-US'), /[\u3400-\u9fff]/u, option.text);
        count++;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(count > 15);
});

test('the live backend default guest name switches without changing the account record', () => {
  const guestLoad = sourceLoader();
  const { userDisplayName } = guestLoad('src/i18n/userDisplayName');
  const store = guestLoad('src/stores/languageStore').useLanguageStore;
  const guest = Object.freeze({ nickname: '体验用户', is_guest: true });
  assert.equal(userDisplayName(guest), 'Guest');
  store.getState().setLanguage('zh-CN');
  assert.equal(userDisplayName(guest), '体验用户');
  store.getState().setLanguage('en-US');
  assert.equal(userDisplayName(guest), 'Guest');
  assert.equal(guest.nickname, '体验用户');
});

test('real and custom nicknames remain unchanged even when they match interface copy', () => {
  const guestLoad = sourceLoader();
  const { userDisplayName } = guestLoad('src/i18n/userDisplayName');
  const store = guestLoad('src/stores/languageStore').useLanguageStore;
  for (const language of ['en-US', 'zh-CN']) {
    store.getState().setLanguage(language);
    assert.equal(userDisplayName({ nickname: '体验用户', is_guest: false }), '体验用户');
    assert.equal(userDisplayName({ nickname: '我的自定义昵称', is_guest: true }), '我的自定义昵称');
    assert.equal(userDisplayName({ nickname: 'Dashboard', is_guest: false }), 'Dashboard');
    assert.equal(userDisplayName(null), 'VidCrafter');
  }
});
