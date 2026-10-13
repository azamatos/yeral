/**
 * Mock catalogue: salons, services, staff and reviews for Ashgabat.
 * Deterministic (seeded RNG) so the server render and the browser agree.
 * «Ножницы» (s1) keeps the prototype's data so both apps tell the same story.
 */
import type { CategoryId, Review, Rules, Salon, Service, Staff, WeekHours } from '@/domain/types'
import { addDays, today } from '@/domain/time'
import { DISTRICTS } from '@/domain/places'
import { photosFor } from './photos'

export function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const H = (o: number, c: number) => ({ open: o * 60, close: c * 60 })
const STD: WeekHours = [H(10, 21), H(10, 21), H(10, 21), H(10, 21), H(10, 21), H(11, 20), null]
const DAILY_9_20: WeekHours = Array(7).fill(H(9, 20))
const LATE: WeekHours = [H(10, 22), H(10, 22), H(10, 22), H(10, 22), H(10, 22), H(10, 22), H(12, 20)]
const SPA: WeekHours = [H(10, 21), H(10, 21), H(10, 21), H(10, 21), H(10, 22), H(10, 22), H(11, 19)]

export { DISTRICTS }

const DISTRICT_GEO: Record<string, [number, number]> = {
  center: [37.9445, 58.3835],
  kopetdag: [37.9265, 58.3742],
  bagtyyarlyk: [37.9652, 58.3318],
  berzengi: [37.9052, 58.3595],
  parahat: [37.9405, 58.4215],
  mir: [37.9548, 58.4102],
  choganly: [37.9895, 58.3505],
  archabil: [37.8912, 58.3305],
}

export const CATEGORY_IDS: CategoryId[] = ['barber', 'hair', 'nails', 'brows', 'massage', 'cosmetology', 'makeup']

const BASE_RULES: Rules = { online: true, manual: false, minLead: 60, windowDays: 30, buffer: 15, cancelHours: 2, askReason: true, blockAfter2: true }

type SalonDef = Omit<Salon, 'geo' | 'photos' | 'rules' | 'city' | 'exceptions' | 'amenities' | 'since'> & {
  rules?: Partial<Rules>
  amenities?: string[]
  since?: string
  exceptions?: Salon['exceptions']
  priceLevel?: number
  /** staff: [name, full, gender, categories] */
  team: [string, string, 'm' | 'f', CategoryId[]][]
}

