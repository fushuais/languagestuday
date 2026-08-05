const KEY = 'nihongo-profile-v1'

export const DEFAULT_PROFILE = {
  name: '付帅帅',
  nameKana: 'フ・スイスイ',
  age: '27',
  hometown: '中国の遼寧省大連市',
  home: '埼玉県の寮',
  parttime: '新聞配達',
  attendance: '90',
  livingCost: '10',
  monthlySalary: '13万～15',
  jlptLevel: 'N3',
  jlptGoal: 'N2',
  siblings: '姉',
  fatherJob: '会社員',
  motherJob: '会社員',
}

export const PROFILE_FIELDS = [
  { key: 'name', label: '姓名（汉字）', placeholder: '付帅帅' },
  { key: 'nameKana', label: '姓名（片假名）', placeholder: 'フ・スイスイ' },
  { key: 'age', label: '年龄', placeholder: '27' },
  { key: 'hometown', label: '出身地', placeholder: '中国の遼寧省大連市' },
  { key: 'home', label: '现在住所', placeholder: '埼玉県の寮' },
  { key: 'parttime', label: '打工内容', placeholder: '新聞配達' },
  { key: 'attendance', label: '出勤率（%）', placeholder: '90' },
  { key: 'livingCost', label: '每月生活费（万円）', placeholder: '10' },
  { key: 'monthlySalary', label: '每月收入（万円）', placeholder: '13万～15' },
  { key: 'jlptLevel', label: '已报考 JLPT', placeholder: 'N3' },
  { key: 'jlptGoal', label: '目标 JLPT', placeholder: 'N2' },
  { key: 'siblings', label: '兄弟姐妹', placeholder: '姉' },
  { key: 'fatherJob', label: '父亲职业', placeholder: '会社員' },
  { key: 'motherJob', label: '母亲职业', placeholder: '会社員' },
]

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY)
    const saved = raw ? JSON.parse(raw) : {}
    return { ...DEFAULT_PROFILE, ...saved }
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    // ignore
  }
}
