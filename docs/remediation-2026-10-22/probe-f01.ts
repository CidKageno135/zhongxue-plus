import {
  createInitialState, toggleSavedWord, saveState, loadState, STORAGE_KEY,
} from '../../src/domain/learning.ts';

const data = new Map<string, string>();
const storage = {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => { data.set(key, value); },
};

for (const count of [500, 600, 1000]) {
  let state = createInitialState();
  for (let i = 0; i < count; i++) {
    const id = `cv_${i + 1}`;
    state = toggleSavedWord(state, id, {
      id,
      hanzi: '滷肉飯',
      pinyin: 'lu3 rou4 fan4',
      meaning: 'Cơm thịt kho Đài Loan',
      example: '滷肉飯（臺灣繁體詞彙）',
      examplePinyin: 'lu3 rou4 fan4',
      exampleMeaning: 'Cơm thịt kho Đài Loan',
      category: 'Từ điển mở rộng',
      lessonId: 'custom-dictionary',
    });
  }
  const saveError = saveState(state, storage);
  const savedJson = data.get(STORAGE_KEY) ?? '';
  const loaded = loadState(storage);
  console.log(JSON.stringify({
    count,
    before: state.savedWordIds.length,
    jsonLength: savedJson.length,
    saveError,
    after: loaded.state.savedWordIds.length,
    loadError: loaded.error
  }));
}