const DEFS: SalonDef[] = [
  {
    id: 's1', slug: 'nozhnitsy', name: 'Ножницы', kind: 'Барбершоп', categories: ['barber'], districtId: 'kopetdag', address: 'Гёроглы 44',
    entrance: 'второй подъезд со двора, домофон 12', rating: 4.9, reviewsBase: 205, phone: '+993 12 35 04 04', instagram: 'nozhnitsy.tm',
    about: 'Барбершоп на четыре кресла. Работаем с 2019 года, стрижём мужчин и детей, кофе за счёт заведения.', hours: STD,
    exceptions: [
      { id: 'e1', name: 'Новый год', from: '2027-01-01', to: '2027-01-02', yearly: true },
      { id: 'e3', name: 'Новруз', from: '2027-03-21', to: '2027-03-22', yearly: true },
    ],
    rules: { manual: true }, demo: 'manual', amenities: ['wifi', 'coffee', 'card', 'kids'], since: '2026-03-01',
    team: [['Мырат', 'Мырат Атаев', 'm', ['barber']], ['Бегенч', 'Бегенч Оразов', 'm', ['barber']], ['Айна', 'Айна Мамедова', 'f', ['barber']], ['Сердар', 'Сердар Курбанов', 'm', ['barber']]],
  },
  {
    id: 's2', slug: 'barber-loft', name: 'Barber Loft', kind: 'Барбершоп', categories: ['barber'], districtId: 'bagtyyarlyk', address: 'Махтумкули 12',
    entrance: 'вход с торца, второй этаж', rating: 4.7, reviewsBase: 86, phone: '+993 12 22 18 18', instagram: 'barberloft.ashgabat',
    about: 'Лофт с тремя креслами и игровой приставкой. Классика и фейды, бритьё горячим полотенцем.', hours: LATE, demo: 'auto',
    amenities: ['wifi', 'coffee', 'parking'], priceLevel: 0.95,
    team: [['Азат', 'Азат Байрамов', 'm', ['barber']], ['Керим', 'Керим Сапаров', 'm', ['barber']], ['Довран', 'Довран Ягмуров', 'm', ['barber']]],
  },
  {
    id: 's3', slug: 'biryuza', name: 'Бирюза', kind: 'Ногтевая студия', categories: ['nails'], districtId: 'berzengi', address: 'Арчабиль 18',
    entrance: 'ТЦ «Берзенги», первый этаж', rating: 4.8, reviewsBase: 132, phone: '+993 12 48 77 10', instagram: 'biryuza.nails',
    about: 'Маникюр, педикюр и наращивание. Стерилизация по стандарту, одноразовые пилки.', hours: DAILY_9_20, demo: 'auto',
    rules: { manual: true }, amenities: ['wifi', 'tea', 'card', 'women'],
    team: [['Огулджан', 'Огулджан Мурадова', 'f', ['nails']], ['Майса', 'Майса Овезова', 'f', ['nails']], ['Энеш', 'Энеш Аманова', 'f', ['nails']]],
  },
  {
    id: 's4', slug: 'glow-beauty', name: 'Glow Beauty', kind: 'Салон красоты', categories: ['hair', 'makeup', 'massage'], districtId: 'mir', address: 'Андалиб 63',
    entrance: 'парковка перед входом', rating: 4.8, reviewsBase: 59, phone: '+993 12 61 30 30', instagram: 'glow.beauty.tm',
    about: 'Женские стрижки, окрашивание, макияж и массаж. Работаем на профессиональной косметике.', hours: STD, demo: 'auto',
    amenities: ['wifi', 'coffee', 'parking', 'card'], priceLevel: 1.1,
    team: [['Лейли', 'Лейли Ахмедова', 'f', ['hair', 'makeup']], ['Аннагуль', 'Аннагуль Реджепова', 'f', ['massage']], ['Гульшат', 'Гульшат Нурыева', 'f', ['hair']]],
  },
  {
    id: 's5', slug: 'chop', name: 'Chop Ashgabat', kind: 'Барбершоп', categories: ['barber'], districtId: 'parahat', address: 'Парахат 7/1',
    entrance: '', rating: 4.6, reviewsBase: 41, phone: '+993 12 90 44 00',
    about: 'Барбершоп у рынка Парахат. Быстрые стрижки машинкой и классика.', hours: STD, demo: 'auto',
    rules: { online: false }, amenities: ['parking'], priceLevel: 0.8,
    team: [['Мерген', 'Мерген Дурдыев', 'm', ['barber']]],
  },
  {
    id: 's6', slug: 'gentleman', name: 'Gentleman', kind: 'Барбершоп', categories: ['barber'], districtId: 'center', address: 'пр. Битарап Туркменистан 112',
    entrance: 'вход со стороны парка', rating: 4.9, reviewsBase: 174, phone: '+993 12 27 55 88', instagram: 'gentleman.tm',
    about: 'Классический мужской клуб: стрижка, бритьё опасной бритвой и чашка хорошего кофе. Без спешки.', hours: LATE, demo: 'auto',
    amenities: ['wifi', 'coffee', 'card', 'parking'], priceLevel: 1.25, since: addDays(today(), -12),
    team: [['Ровшен', 'Ровшен Байрамов', 'm', ['barber']], ['Максат', 'Максат Нурыев', 'm', ['barber']], ['Шатлык', 'Шатлык Мамедов', 'm', ['barber']], ['Аман', 'Аман Чарыев', 'm', ['barber']]],
  },
  {
    id: 's7', slug: 'ussa', name: 'Ussa Barber', kind: 'Барбершоп', categories: ['barber'], districtId: 'berzengi', address: 'ул. Анкара 21',
    entrance: 'первый этаж жилого дома', rating: 4.7, reviewsBase: 63, phone: '+993 12 46 10 10',
    about: 'Районный барбершоп: стрижём пап и детей, по субботам — очередь, лучше записаться.', hours: STD, demo: 'auto',
    amenities: ['kids', 'card'], priceLevel: 0.85,
    team: [['Батыр', 'Батыр Гельдыев', 'm', ['barber']], ['Мекан', 'Мекан Розыев', 'm', ['barber']]],
  },
  {
    id: 's8', slug: 'gozellik', name: 'Gözellik Studio', kind: 'Салон красоты', categories: ['hair', 'nails', 'brows'], districtId: 'berzengi', address: 'ул. Ататюрка 54',
    entrance: 'второй этаж, лифт', rating: 4.8, reviewsBase: 148, phone: '+993 12 44 82 82', instagram: 'gozellik.studio',
    about: 'Салон полного цикла для женщин: стрижки и окрашивание, маникюр, брови. Мастера с опытом от пяти лет.', hours: DAILY_9_20, demo: 'auto',
    rules: { manual: true }, amenities: ['wifi', 'tea', 'card', 'women'], priceLevel: 1.05,
    team: [['Сельби', 'Сельби Ходжаева', 'f', ['hair']], ['Мяхри', 'Мяхри Аннаева', 'f', ['hair']], ['Акгыз', 'Акгыз Мырадова', 'f', ['nails']], ['Арзув', 'Арзув Бердыева', 'f', ['brows']]],
  },
  {
    id: 's9', slug: 'lale', name: 'Lale Beauty', kind: 'Салон красоты', categories: ['hair', 'brows', 'makeup'], districtId: 'center', address: 'ул. Магтымгулы 77',
    entrance: 'вход с улицы, вывеска «Lale»', rating: 4.9, reviewsBase: 96, phone: '+993 12 39 70 70', instagram: 'lale.beauty',
    about: 'Свадебные и вечерние образы, окрашивание сложных оттенков, брови и ресницы.', hours: STD, demo: 'auto',
    amenities: ['wifi', 'coffee', 'card', 'women'], priceLevel: 1.2, since: addDays(today(), -20),
    team: [['Дженнет', 'Дженнет Атаева', 'f', ['hair', 'makeup']], ['Огулгерек', 'Огулгерек Аширова', 'f', ['brows']], ['Тылла', 'Тылла Мамедова', 'f', ['hair']]],
  },
  {
    id: 's10', slug: 'ak-gul', name: 'Ak Gül', kind: 'Салон красоты', categories: ['hair', 'nails'], districtId: 'choganly', address: 'Чоганлы, дом 18',
    entrance: 'цокольный этаж', rating: 4.6, reviewsBase: 38, phone: '+993 12 58 30 31',
    about: 'Уютный салон рядом с домом: стрижки, укладки, маникюр. Цены без сюрпризов.', hours: STD, demo: 'auto',
    amenities: ['tea', 'kids'], priceLevel: 0.8,
    team: [['Нязик', 'Нязик Овезова', 'f', ['hair']], ['Мая', 'Мая Чарыева', 'f', ['nails']]],
  },
  {
    id: 's11', slug: 'altyn-sac', name: 'Altyn Saç', kind: 'Парикмахерская', categories: ['hair'], districtId: 'bagtyyarlyk', address: 'ул. Гарашсызлык 9',
    entrance: 'вход со двора', rating: 4.7, reviewsBase: 71, phone: '+993 12 34 12 12', instagram: 'altynsac',
    about: 'Окрашивание и уход за волосами. Блонд, сложные техники, кератин и ботокс.', hours: STD, demo: 'auto',
    rules: { manual: true }, amenities: ['wifi', 'coffee', 'card'], priceLevel: 1.1,
    team: [['Гозель', 'Гозель Нурмурадова', 'f', ['hair']], ['Ширин', 'Ширин Ягмурова', 'f', ['hair']], ['Бахар', 'Бахар Тачмурадова', 'f', ['hair']]],
  },
  {
    id: 's12', slug: 'nail-lab', name: 'Nail Lab', kind: 'Ногтевая студия', categories: ['nails'], districtId: 'center', address: 'ТЦ «Беркарар», 2 этаж',
    entrance: 'второй этаж, рядом с фуд-кортом', rating: 4.9, reviewsBase: 210, phone: '+993 12 75 75 01', instagram: 'naillab.tm',
    about: 'Шесть мест маникюра и два педикюрных кресла. Работаем быстро, без потери качества.', hours: Array(7).fill(H(10, 22)), demo: 'auto',
    amenities: ['wifi', 'card', 'parking', 'women'], priceLevel: 1.15,
    team: [['Дерья', 'Дерья Аманова', 'f', ['nails']], ['Лейли', 'Лейли Курбанова', 'f', ['nails']], ['Сульгун', 'Сульгун Халлыева', 'f', ['nails']], ['Огулнабат', 'Огулнабат Розыева', 'f', ['nails']]],
  },
  {
    id: 's13', slug: 'pudra', name: 'Pudra Nails', kind: 'Ногтевая студия', categories: ['nails', 'brows'], districtId: 'mir', address: 'ул. Андалиба 40',
    entrance: 'отдельный вход, крыльцо', rating: 4.7, reviewsBase: 54, phone: '+993 12 62 14 14', instagram: 'pudra.nails',
    about: 'Нежный маникюр, педикюр и брови в одной студии. Только одноразовые инструменты.', hours: STD, demo: 'auto',
    amenities: ['tea', 'card', 'women'], priceLevel: 0.95, since: addDays(today(), -6),
    team: [['Гульшат', 'Гульшат Аннаева', 'f', ['nails']], ['Акгыз', 'Акгыз Байрамова', 'f', ['nails', 'brows']]],
  },
  {
    id: 's14', slug: 'yyldyz-nails', name: 'Ýyldyz Nails', kind: 'Ногтевая студия', categories: ['nails'], districtId: 'parahat', address: 'Парахат 2, дом 5',
    entrance: '', rating: 4.5, reviewsBase: 22, phone: '+993 12 91 20 20',
    about: 'Маникюр и педикюр недалеко от рынка. Принимаем с утра до вечера без выходных.', hours: DAILY_9_20, demo: 'auto',
    amenities: ['women'], priceLevel: 0.75,
    team: [['Арзув', 'Арзув Гельдыева', 'f', ['nails']], ['Энеш', 'Энеш Мурадова', 'f', ['nails']]],
  },
  {
    id: 's15', slug: 'brow-bar', name: 'Brow Bar', kind: 'Брови и ресницы', categories: ['brows'], districtId: 'center', address: 'ул. Туркменбаши 36',
    entrance: 'вход через арку', rating: 4.9, reviewsBase: 118, phone: '+993 12 39 11 11', instagram: 'browbar.ashgabat',
    about: 'Брови и ресницы — и больше ничего. Архитектура бровей, ламинирование, наращивание.', hours: STD, demo: 'auto',
    amenities: ['wifi', 'coffee', 'card', 'women'], priceLevel: 1.1,
    team: [['Мерджен', 'Мерджен Атаева', 'f', ['brows']], ['Сельби', 'Сельби Курбанова', 'f', ['brows']]],
  },
  {
    id: 's16', slug: 'merjen-lash', name: 'Merjen Lash', kind: 'Брови и ресницы', categories: ['brows'], districtId: 'kopetdag', address: 'ул. Кемине 152',
    entrance: 'домофон 5', rating: 4.8, reviewsBase: 47, phone: '+993 12 36 05 05',
    about: 'Наращивание и ламинирование ресниц в спокойной обстановке. Гипоаллергенные материалы.', hours: STD, demo: 'auto',
    rules: { manual: true }, amenities: ['tea', 'women'],
    team: [['Мерджен', 'Мерджен Ораздурдыева', 'f', ['brows']]],
  },
  {
    id: 's17', slug: 'arzuw-spa', name: 'Arzuw Spa', kind: 'SPA и массаж', categories: ['massage', 'cosmetology'], districtId: 'berzengi', address: 'пр. Арчабиль 31',
    entrance: 'отель «Арзув», цокольный этаж', rating: 4.9, reviewsBase: 162, phone: '+993 12 48 90 90', instagram: 'arzuw.spa',
    about: 'Массаж, хаммам и уход за лицом. Отдельные кабинеты, душ и халаты.', hours: SPA, demo: 'auto',
    amenities: ['wifi', 'tea', 'card', 'parking', 'shower'], priceLevel: 1.3,
    team: [['Аннагуль', 'Аннагуль Мурадова', 'f', ['massage']], ['Эзиз', 'Эзиз Сапаров', 'm', ['massage']], ['Лейли', 'Лейли Ниязова', 'f', ['cosmetology']]],
  },
  {
    id: 's18', slug: 'rahat', name: 'Rahat Massage', kind: 'Массажный салон', categories: ['massage'], districtId: 'mir', address: 'ул. Андалиба 12',
    entrance: 'вход с торца здания', rating: 4.7, reviewsBase: 69, phone: '+993 12 63 40 40',
    about: 'Лечебный и расслабляющий массаж. Специалисты с медицинским образованием.', hours: STD, demo: 'auto',
    amenities: ['tea', 'shower'], priceLevel: 0.9,
    team: [['Рахым', 'Рахым Овезов', 'm', ['massage']], ['Мая', 'Мая Атаева', 'f', ['massage']]],
  },
  {
    id: 's19', slug: 'kumush-spa', name: 'Kümüş Spa', kind: 'SPA и массаж', categories: ['massage'], districtId: 'choganly', address: 'Чоганлы, ул. Гарагум 3',
    entrance: 'отдельное здание, парковка', rating: 4.6, reviewsBase: 33, phone: '+993 12 58 77 77',
    about: 'Загородный спа у Чоганлы: массаж в четыре руки, стоун-терапия, травяной чай после сеанса.', hours: SPA, demo: 'auto',
    amenities: ['parking', 'tea', 'shower'], priceLevel: 1.0, since: addDays(today(), -9),
    team: [['Огулджан', 'Огулджан Нурыева', 'f', ['massage']], ['Сапар', 'Сапар Тачмурадов', 'm', ['massage']]],
  },
  {
    id: 's20', slug: 'dermis', name: 'Dermis Clinic', kind: 'Косметология', categories: ['cosmetology'], districtId: 'center', address: 'ул. Азади 58',
    entrance: 'медицинский центр, 3 этаж', rating: 4.8, reviewsBase: 88, phone: '+993 12 92 10 30', instagram: 'dermis.clinic',
    about: 'Косметология с врачами-дерматологами: чистки, пилинги, уход и инъекционные процедуры.', hours: STD, demo: 'auto',
    rules: { manual: true }, amenities: ['wifi', 'card', 'parking'], priceLevel: 1.3,
    team: [['Айна', 'Айна Гурбанова', 'f', ['cosmetology']], ['Дженнет', 'Дженнет Ходжаева', 'f', ['cosmetology']]],
  },
  {
    id: 's21', slug: 'yupek', name: 'Ýüpek', kind: 'Косметология', categories: ['cosmetology', 'brows'], districtId: 'bagtyyarlyk', address: 'ул. Гёроглы 18',
    entrance: 'вход со двора, 1 этаж', rating: 4.7, reviewsBase: 44, phone: '+993 12 35 66 66',
    about: 'Уход за лицом и брови. Подбираем домашний уход после каждой процедуры.', hours: STD, demo: 'auto',
    amenities: ['tea', 'card', 'women'],
    team: [['Майса', 'Майса Ягмурова', 'f', ['cosmetology']], ['Гозель', 'Гозель Аширова', 'f', ['brows', 'cosmetology']]],
  },
  {
    id: 's22', slug: 'ayna-makeup', name: 'Aýna Makeup Room', kind: 'Студия макияжа', categories: ['makeup', 'hair'], districtId: 'kopetdag', address: 'ул. Ататюрка 10',
    entrance: 'бизнес-центр, 5 этаж', rating: 5.0, reviewsBase: 52, phone: '+993 12 37 00 07', instagram: 'ayna.makeup',
    about: 'Макияж и причёски на свадьбу, выпускной и той. Выезд к невесте по договорённости.', hours: [H(8, 20), H(8, 20), H(8, 20), H(8, 20), H(8, 20), H(7, 20), H(7, 18)], demo: 'auto',
    rules: { manual: true }, amenities: ['wifi', 'coffee', 'women'], priceLevel: 1.2,
    team: [['Айна', 'Айна Бердыева', 'f', ['makeup', 'hair']], ['Сульгун', 'Сульгун Нурмамедова', 'f', ['makeup']]],
  },
  {
    id: 's23', slug: 'bella', name: 'Bella Studio', kind: 'Салон красоты', categories: ['hair', 'makeup', 'nails'], districtId: 'parahat', address: 'Парахат 4, дом 22',
    entrance: '', rating: 4.5, reviewsBase: 29, phone: '+993 12 94 33 44',
    about: 'Салон у дома для всей семьи: стрижки, макияж, маникюр. Есть детское кресло.', hours: STD, demo: 'auto',
    amenities: ['kids', 'tea'], priceLevel: 0.8,
    team: [['Огулгерек', 'Огулгерек Чарыева', 'f', ['hair', 'makeup']], ['Бахар', 'Бахар Аманова', 'f', ['nails']]],
  },
  {
    id: 's24', slug: 'archabil-barbers', name: 'Archabil Barbers', kind: 'Барбершоп', categories: ['barber'], districtId: 'archabil', address: 'пр. Арчабиль 64',
    entrance: 'ТЦ, первый этаж', rating: 4.8, reviewsBase: 77, phone: '+993 12 48 64 64', instagram: 'archabil.barbers',
    about: 'Барбершоп на проспекте: фейды, текстурные стрижки, уход за бородой. Есть парковка.', hours: LATE, demo: 'auto',
    amenities: ['wifi', 'coffee', 'card', 'parking'], priceLevel: 1.05,
    team: [['Ыхлас', 'Ыхлас Оразов', 'm', ['barber']], ['Чары', 'Чары Овезов', 'm', ['barber']], ['Гуванч', 'Гуванч Тачмурадов', 'm', ['barber']]],
  },
]

type Tpl = [group: string, name: string, dur: number, price: number, from?: boolean, desc?: string]

const MENU: Record<CategoryId, Tpl[]> = {
  barber: [
    ['Стрижки', 'Мужская стрижка', 45, 60, false, 'Стрижка ножницами и машинкой, мытьё головы и укладка.'],
    ['Стрижки', 'Стрижка + борода', 65, 85],
    ['Стрижки', 'Фейд', 50, 65, false, 'Плавный переход от кожи — классический или high fade.'],
    ['Стрижки', 'Детская стрижка', 30, 40, false, 'Для детей до 12 лет.'],
    ['Стрижки', 'Стрижка машинкой', 20, 35],
    ['Борода', 'Стрижка бороды', 20, 30],
    ['Борода', 'Королевское бритьё', 40, 55, false, 'Горячее полотенце, бритьё опасной бритвой, уходовые масла.'],
    ['Борода', 'Камуфляж седины', 30, 50],
  ],
  hair: [
    ['Стрижки и укладки', 'Женская стрижка', 60, 90],
    ['Стрижки и укладки', 'Стрижка чёлки', 15, 20],
    ['Стрижки и укладки', 'Укладка', 40, 60],
    ['Стрижки и укладки', 'Вечерняя причёска', 90, 150, true],
    ['Окрашивание', 'Окрашивание в один тон', 120, 220, true, 'Цена зависит от длины и густоты волос.'],
    ['Окрашивание', 'Мелирование', 180, 300, true],
    ['Окрашивание', 'Тонирование', 90, 150],
    ['Уход', 'Кератиновое выпрямление', 150, 350, true],
    ['Уход', 'Уход-маска для волос', 30, 50],
  ],
  nails: [
    ['Маникюр', 'Маникюр без покрытия', 45, 50],
    ['Маникюр', 'Маникюр с покрытием гель-лак', 90, 90, false, 'Снятие, аппаратный маникюр, покрытие в один тон.'],
    ['Маникюр', 'Наращивание ногтей', 150, 180],
    ['Маникюр', 'Дизайн ногтей', 30, 30, true],
    ['Педикюр', 'Педикюр без покрытия', 60, 80],
    ['Педикюр', 'Педикюр с покрытием', 90, 110],
    ['Педикюр', 'Снятие покрытия', 15, 15],
  ],
  brows: [
    ['Брови', 'Коррекция бровей', 30, 40],
    ['Брови', 'Окрашивание бровей', 30, 40],
    ['Брови', 'Ламинирование бровей', 60, 120, false, 'Долговременная укладка, окрашивание и коррекция.'],
    ['Ресницы', 'Наращивание ресниц, классика', 120, 180],
    ['Ресницы', 'Ламинирование ресниц', 60, 130],
  ],
  massage: [
    ['Массаж', 'Массаж спины', 45, 100],
    ['Массаж', 'Общий массаж', 60, 140],
    ['Массаж', 'Релакс-массаж', 90, 200, false, 'Медленный массаж всего тела с тёплым маслом.'],
    ['Массаж', 'Антицеллюлитный массаж', 60, 150],
    ['Массаж', 'Массаж лица', 30, 80],
  ],
  cosmetology: [
    ['Уход за лицом', 'Чистка лица', 60, 150, false, 'Комбинированная чистка, маска и уход по типу кожи.'],
    ['Уход за лицом', 'Пилинг', 45, 120],
    ['Уход за лицом', 'Увлажняющий уход', 60, 130],
    ['Инъекции', 'Биоревитализация', 45, 400, true],
    ['Инъекции', 'Мезотерапия', 45, 300, true],
  ],
  makeup: [
    ['Макияж', 'Дневной макияж', 45, 80],
    ['Макияж', 'Вечерний макияж', 60, 120],
    ['Макияж', 'Свадебный макияж', 90, 250, true, 'С пробным образом за неделю до свадьбы.'],
    ['Макияж', 'Макияж + причёска', 120, 280, true],
  ],
}

const SPEC: Record<CategoryId, [string, string]> = {
  barber: ['Барбер', 'Барбер'],
  hair: ['Парикмахер', 'Стилист-парикмахер'],
  nails: ['Мастер маникюра', 'Мастер ногтевого сервиса'],
  brows: ['Бровист', 'Мастер бровей и ресниц'],
  massage: ['Массажист', 'Массажистка'],
  cosmetology: ['Косметолог', 'Косметолог'],
  makeup: ['Визажист', 'Визажист'],
}

const AMENITY_ORDER = ['women', 'wifi', 'coffee', 'tea', 'card', 'parking', 'kids', 'shower']

const REVIEW_TEXT: Record<CategoryId, string[]> = {
  barber: [
    'Сделал ровно то, что просил. Записался сразу на следующий раз.',
    'Лучший фейд в городе. Записываю сына только сюда.',
    'Стрижка отличная, но ждал минут десять сверх записи.',
    'Аккуратно, быстро, без лишних разговоров. Рекомендую.',
    'Борода как с картинки. Горячее полотенце — отдельное удовольствие.',
    'Уютно, угостили кофе. Мастер подсказал, как укладывать дома.',
  ],
  hair: [
    'Наконец-то нашла своего мастера! Цвет получился именно такой, как хотела.',
    'Стрижка держит форму уже месяц, укладывать стало проще.',
    'Немного дольше, чем обещали, но результат того стоил.',
    'Очень внимательный мастер, всё объяснила про уход.',
    'Делала причёску на той — держалась до утра.',
  ],
  nails: [
    'Покрытие держится третью неделю, ни одного скола.',
    'Чисто, стерильно, инструменты при мне достали из крафт-пакета.',
    'Сделали аккуратно и быстро — уложилась в обеденный перерыв.',
    'Дизайн повторили точь-в-точь по фото. Спасибо!',
    'Хороший педикюр, но пришлось немного подождать.',
  ],
  brows: [
    'Брови наконец симметричные! Форму подобрали под лицо.',
    'Ламинирование ресниц — эффект как от туши, держится долго.',
    'Мастер не спешила, всё согласовала перед началом.',
    'Наращивание лёгкое, совсем не чувствуется.',
  ],
  massage: [
    'Спина как новая. Приду ещё на курс.',
    'Очень спокойная атмосфера, после сеанса дали травяной чай.',
    'Сильные руки и знание дела. Рекомендую при сидячей работе.',
    'Хорошо, но в кабинете было прохладно.',
  ],
  cosmetology: [
    'Кожа после чистки сияет, никаких покраснений на следующий день.',
    'Врач всё подробно объяснила, подобрала уход на дом.',
    'Пилинг прошёл комфортно, результат виден через неделю.',
    'Профессионально и чисто. Цены соответствуют уровню.',
  ],
  makeup: [
    'Макияж на свадьбу продержался весь день и выглядел естественно.',
    'Айна — волшебница! Все спрашивали, кто делал образ.',
    'Пробный образ помог определиться, в день торжества всё прошло спокойно.',
  ],
}
const REVIEW_NAMES = ['Айджемал', 'Довлет', 'Гозель', 'Арслан', 'Бахар', 'Мекан', 'Ширин', 'Мая', 'Сельби', 'Керим', 'Огулнабат', 'Нурлы', 'Дженнет', 'Батыр', 'Лейли', 'Эзиз', 'Акгыз', 'Сапар', 'Тылла', 'Ровшен']
const REVIEW_TAGS = ['Результат', 'Пунктуальность', 'Чистота', 'Атмосфера', 'Вежливость']

export interface Catalog {
  salons: Salon[]
  services: Service[]
  staff: Staff[]
  reviews: Review[]
}

let cache: { day: string; data: Catalog } | null = null

/** The catalogue is regenerated once per (Ashgabat) day so relative dates stay fresh. */
export function catalog(): Catalog {
  const day = today()
  if (cache?.day === day) return cache.data
  cache = { day, data: buildCatalog() }
  return cache.data
}

function buildCatalog(): Catalog {
  const t = today()
  const salons: Salon[] = []
  const services: Service[] = []
  const staff: Staff[] = []
  const reviews: Review[] = []
  let svcN = 0
  let stN = 0
  let rN = 0

  for (const def of DEFS) {
    const r = rng(hash(def.id))
    const [lat, lng] = DISTRICT_GEO[def.districtId]
    const { team, priceLevel = 1, rules, ...rest } = def
    const sal: Salon = {
      ...rest,
      city: 'Ашхабад',
      geo: { lat: lat + (r() - 0.5) * 0.014, lng: lng + (r() - 0.5) * 0.02 },
      photos: photosFor(def.id, def.categories, hash(def.slug)),
      rules: { ...BASE_RULES, ...rules },
      exceptions: def.exceptions ?? [],
      amenities: [...(def.amenities ?? [])].sort((a, b) => AMENITY_ORDER.indexOf(a) - AMENITY_ORDER.indexOf(b)),
      since: def.since ?? '2026-0' + (1 + Math.floor(r() * 8)) + '-15',
    }
    salons.push(sal)

    // menu: every category the salon offers, prices scaled by the salon's level
    const own: Service[] = []
    for (const cat of def.categories) {
      for (const [group, name, dur, price, from, desc] of MENU[cat]) {
        if (def.id !== 's1' && r() < 0.18) continue // salons don't all offer everything
        const p = Math.max(10, Math.round((price * priceLevel * (0.92 + r() * 0.16)) / 5) * 5)
        own.push({ id: def.id === 's1' ? `sv${++svcN}` : `${def.id}_sv${++svcN}`, salonId: def.id, group, category: cat, name, dur, price: def.id === 's1' ? price : p, priceFrom: from, online: true, desc })
      }
    }
    services.push(...own)

    // team
    team.forEach(([name, full, g, cats], i) => {
      const svcIds = own.filter((s) => cats.includes(s.category)).map((s) => s.id)
      const spec = cats.map((c) => SPEC[c][g === 'f' && c === 'massage' ? 1 : 0]).filter((x, j, a) => a.indexOf(x) === j).join(' · ')
      // one day off per week for most people in multi-person salons
      const off = team.length > 1 && i % 2 === 1 ? (i * 2) % 6 : -1
      staff.push({
        id: def.id === 's1' ? `st${i + 1}` : `${def.id}_st${++stN}`,
        salonId: def.id, name, full, roleId: i === 0 ? 'owner' : 'master',
        spec: def.id === 's1' && i === 0 ? 'Барбер · владелец' : spec,
        rating: Math.round((4.6 + r() * 0.4) * 10) / 10,
        visits: 60 + Math.floor(r() * 380),
        services: svcIds,
        schedule: off >= 0 ? sal.hours.map((h, d) => (d === off ? null : h)) : null,
        exceptions: [], active: true, since: '2024-0' + (1 + Math.floor(r() * 9)) + '-01', bookable: true,
      })
    })

    // reviews (only from finished visits)
    const pool = def.categories.flatMap((c) => REVIEW_TEXT[c].map((text) => ({ text, c })))
    const n = 3 + Math.floor(r() * 6)
    const sStaff = staff.filter((x) => x.salonId === def.id)
    for (let i = 0; i < n; i++) {
      const pick = pool[Math.floor(r() * pool.length)]
      const st = sStaff[Math.floor(r() * sStaff.length)]
      const svc = own.find((s) => s.category === pick.c && st.services.includes(s.id)) ?? own[0]
      const daysAgo = 2 + i * 4 + Math.floor(r() * 5)
      const neg = /ждал|подождать|дольше|прохладно/.test(pick.text)
      reviews.push({
        id: `r${++rN}`, salonId: def.id, staffId: st.id, clientName: REVIEW_NAMES[Math.floor(r() * REVIEW_NAMES.length)],
        rating: neg ? 4 : r() < 0.85 ? 5 : 4, text: pick.text, tags: r() < 0.5 ? [REVIEW_TAGS[Math.floor(r() * REVIEW_TAGS.length)]] : [],
        date: addDays(t, -daysAgo), svc: svc.name, createdAt: Date.parse(addDays(t, -daysAgo)),
        answer: r() < 0.3 ? { text: 'Спасибо за отзыв! Ждём вас снова.', ts: Date.parse(addDays(t, -daysAgo + 1)) } : undefined,
      })
    }
  }
  // dedupe identical review texts inside a salon
  const seen = new Set<string>()
  return { salons, services, staff, reviews: reviews.filter((x) => (seen.has(x.salonId + x.text) ? false : (seen.add(x.salonId + x.text), true))) }
}
