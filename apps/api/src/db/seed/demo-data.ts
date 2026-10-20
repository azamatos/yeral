/**
 * Demo data transcribed from the design export: `docs/design/demo-data.json` (client site) and
 * `docs/design/business/demo-data.json` (Glow Studio's workspace). Dates are written for the demo day 2026-10-14 and
 * shifted to "today" when seeding, so the demo never goes stale. Coordinates are placed around DEMO_CENTER at the
 * distances the screens show (they are illustrative, not surveyed). RU/EN texts are drafts.
 *
 * Kept as typed data, not read from the export at run time: a new export replaces docs/design and may change shape.
 */
import type { DateException, WeekHours } from '@yeral/domain/hours'
import type { BookingStatus, BookingType, CancelledBy, Interval, Localized, PriceType } from '@yeral/domain/model'
import type { Level } from '@yeral/domain/permissions'
import type { BookingRules } from '@yeral/domain/rules'

export const DEMO_DAY = '2026-10-14'
/** The demo user's position ("Ýakynymda"): central Ashgabat. */
export const DEMO_CENTER = { lat: 37.95, lng: 58.383 }

const L = (tk: string, ru: string, en: string): Localized => ({ tk, ru, en })
const h = (open: string, close: string, brk?: [string, string]) => ({
  open: m(open),
  close: m(close),
  break: brk ? { start: m(brk[0]), end: m(brk[1]) } : null,
})
/** '14:30' → 870 */
export function m(hhmm: string): number {
  const [hh = '0', mm = '0'] = hhmm.split(':')
  return Number(hh) * 60 + Number(mm)
}
const week = (
  weekdays: ReturnType<typeof h> | null,
  sat: ReturnType<typeof h> | null = weekdays,
  sun: ReturnType<typeof h> | null = null,
): WeekHours => [weekdays, weekdays, weekdays, weekdays, weekdays, sat, sun]

/** Photo names used by the design (`demo-data.json` → `photos`) and their files in docs/design/assets/photos. */
export const PHOTOS: Record<string, { file: string; alt: Localized }> = {
  'hair-stylist': {
    file: 'adam-winger-FkAZqQJTbXM-unsplash.jpg',
    alt: L('Saç ussasy işleýär', 'Парикмахер за работой', 'A hair stylist at work'),
  },
  'salon-interior': { file: 'benyamin-bohlouli-LGXN4OSQSa4-unsplash.jpg', alt: L('Salonyň içi', 'Интерьер салона', 'Salon interior') },
  nails: { file: 'giorgio-trovato-gb6gtiTZKB8-unsplash.jpg', alt: L('Manikýur', 'Маникюр', 'Manicure') },
  facial: { file: 'rosa-rafael-Pe9IXUuC6QU-unsplash.jpg', alt: L('Ýüz ideg', 'Уход за лицом', 'Facial') },
  'spa-stones': { file: 'engin-akyurt-ZbzYDboN7fg-unsplash.jpg', alt: L('Spa daşlary', 'Спа-камни', 'Spa stones') },
  barbershop: { file: 'nathon-oski-EW_rqoSdDes-unsplash.jpg', alt: L('Dellekhananyň içi', 'Интерьер барбершопа', 'Barbershop interior') },
  'barber-client': {
    file: 'allef-vinicius-IvQeAVeJULw-unsplash.jpg',
    alt: L('Dellek müşderiniň saçyny kesýär', 'Барбер стрижёт клиента', 'A barber cutting hair'),
  },
  'dental-office': {
    file: 'benyamin-bohlouli-e7MJLM5VGjY-unsplash.jpg',
    alt: L('Diş lukmanynyň otagy', 'Стоматологический кабинет', 'Dental office'),
  },
  'dentist-patient': {
    file: 'harold-hisona-Bg81yWKZlMg-unsplash.jpg',
    alt: L('Diş lukmany we näsag', 'Стоматолог и пациент', 'Dentist and patient'),
  },
  physio: { file: 'yury-kirillov-pbUWW-CBoqY-unsplash.jpg', alt: L('Fizioterapiýa', 'Физиотерапия', 'Physiotherapy') },
  'restaurant-hall': { file: 'mustafa-fatemi-ZEfHrVDF3NM-unsplash.jpg', alt: L('Restoranyň zaly', 'Зал ресторана', 'Restaurant hall') },
  'restaurant-people': {
    file: 'nick-hillier-xBXF9pr6LQo-unsplash.jpg',
    alt: L('Restoranda adamlar', 'Гости в ресторане', 'Guests at a restaurant'),
  },
  'cafe-garden': { file: 'ruben-ramirez-xhKG01FN2uk-unsplash.jpg', alt: L('Kafäniň bagy', 'Сад кафе', 'Café garden') },
  'gym-trainer': {
    file: 'sergio-kian-G6svDyPVRrc-unsplash.jpg',
    alt: L('Tälimçi bilen türgenleşik', 'Тренировка с тренером', 'Training with a coach'),
  },
  'yoga-class': { file: 'christian-harb-qY468agdO7g-unsplash.jpg', alt: L('Ýoga sapagy', 'Занятие йогой', 'Yoga class') },
  tutor: { file: 'ronald-felton-6c86TCPmNRQ-unsplash.jpg', alt: L('Sapak', 'Занятие', 'A lesson') },
  'auto-service': { file: 'christian-buehner-Fd6osyVbtG4-unsplash.jpg', alt: L('Awtoservis', 'Автосервис', 'Car service') },
  'pet-grooming': { file: 'buddy-an-LpK2xddrElI-unsplash.jpg', alt: L('Itiň groming', 'Груминг собаки', 'Dog grooming') },
}

export interface DemoService {
  key: string
  name: Localized
  description?: Localized
  durationMin: number
  price: [PriceType, number]
  staff: string[]
  bufferMin?: number
}

export interface DemoStaff {
  key: string
  name: string
  fullName?: string
  specialization?: Localized
  phone?: string
  gender?: 'female' | 'male'
  bookable?: boolean
  hasApp?: boolean
  status?: 'active' | 'invited'
  shift?: ({ open: number; close: number } | null)[]
  breaks?: (Interval | null)[]
  daysOff?: DateException[]
  rating?: number
  /** Access level when this person signs in (ADR 0025); none = a specialist without an account. */
  level?: Level
}

export interface DemoBusiness {
  slug: string
  name: string
  category: string
  kind: Localized
  type: BookingType
  address: string
  street: string
  entranceNote?: string
  phone: string
  distanceKm: number
  /** Degrees from north, to spread businesses around DEMO_CENTER. */
  bearing: number
  photos: string[]
  hours: WeekHours
  exceptions?: DateException[]
  rating: number
  reviewsCount: number
  ratingBreakdown?: Record<'1' | '2' | '3' | '4' | '5', number>
  about: Localized
  amenities: string[]
  rules?: Partial<BookingRules> & { note?: Localized }
  groups?: { name: Localized; services: DemoService[] }[]
  staff?: DemoStaff[]
  areas?: { key: string; name: Localized; note?: Localized; minParty: number; maxParty: number; tables: number[] }[]
  tableRequests?: string[]
  demo?: boolean
}

const EVERYDAY = (open: string, close: string): WeekHours => week(h(open, close), h(open, close), h(open, close))
const MON_SAT = (open: string, close: string, sun?: [string, string]): WeekHours =>
  week(h(open, close), h(open, close), sun ? h(sun[0], sun[1]) : null)
const NO_BREAKS = [null, null, null, null, null, null, null]

export const BUSINESSES: DemoBusiness[] = [
  {
    slug: 'glow-studio',
    name: 'Glow Studio',
    category: 'beauty',
    kind: L('Gözellik salony', 'Салон красоты', 'Beauty salon'),
    type: 'appointment',
    address: 'Bitarap Türkmenistan şaýoly 247, 2-nji gat',
    street: 'Bitarap Türkmenistan şaýoly 247',
    entranceNote: 'Söwda merkeziniň gapdalyndaky gapydan, lift bilen 2-nji gat',
    phone: '+99312456789',
    distanceKm: 3.0,
    bearing: 20,
    photos: ['hair-stylist', 'salon-interior', 'nails', 'facial', 'spa-stones'],
    hours: MON_SAT('09:00', '20:00', ['10:00', '18:00']),
    exceptions: [
      { name: 'Täze ýyl', from: '2026-01-01', to: '2026-01-01', yearly: true, hours: null },
      { name: 'Nowruz', from: '2026-03-21', to: '2026-03-22', yearly: true, hours: null },
      { name: 'Garaşsyzlyk güni', from: '2026-09-27', to: '2026-09-27', yearly: true, hours: null },
      { name: 'Inwentarizasiýa', from: '2026-11-02', to: '2026-11-02', yearly: false, hours: null },
    ],
    rating: 4.9,
    reviewsCount: 96,
    ratingBreakdown: { 5: 88, 4: 6, 3: 1, 2: 1, 1: 0 },
    about: L(
      'Saç, dyrnak we ýüz ideg — bir ýerde. Diňe barlanan serişdeler bilen işleýäris; her müşderä wagtynda garaşýarys.',
      'Волосы, ногти и уход за лицом — в одном месте. Работаем только с проверенными средствами и принимаем вовремя.',
      'Hair, nails and facials in one place. We use trusted products only and see every client on time.',
    ),
    amenities: ['wifi', 'air_conditioning', 'parking', 'card_payment'],
    rules: {
      confirmMode: 'manual',
      holdMinutes: 30,
      leadMinutes: 60,
      windowDays: 30,
      bufferMinutes: 10,
      slotStep: 15,
      cancelWindowMinutes: 120,
      askCancelReason: true,
      blockAfterNoShows: 2,
    },
    groups: [
      {
        name: L('Saç', 'Волосы', 'Hair'),
        services: [
          {
            key: 's1',
            name: L('Aýal saç kesimi', 'Женская стрижка', "Women's haircut"),
            description: L('Ýuwmak, kesmek we düzmek', 'Мытьё, стрижка и укладка', 'Wash, cut and style'),
            durationMin: 60,
            price: ['fixed', 80],
            staff: ['ayna'],
          },
          { key: 's2', name: L('Saç düzmek', 'Укладка', 'Styling'), durationMin: 45, price: ['fixed', 60], staff: ['ayna'] },
          {
            key: 's3',
            name: L('Saç reňklemek', 'Окрашивание', 'Colouring'),
            description: L('Bahasy saçyň uzynlygyna bagly', 'Цена зависит от длины волос', 'Price depends on hair length'),
            durationMin: 120,
            price: ['from', 250],
            staff: ['ayna'],
            bufferMin: 15,
          },
          {
            key: 's4',
            name: L('Çaga saç kesimi', 'Детская стрижка', "Kids' haircut"),
            durationMin: 30,
            price: ['fixed', 40],
            staff: ['ayna'],
          },
        ],
      },
      {
        name: L('Dyrnak', 'Ногти', 'Nails'),
        services: [
          { key: 's5', name: L('Manikýur', 'Маникюр', 'Manicure'), durationMin: 60, price: ['fixed', 70], staff: ['maral'] },
          {
            key: 's6',
            name: L('Gel-lak bilen manikýur', 'Маникюр с гель-лаком', 'Gel manicure'),
            durationMin: 90,
            price: ['fixed', 110],
            staff: ['maral'],
          },
          { key: 's7', name: L('Pedikýur', 'Педикюр', 'Pedicure'), durationMin: 75, price: ['fixed', 90], staff: ['maral'] },
        ],
      },
      {
        name: L('Ýüz ideg', 'Уход за лицом', 'Facials'),
        services: [
          {
            key: 's8',
            name: L('Ýüz arassalamak', 'Чистка лица', 'Facial cleansing'),
            durationMin: 60,
            price: ['fixed', 150],
            staff: ['jeren'],
          },
          {
            key: 's9',
            name: L('Gaş we kirpik', 'Брови и ресницы', 'Brows and lashes'),
            durationMin: 30,
            price: ['fixed', 50],
            staff: ['jeren'],
          },
        ],
      },
      {
        name: L('Massaž', 'Массаж', 'Massage'),
        services: [
          { key: 's10', name: L('Arka massažy', 'Массаж спины', 'Back massage'), durationMin: 30, price: ['fixed', 90], staff: ['leyli'] },
          {
            key: 's11',
            name: L('Doly beden massažy', 'Массаж всего тела', 'Full body massage'),
            durationMin: 60,
            price: ['fixed', 160],
            staff: ['leyli'],
          },
        ],
      },
    ],
    staff: [
      { key: 'mays', name: 'Maýsa', fullName: 'Maýsa Annaýewa', phone: '+99365102030', bookable: false, level: 'owner', gender: 'female' },
      { key: 'selbi', name: 'Selbi', fullName: 'Selbi Hojaýewa', phone: '+99365884102', bookable: false, level: 'admin', gender: 'female' },
      {
        key: 'ayna',
        name: 'Aýna',
        fullName: 'Aýna Myradowa',
        specialization: L('Stilist', 'Стилист', 'Stylist'),
        phone: '+99365312210',
        level: 'specialist',
        gender: 'female',
        // Wednesday 14:00–14:40, Thursday 13:30–14:10 (business demo data: so the 14:30 request on Thursday fits)
        breaks: [null, null, { start: m('14:00'), end: m('14:40') }, { start: m('13:30'), end: m('14:10') }, null, null, null],
        daysOff: [{ name: 'Doglan güni', from: '2026-05-03', to: '2026-05-03', yearly: true, hours: null }],
        rating: 4.9,
      },
      {
        key: 'maral',
        name: 'Maral',
        fullName: 'Maral Sapargeldiýewa',
        specialization: L('Dyrnak ussasy', 'Мастер маникюра', 'Nail technician'),
        phone: '+99361440819',
        level: 'specialist',
        gender: 'female',
        rating: 5.0,
      },
      {
        key: 'jeren',
        name: 'Jeren',
        fullName: 'Jeren Ataýewa',
        specialization: L('Kosmetolog', 'Косметолог', 'Beautician'),
        phone: '+99362701533',
        level: 'specialist',
        gender: 'female',
        shift: [
          h('10:00', '19:00'),
          h('10:00', '19:00'),
          h('10:00', '19:00'),
          h('10:00', '19:00'),
          h('10:00', '19:00'),
          h('10:00', '19:00'),
          null,
        ],
        daysOff: [{ name: 'Rugsat', from: '2026-11-02', to: '2026-11-09', yearly: false, hours: null }],
        rating: 4.8,
      },
      {
        key: 'leyli',
        name: 'Leýli',
        fullName: 'Leýli Garaýewa',
        specialization: L('Massažist', 'Массажист', 'Massage therapist'),
        phone: '+99363129047',
        hasApp: false,
        gender: 'female',
        shift: [
          h('12:00', '20:00'),
          h('12:00', '20:00'),
          h('12:00', '20:00'),
          h('12:00', '20:00'),
          h('12:00', '20:00'),
          h('12:00', '20:00'),
          null,
        ],
        rating: 4.9,
      },
      {
        key: 'gulnar',
        name: 'Gülnar',
        specialization: L('Stilist', 'Стилист', 'Stylist'),
        phone: '+99364215590',
        bookable: false,
        status: 'invited',
        level: 'specialist',
        gender: 'female',
      },
    ],
  },
  {
    slug: 'glow-studio-parahat',
    name: 'Glow Studio · Parahat',
    category: 'beauty',
    kind: L('Gözellik salony', 'Салон красоты', 'Beauty salon'),
    type: 'appointment',
    address: 'Parahat 7, 12-nji jaý',
    street: 'Parahat 7',
    phone: '+99312456780',
    distanceKm: 4.4,
    bearing: 200,
    photos: ['salon-interior', 'hair-stylist'],
    hours: MON_SAT('09:00', '20:00'),
    rating: 4.8,
    reviewsCount: 31,
    about: L('Glow Studio-nyň Parahatdaky şahamçasy.', 'Филиал Glow Studio в Парахате.', 'Glow Studio’s Parahat branch.'),
    amenities: ['air_conditioning', 'card_payment'],
    groups: [
      {
        name: L('Saç', 'Волосы', 'Hair'),
        services: [
          {
            key: 'p1',
            name: L('Aýal saç kesimi', 'Женская стрижка', "Women's haircut"),
            durationMin: 60,
            price: ['fixed', 80],
            staff: ['ogulbibi'],
          },
          { key: 'p2', name: L('Saç düzmek', 'Укладка', 'Styling'), durationMin: 45, price: ['fixed', 60], staff: ['ogulbibi'] },
        ],
      },
    ],
    staff: [
      { key: 'mays', name: 'Maýsa', fullName: 'Maýsa Annaýewa', phone: '+99365102030', bookable: false, level: 'owner', gender: 'female' },
      {
        key: 'ogulbibi',
        name: 'Ogulbibi',
        specialization: L('Stilist', 'Стилист', 'Stylist'),
        phone: '+99365778811',
        hasApp: false,
        gender: 'female',
        rating: 4.8,
      },
    ],
  },
  {
    slug: 'bag-kafe',
    name: 'Bag kafe',
    category: 'cafe',
    kind: L('Kafe', 'Кафе', 'Café'),
    type: 'table',
    address: 'Andalyp köçesi 8',
    street: 'Andalyp köçesi 8',
    phone: '+99312223344',
    distanceKm: 0.9,
    bearing: 110,
    photos: ['cafe-garden', 'restaurant-hall', 'restaurant-people'],
    hours: EVERYDAY('09:00', '23:00'),
    rating: 4.8,
    reviewsCount: 119,
    about: L(
      'Bagyň içinde terrasaly kafe: irden kofe, agşam maşgala nahary.',
      'Кафе с террасой в саду: кофе утром, семейный ужин вечером.',
      'A garden café with a terrace: coffee in the morning, family dinner at night.',
    ),
    amenities: ['wifi', 'parking', 'card_payment'],
    rules: { cancelWindowMinutes: 120, slotStep: 30, leadMinutes: 30 },
    areas: [
      {
        key: 'hall',
        name: L('Zal', 'Зал', 'Hall'),
        note: L('Kondisionerli', 'С кондиционером', 'Air-conditioned'),
        minParty: 1,
        maxParty: 8,
        tables: [2, 2, 4, 4, 6],
      },
      {
        key: 'terrace',
        name: L('Terrasa', 'Терраса', 'Terrace'),
        note: L('Açyk howada', 'На открытом воздухе', 'Outdoors'),
        minParty: 1,
        maxParty: 8,
        tables: [2, 4, 4, 6, 8],
      },
      {
        key: 'vip',
        name: L('VIP otag', 'VIP-комната', 'VIP room'),
        note: L('6–10 adam', '6–10 человек', '6–10 people'),
        minParty: 6,
        maxParty: 10,
        tables: [10],
      },
    ],
    tableRequests: ['Doglan gün', 'Çaga oturgyjy', 'Penjiräniň ýanynda', 'Sessiz ýer'],
  },
  {
    slug: 'aydyn-yoga',
    name: 'Aýdyň ýoga',
    category: 'sport',
    kind: L('Ýoga studiýa', 'Студия йоги', 'Yoga studio'),
    type: 'class',
    address: 'Atatürk köçesi 40',
    street: 'Atatürk köçesi 40',
    phone: '+99312778899',
    distanceKm: 2.6,
    bearing: 300,
    photos: ['yoga-class'],
    hours: EVERYDAY('07:00', '22:00'),
    rating: 4.8,
    reviewsCount: 54,
    about: L(
      'Ýoga ähli derejeler üçin: irden akym, agşam hatha we ýin.',
      'Йога для всех уровней: утренний поток, вечером хатха и инь.',
      'Yoga for every level: a morning flow, hatha and yin in the evening.',
    ),
    amenities: ['air_conditioning', 'card_payment'],
    rules: {
      cancelWindowMinutes: 720,
      leadMinutes: 0,
      confirmMode: 'instant',
      note: L(
        'Düşegiňizi alyp geliň ýa-da ýerinde 10 TMT-e alyň.',
        'Возьмите свой коврик или арендуйте на месте за 10 TMT.',
        'Bring your mat or rent one for 10 TMT.',
      ),
    },
    staff: [
      {
        key: 'aygozel',
        name: 'Aýgözel',
        specialization: L('Tälimçi', 'Тренер', 'Trainer'),
        // without the app a phone is required: the owner calls them (book Q-216)
        phone: '+99365440201',
        bookable: false,
        hasApp: false,
        gender: 'female',
      },
      {
        key: 'kakajan',
        name: 'Kakajan',
        specialization: L('Tälimçi', 'Тренер', 'Trainer'),
        phone: '+99365440202',
        bookable: false,
        hasApp: false,
        gender: 'male',
      },
    ],
  },
  {
    slug: 'barber-loft',
    name: 'Barber Loft',
    category: 'barber',
    kind: L('Dellekhana', 'Барбершоп', 'Barbershop'),
    type: 'appointment',
    address: 'Magtymguly şaýoly 12',
    street: 'Magtymguly şaýoly 12',
    phone: '+99312334455',
    distanceKm: 1.2,
    bearing: 60,
    photos: ['barber-client', 'barbershop'],
    hours: MON_SAT('10:00', '21:00', ['11:00', '19:00']),
    rating: 4.9,
    reviewsCount: 212,
    about: L('Erkekler üçin saç we sakgal.', 'Стрижки и бороды для мужчин.', 'Haircuts and beards for men.'),
    amenities: ['wifi', 'air_conditioning', 'card_payment'],
    rules: { confirmMode: 'instant', slotStep: 15, bufferMinutes: 5 },
    groups: [
      {
        name: L('Saç we sakgal', 'Стрижка и борода', 'Hair and beard'),
        services: [
          {
            key: 'bl1',
            name: L('Erkek saç kesimi', 'Мужская стрижка', "Men's haircut"),
            durationMin: 45,
            price: ['from', 40],
            staff: ['merdan', 'arslan'],
          },
          {
            key: 'bl2',
            name: L('Sakgal düzediş', 'Оформление бороды', 'Beard trim'),
            durationMin: 30,
            price: ['fixed', 30],
            staff: ['merdan', 'arslan'],
          },
          {
            key: 'bl3',
            name: L('Saç we sakgal', 'Стрижка и борода', 'Haircut and beard'),
            durationMin: 60,
            price: ['fixed', 60],
            staff: ['merdan'],
          },
        ],
      },
    ],
    staff: [
      {
        key: 'merdan',
        name: 'Merdan',
        specialization: L('Dellek', 'Барбер', 'Barber'),
        phone: '+99365440011',
        gender: 'male',
        rating: 4.9,
      },
      {
        key: 'arslan',
        name: 'Arslan',
        specialization: L('Dellek', 'Барбер', 'Barber'),
        phone: '+99365440012',
        gender: 'male',
        rating: 4.8,
      },
    ],
  },
  {
    slug: 'ak-dis',
    name: 'Ak Diş',
    category: 'dental',
    kind: L('Diş lukmany', 'Стоматология', 'Dentist'),
    type: 'appointment',
    address: 'Görogly köçesi 52',
    street: 'Görogly köçesi 52',
    phone: '+99312445566',
    distanceKm: 2.1,
    bearing: 150,
    photos: ['dental-office', 'dentist-patient'],
    hours: MON_SAT('09:00', '19:00'),
    rating: 4.8,
    reviewsCount: 131,
    about: L('Maşgala diş lukmançylygy.', 'Семейная стоматология.', 'Family dentistry.'),
    amenities: ['air_conditioning', 'card_payment'],
    groups: [
      {
        name: L('Bejergi', 'Лечение', 'Treatment'),
        services: [
          { key: 'ad1', name: L('Barlag', 'Осмотр', 'Check-up'), durationMin: 30, price: ['fixed', 50], staff: ['dowlet', 'ogulgerek'] },
          { key: 'ad2', name: L('Arassalamak', 'Чистка', 'Cleaning'), durationMin: 60, price: ['fixed', 200], staff: ['ogulgerek'] },
          { key: 'ad3', name: L('Plomba', 'Пломба', 'Filling'), durationMin: 60, price: ['from', 250], staff: ['dowlet'] },
        ],
      },
    ],
    staff: [
      {
        key: 'dowlet',
        name: 'Lukman Döwlet',
        specialization: L('Diş lukmany', 'Стоматолог', 'Dentist'),
        phone: '+99365440021',
        gender: 'male',
        rating: 4.8,
      },
      {
        key: 'ogulgerek',
        name: 'Lukman Ogulgerek',
        specialization: L('Gigiýenist', 'Гигиенист', 'Hygienist'),
        phone: '+99365440022',
        gender: 'female',
        rating: 4.7,
      },
    ],
  },
  {
    slug: 'nail-bar-ayna',
    name: 'Nail Bar Aýna',
    category: 'nails',
    kind: L('Dyrnak', 'Ногти', 'Nails'),
    type: 'appointment',
    address: 'Oguzhan köçesi 21',
    street: 'Oguzhan köçesi 21',
    phone: '+99312556677',
    distanceKm: 1.6,
    bearing: 240,
    photos: ['nails'],
    hours: MON_SAT('09:00', '20:00', ['10:00', '18:00']),
    rating: 4.9,
    reviewsCount: 73,
    about: L('Dyrnak ideg studiýasy.', 'Студия ногтевого сервиса.', 'A nail studio.'),
    amenities: ['wifi', 'card_payment'],
    groups: [
      {
        name: L('Dyrnak', 'Ногти', 'Nails'),
        services: [
          { key: 'nb1', name: L('Manikýur', 'Маникюр', 'Manicure'), durationMin: 60, price: ['fixed', 70], staff: ['maral-n', 'bagul'] },
          {
            key: 'nb2',
            name: L('Gel-lak bilen manikýur', 'Маникюр с гель-лаком', 'Gel manicure'),
            durationMin: 90,
            price: ['fixed', 110],
            staff: ['maral-n', 'bagul'],
          },
          { key: 'nb3', name: L('Pedikýur', 'Педикюр', 'Pedicure'), durationMin: 75, price: ['fixed', 90], staff: ['bagul'] },
        ],
      },
    ],
    staff: [
      {
        key: 'maral-n',
        name: 'Maral',
        specialization: L('Dyrnak ussasy', 'Мастер маникюра', 'Nail technician'),
        phone: '+99365440031',
        gender: 'female',
        rating: 5.0,
      },
      {
        key: 'bagul',
        name: 'Bägül',
        specialization: L('Dyrnak ussasy', 'Мастер маникюра', 'Nail technician'),
        phone: '+99365440032',
        gender: 'female',
        rating: 4.8,
      },
    ],
  },
  {
    slug: 'rahat-spa',
    name: 'Rahat Spa',
    category: 'spa',
    kind: L('Spa we massaž', 'Спа и массаж', 'Spa & massage'),
    type: 'appointment',
    address: 'Bitarap Türkmenistan şaýoly 247',
    street: 'Bitarap Türkmenistan şaýoly 247',
    phone: '+99312667788',
    distanceKm: 1.9,
    bearing: 340,
    photos: ['spa-stones', 'facial'],
    hours: EVERYDAY('10:00', '21:00'),
    rating: 4.9,
    reviewsCount: 140,
    about: L('Massaž we spa — dynç alyş üçin.', 'Массаж и спа для отдыха.', 'Massage and spa to unwind.'),
    amenities: ['wifi', 'air_conditioning', 'parking', 'card_payment'],
    groups: [
      {
        name: L('Massaž', 'Массаж', 'Massage'),
        services: [
          {
            key: 'rs1',
            name: L('Arka massažy', 'Массаж спины', 'Back massage'),
            durationMin: 30,
            price: ['fixed', 90],
            staff: ['leyli-r'],
          },
          {
            key: 'rs2',
            name: L('Doly beden massažy', 'Массаж всего тела', 'Full body massage'),
            durationMin: 60,
            price: ['fixed', 160],
            staff: ['leyli-r', 'aman'],
          },
          { key: 'rs3', name: L('Hammam', 'Хаммам', 'Hammam'), durationMin: 90, price: ['fixed', 150], staff: ['aman'] },
        ],
      },
    ],
    staff: [
      {
        key: 'leyli-r',
        name: 'Leýli',
        specialization: L('Massažist', 'Массажист', 'Massage therapist'),
        phone: '+99365440041',
        gender: 'female',
        rating: 4.9,
      },
      {
        key: 'aman',
        name: 'Aman',
        specialization: L('Massažist', 'Массажист', 'Massage therapist'),
        phone: '+99365440042',
        gender: 'male',
        rating: 4.8,
      },
    ],
  },
  {
    slug: 'ojak',
    name: 'Ojak',
    category: 'restaurant',
    kind: L('Restoran', 'Ресторан', 'Restaurant'),
    type: 'table',
    address: 'Garaşsyzlyk şaýoly 15',
    street: 'Garaşsyzlyk şaýoly 15',
    phone: '+99312778811',
    distanceKm: 2.8,
    bearing: 80,
    photos: ['restaurant-people', 'restaurant-hall'],
    hours: EVERYDAY('11:00', '23:00'),
    rating: 4.7,
    reviewsCount: 88,
    about: L('Milli we ýewropa naharlary.', 'Национальная и европейская кухня.', 'Turkmen and European cuisine.'),
    amenities: ['parking', 'card_payment', 'air_conditioning'],
    rules: { slotStep: 30, leadMinutes: 60 },
    areas: [
      { key: 'hall', name: L('Zal', 'Зал', 'Hall'), minParty: 1, maxParty: 8, tables: [2, 4, 4, 6, 8] },
      {
        key: 'vip',
        name: L('VIP otag', 'VIP-комната', 'VIP room'),
        note: L('6–10 adam', '6–10 человек', '6–10 people'),
        minParty: 6,
        maxParty: 10,
        tables: [10],
      },
    ],
    tableRequests: ['Doglan gün', 'Çaga oturgyjy'],
  },
  {
    slug: 'guyc-fitness',
    name: 'Güýç Fitness',
    category: 'sport',
    kind: L('Sport zaly', 'Фитнес-зал', 'Gym'),
    type: 'appointment',
    address: 'Arçabil şaýoly 3',
    street: 'Arçabil şaýoly 3',
    phone: '+99312889900',
    distanceKm: 4.2,
    bearing: 170,
    photos: ['gym-trainer'],
    hours: EVERYDAY('07:00', '22:00'),
    rating: 4.8,
    reviewsCount: 64,
    about: L('Şahsy tälimçi bilen türgenleşik.', 'Тренировки с персональным тренером.', 'Training with a personal coach.'),
    amenities: ['parking', 'air_conditioning'],
    groups: [
      {
        name: L('Türgenleşik', 'Тренировки', 'Training'),
        services: [
          {
            key: 'gf1',
            name: L('Şahsy türgenleşik', 'Персональная тренировка', 'Personal training'),
            durationMin: 60,
            price: ['fixed', 100],
            staff: ['batyr'],
          },
        ],
      },
    ],
    staff: [
      {
        key: 'batyr',
        name: 'Batyr',
        specialization: L('Tälimçi', 'Тренер', 'Trainer'),
        phone: '+99365440051',
        gender: 'male',
        rating: 4.8,
      },
    ],
  },
  {
    slug: 'hereket-fizio',
    name: 'Hereket Fizio',
    category: 'health',
    kind: L('Fizioterapiýa', 'Физиотерапия', 'Physiotherapy'),
    type: 'appointment',
    address: 'Çandybil şaýoly 9',
    street: 'Çandybil şaýoly 9',
    phone: '+99312990011',
    distanceKm: 3.6,
    bearing: 260,
    photos: ['physio'],
    hours: MON_SAT('09:00', '18:00'),
    rating: 4.8,
    reviewsCount: 52,
    about: L('Fizioterapiýa we dikeldiş.', 'Физиотерапия и реабилитация.', 'Physiotherapy and rehabilitation.'),
    amenities: ['air_conditioning', 'card_payment'],
    groups: [
      {
        name: L('Bejergi', 'Лечение', 'Treatment'),
        services: [
          {
            key: 'hf1',
            name: L('Fizioterapiýa', 'Физиотерапия', 'Physiotherapy'),
            durationMin: 45,
            price: ['from', 120],
            staff: ['jemal'],
          },
          {
            key: 'hf2',
            name: L('Bejeriş massažy', 'Лечебный массаж', 'Therapeutic massage'),
            durationMin: 60,
            price: ['fixed', 150],
            staff: ['jemal'],
          },
        ],
      },
    ],
    staff: [
      {
        key: 'jemal',
        name: 'Lukman Jemal',
        specialization: L('Fizioterapewt', 'Физиотерапевт', 'Physiotherapist'),
        phone: '+99365440061',
        gender: 'female',
        rating: 4.8,
      },
    ],
  },
  {
    slug: 'acar-okuw',
    name: 'Açar okuw merkezi',
    category: 'education',
    kind: L('Okuw', 'Обучение', 'Lessons'),
    type: 'appointment',
    address: 'Magtymguly şaýoly 88',
    street: 'Magtymguly şaýoly 88',
    phone: '+99312101112',
    distanceKm: 2.4,
    bearing: 30,
    photos: ['tutor'],
    hours: MON_SAT('10:00', '20:00'),
    rating: 4.7,
    reviewsCount: 41,
    about: L('Dil we matematika sapaklary.', 'Языки и математика.', 'Languages and maths.'),
    amenities: ['wifi', 'air_conditioning'],
    groups: [
      {
        name: L('Sapaklar', 'Занятия', 'Lessons'),
        services: [
          { key: 'ao1', name: L('Iňlis dili', 'Английский язык', 'English'), durationMin: 60, price: ['fixed', 80], staff: ['kerim'] },
          { key: 'ao2', name: L('Matematika', 'Математика', 'Maths'), durationMin: 60, price: ['fixed', 70], staff: ['kerim'] },
        ],
      },
    ],
    staff: [
      {
        key: 'kerim',
        name: 'Kerim',
        specialization: L('Mugallym', 'Преподаватель', 'Teacher'),
        phone: '+99365440071',
        gender: 'male',
        rating: 4.7,
      },
    ],
  },
  {
    slug: 'awto-ussa',
    name: 'Awto Ussa',
    category: 'auto',
    kind: L('Awtoulag', 'Авто', 'Auto'),
    type: 'appointment',
    address: 'Gurtly ýoly 2',
    street: 'Gurtly ýoly 2',
    phone: '+99312121314',
    distanceKm: 5.1,
    bearing: 320,
    photos: ['auto-service'],
    hours: MON_SAT('08:00', '19:00'),
    rating: 4.6,
    reviewsCount: 58,
    about: L('Ýuwmak, tigir we diagnostika.', 'Мойка, шиномонтаж и диагностика.', 'Wash, tyres and diagnostics.'),
    amenities: ['parking', 'card_payment'],
    groups: [
      {
        name: L('Hyzmatlar', 'Услуги', 'Services'),
        services: [
          { key: 'au1', name: L('Awtoulag ýuwmak', 'Мойка', 'Car wash'), durationMin: 45, price: ['from', 60], staff: ['serdar'] },
          { key: 'au2', name: L('Tigir çalyşmak', 'Шиномонтаж', 'Tyre change'), durationMin: 60, price: ['fixed', 120], staff: ['serdar'] },
          { key: 'au3', name: L('Diagnostika', 'Диагностика', 'Diagnostics'), durationMin: 60, price: ['from', 150], staff: ['serdar'] },
        ],
      },
    ],
    staff: [
      {
        key: 'serdar',
        name: 'Ussa Serdar',
        specialization: L('Ussa', 'Мастер', 'Mechanic'),
        phone: '+99365440081',
        gender: 'male',
        rating: 4.6,
      },
    ],
  },
  {
    slug: 'pamyk',
    name: 'Pamyk',
    category: 'pets',
    kind: L('Öý haýwanlary', 'Питомцы', 'Pets'),
    type: 'appointment',
    address: 'Parahat 4',
    street: 'Parahat 4',
    phone: '+99312151617',
    distanceKm: 3.1,
    bearing: 210,
    photos: ['pet-grooming'],
    hours: MON_SAT('10:00', '19:00'),
    rating: 5.0,
    reviewsCount: 37,
    about: L('Itler we pişikler üçin groming.', 'Груминг для собак и кошек.', 'Grooming for dogs and cats.'),
    amenities: ['card_payment'],
    groups: [
      {
        name: L('Groming', 'Груминг', 'Grooming'),
        services: [{ key: 'pm1', name: L('Groming', 'Груминг', 'Grooming'), durationMin: 90, price: ['from', 80], staff: ['leyla'] }],
      },
    ],
    staff: [
      {
        key: 'leyla',
        name: 'Leýla',
        specialization: L('Groomer', 'Грумер', 'Groomer'),
        phone: '+99365440091',
        gender: 'female',
        rating: 5.0,
      },
    ],
  },
]

/** Aýdyň ýoga's week, by weekday (0 = Monday); Wednesday and Thursday match the design. */
export const YOGA_WEEK: {
  dow: number
  start: string
  name: Localized
  trainer: string
  level: Localized
  durationMin: number
  price: number
  capacity: number
}[] = (() => {
  const irden = {
    name: L('Irden akym', 'Утренний поток', 'Morning flow'),
    trainer: 'aygozel',
    level: L('Orta', 'Средний', 'Intermediate'),
    durationMin: 45,
    price: 45,
    capacity: 12,
  }
  const hatha = {
    name: L('Hatha ýoga', 'Хатха-йога', 'Hatha yoga'),
    trainer: 'aygozel',
    level: L('Başlangyç', 'Начальный', 'Beginner'),
    durationMin: 60,
    price: 50,
    capacity: 14,
  }
  const yin = {
    name: L('Ýin ýoga', 'Инь-йога', 'Yin yoga'),
    trainer: 'kakajan',
    level: L('Ähli derejeler', 'Все уровни', 'All levels'),
    durationMin: 75,
    price: 60,
    capacity: 12,
  }
  return [
    { dow: 0, start: '08:00', ...irden },
    { dow: 0, start: '18:30', ...hatha },
    { dow: 1, start: '08:00', ...irden },
    { dow: 1, start: '20:00', ...yin },
    { dow: 2, start: '18:30', ...hatha },
    { dow: 2, start: '20:00', ...yin },
    { dow: 3, start: '08:00', ...irden },
    { dow: 3, start: '19:00', ...hatha },
    { dow: 4, start: '08:00', ...irden },
    { dow: 4, start: '18:30', ...hatha },
    { dow: 5, start: '10:00', ...hatha },
    { dow: 6, start: '10:00', ...yin },
  ]
})()

/** Seats already taken on the demo day's sessions ("3 ýer galdy", "Doly", "7 ýer galdy", "9 ýer galdy"). */
export const YOGA_TAKEN: Record<string, number> = {
  '2026-10-14 18:30': 11,
  '2026-10-14 20:00': 12,
  '2026-10-15 08:00': 5,
  '2026-10-15 19:00': 5,
}

// ── People ──

export const DEMO_USER = {
  name: 'Aýjemal Gurbanowa',
  phone: '+99365901122',
  favorites: ['glow-studio', 'bag-kafe', 'aydyn-yoga', 'ak-dis'],
}

export interface DemoClient {
  key: string
  name: string
  fullName?: string
  phone: string
  /** Completed visits in total, the demo day's included. */
  visits: number
  last?: string
  avg?: number
  since?: string
  tags: string[]
  source?: 'instagram' | 'referral' | 'yeral' | 'walkby' | 'other'
  noShows?: number
  onlineBlocked?: boolean
  notes?: { text: string; alert: boolean; by: string; at: string }[]
  /** Explicit history (newest first); the rest is generated back from `last`. */
  history?: { date: string; service: string; status: BookingStatus }[]
  /** Usual service when history is generated. */
  usual?: string
}

/** Glow Studio's client list (business demo `clients`). */
export const GLOW_CLIENTS: DemoClient[] = [
  {
    key: 'c1',
    name: 'Gülälek N.',
    fullName: 'Gülälek Nurmuhammedowa',
    phone: '+99365447019',
    visits: 12,
    last: '2026-09-28',
    since: '2024-03-10',
    tags: ['Yzygiderli', 'VIP'],
    source: 'instagram',
    noShows: 1,
    notes: [
      { text: 'Ammiaksyz reňk ulanmaly — allergiýa.', alert: true, by: 'ayna', at: '2026-08-12' },
      { text: 'Diňe irden gelip bilýär, günortandan soň ýazmaň.', alert: false, by: 'selbi', at: '2026-07-03' },
    ],
    history: [
      { date: '2026-09-28', service: 's3', status: 'completed' },
      { date: '2026-09-07', service: 's1', status: 'completed' },
      { date: '2026-08-19', service: 's2', status: 'noshow' },
      { date: '2026-08-02', service: 's6', status: 'completed' },
    ],
    usual: 's3',
  },
  {
    key: 'c2',
    name: 'Ogulşat M.',
    phone: '+99365217703',
    visits: 7,
    last: DEMO_DAY,
    tags: ['Yzygiderli'],
    source: 'yeral',
    history: [{ date: '2026-10-06', service: 's6', status: 'completed' }],
    usual: 's1',
  },
  { key: 'c3', name: 'Aýjemal Gurbanowa', phone: '+99365901122', visits: 3, last: '2026-09-18', tags: [], source: 'yeral', usual: 's1' },
  {
    key: 'c4',
    name: 'Sona P.',
    phone: '+99362338107',
    visits: 14,
    last: '2026-10-01',
    tags: ['VIP', 'Yzygiderli'],
    source: 'referral',
    usual: 's9',
  },
  {
    key: 'c5',
    name: 'Bahar A.',
    phone: '+99365703318',
    visits: 9,
    last: '2026-09-23',
    tags: ['Yzygiderli'],
    source: 'instagram',
    history: [
      { date: '2026-09-23', service: 's6', status: 'completed' },
      { date: '2026-09-21', service: 's8', status: 'completed' },
    ],
    usual: 's6',
  },
  { key: 'c6', name: 'Mähri G.', phone: '+99361304492', visits: 4, last: '2026-10-02', tags: [], source: 'yeral', usual: 's5' },
  {
    key: 'c7',
    name: 'Ogulnabat Ç.',
    phone: '+99362186005',
    visits: 3,
    last: '2026-09-10',
    tags: ['Arz edilen'],
    noShows: 2,
    onlineBlocked: true,
    notes: [{ text: '2 gezek gelmedi — diňe jaň arkaly ýazyň.', alert: true, by: 'selbi', at: DEMO_DAY }],
    history: [{ date: '2026-09-24', service: 's8', status: 'noshow' }],
    usual: 's8',
  },
  { key: 'c8', name: 'Merjen K.', phone: '+99365029166', visits: 5, last: DEMO_DAY, tags: [], source: 'walkby', usual: 's2' },
  {
    key: 'c9',
    name: 'Läle O.',
    phone: '+99363472551',
    visits: 2,
    last: '2026-09-20',
    tags: ['Täze'],
    source: 'instagram',
    since: '2026-09-20',
    usual: 's6',
  },
  {
    key: 'c10',
    name: 'Döwlet B.',
    phone: '+99365661022',
    visits: 6,
    last: '2026-09-16',
    tags: ['Çaga'],
    source: 'referral',
    notes: [{ text: 'Ejesi Jahan getirýär, telefon ejesiniňki.', alert: false, by: 'ayna', at: '2026-09-16' }],
    usual: 's4',
  },
  { key: 'c11', name: 'Mahym D.', phone: '+99365374820', visits: 4, last: '2026-07-03', tags: [], source: 'yeral', usual: 's5' },
  { key: 'c12', name: 'Ejegyz T.', phone: '+99364551280', visits: 0, tags: ['Täze'], source: 'yeral' },
  // on the demo day's calendar but not in the list screen
  { key: 'aysoltan', name: 'Aýsoltan R.', phone: '+99365120301', visits: 1, last: '2026-09-02', tags: [], source: 'yeral', usual: 's2' },
  { key: 'aygul', name: 'Aýgül R.', phone: '+99365120302', visits: 1, last: DEMO_DAY, tags: [], source: 'yeral' },
  { key: 'jemal', name: 'Jemal S.', phone: '+99365120303', visits: 2, last: '2026-08-30', tags: [], source: 'yeral', usual: 's7' },
  { key: 'jahan', name: 'Jahan M.', phone: '+99365120304', visits: 1, last: '2026-09-05', tags: [], source: 'yeral', usual: 's5' },
  { key: 'nurjahan', name: 'Nurjahan A.', phone: '+99365120305', visits: 2, last: '2026-09-15', tags: [], source: 'walkby', usual: 's11' },
  { key: 'gozel', name: 'Gözel A.', phone: '+99365120306', visits: 0, tags: [], source: 'yeral' },
  { key: 'merdan', name: 'Merdan K.', phone: '+99365120307', visits: 1, last: '2026-09-29', tags: [], source: 'yeral', usual: 's10' },
  { key: 'arzygul', name: 'Arzygül H.', phone: '+99364720318', visits: 0, tags: ['Täze'], source: 'yeral' },
]

export interface DemoDayBooking {
  key: string
  client: string
  staff: string
  service: string
  date: string
  from: string
  status: BookingStatus
  cancelledBy?: CancelledBy
  source: 'web' | 'phone' | 'walkin'
  /** Minutes the request still holds its slot. */
  hold?: number
  clientNote?: string
  code?: string
}

/** Glow Studio's demo-day calendar (business demo `calendarDay`) and the two requests on later days. */
export const GLOW_BOOKINGS: DemoDayBooking[] = [
  { key: 'b01', client: 'c2', staff: 'ayna', service: 's1', date: DEMO_DAY, from: '09:00', status: 'completed', source: 'web' },
  { key: 'b02', client: 'c8', staff: 'ayna', service: 's2', date: DEMO_DAY, from: '10:15', status: 'completed', source: 'phone' },
  { key: 'b03', client: 'c1', staff: 'ayna', service: 's3', date: DEMO_DAY, from: '11:30', status: 'confirmed', source: 'web' },
  {
    key: 'b04',
    client: 'c12',
    staff: 'ayna',
    service: 's1',
    date: DEMO_DAY,
    from: '15:30',
    status: 'pending',
    source: 'web',
    hold: 18,
    clientNote: 'Saçym uzyn, ujuny diňe 5 sm kesmeli',
  },
  { key: 'b05', client: 'c10', staff: 'ayna', service: 's4', date: DEMO_DAY, from: '17:00', status: 'confirmed', source: 'phone' },
  { key: 'b06', client: 'aysoltan', staff: 'ayna', service: 's2', date: DEMO_DAY, from: '18:00', status: 'confirmed', source: 'web' },
  { key: 'b07', client: 'aygul', staff: 'maral', service: 's5', date: DEMO_DAY, from: '09:30', status: 'completed', source: 'web' },
  { key: 'b08', client: 'c5', staff: 'maral', service: 's6', date: DEMO_DAY, from: '11:00', status: 'confirmed', source: 'web' },
  { key: 'b09', client: 'jemal', staff: 'maral', service: 's7', date: DEMO_DAY, from: '13:00', status: 'confirmed', source: 'web' },
  {
    key: 'b17',
    client: 'jahan',
    staff: 'maral',
    service: 's5',
    date: DEMO_DAY,
    from: '15:00',
    status: 'cancelled',
    cancelledBy: 'client',
    source: 'web',
  },
  { key: 'b10', client: 'c6', staff: 'maral', service: 's5', date: DEMO_DAY, from: '16:00', status: 'pending', source: 'web', hold: 24 },
  { key: 'b11', client: 'c9', staff: 'maral', service: 's6', date: DEMO_DAY, from: '18:00', status: 'confirmed', source: 'phone' },
  { key: 'b12', client: 'c7', staff: 'jeren', service: 's8', date: DEMO_DAY, from: '10:00', status: 'noshow', source: 'web' },
  { key: 'b13', client: 'c4', staff: 'jeren', service: 's9', date: DEMO_DAY, from: '15:00', status: 'confirmed', source: 'web' },
  { key: 'b14', client: 'nurjahan', staff: 'leyli', service: 's11', date: DEMO_DAY, from: '12:00', status: 'confirmed', source: 'phone' },
  {
    key: 'b15',
    client: 'gozel',
    staff: 'leyli',
    service: 's10',
    date: DEMO_DAY,
    from: '16:30',
    status: 'pending',
    source: 'web',
    hold: 21,
  },
  { key: 'b16', client: 'merdan', staff: 'leyli', service: 's10', date: DEMO_DAY, from: '18:00', status: 'confirmed', source: 'web' },
  // requests on later days (business demo `otherRequests`); b18 is the client demo's YR-48213
  {
    key: 'b18',
    client: 'c3',
    staff: 'ayna',
    service: 's1',
    date: '2026-10-15',
    from: '14:30',
    status: 'pending',
    source: 'web',
    hold: 28,
    clientNote: 'Saçym uzyn, reňk saýlamakda kömek gerek',
    code: 'YR-48213',
  },
  {
    key: 'b19',
    client: 'arzygul',
    staff: 'jeren',
    service: 's8',
    date: '2026-10-16',
    from: '10:00',
    status: 'pending',
    source: 'web',
    hold: 12,
  },
]

/** Glow Studio's reviews on the business page (client demo `reviews`), on the client's latest visit for that service. */
export const GLOW_REVIEWS = [
  {
    client: 'c1',
    rating: 5,
    daysAgo: 2,
    service: 's1',
    text: 'Aýna saçymy edil isleýşim ýaly kesdi. Wagtynda kabul etdiler, salon arassa we rahat.',
    reply: 'Sag boluň, Gülälek! Ýene garaşýarys.',
  },
  { client: 'c2', rating: 5, daysAgo: 7, service: 's6', text: 'Maral örän üns berip işleýär. Gel-lak üç hepde saklandy.' },
  { client: 'c5', rating: 4, daysAgo: 21, service: 's8', text: 'Hyzmat gowy, ýöne başlamazdan öň biraz garaşmaly boldum.' },
]

/** Aýjemal's bookings at other businesses (client demo `myBookings`). */
export const AYJEMAL_BOOKINGS: {
  code: string
  business: string
  type: BookingType
  date: string
  from: string
  status: BookingStatus
  cancelledBy?: CancelledBy
  reason?: string
  service?: string
  staff?: string
  partySize?: number
  area?: string
  session?: { start: string }
  seats?: number
  review?: number
}[] = [
  {
    code: 'YR-47990',
    business: 'bag-kafe',
    type: 'table',
    date: '2026-10-17',
    from: '19:00',
    status: 'confirmed',
    partySize: 4,
    area: 'terrace',
  },
  {
    code: 'YR-47702',
    business: 'aydyn-yoga',
    type: 'class',
    date: '2026-10-19',
    from: '08:00',
    status: 'confirmed',
    session: { start: '08:00' },
    seats: 1,
  },
  {
    code: 'YR-46511',
    business: 'ak-dis',
    type: 'appointment',
    date: '2026-10-02',
    from: '10:00',
    status: 'completed',
    service: 'ad1',
    staff: 'dowlet',
  },
  {
    code: 'YR-45320',
    business: 'nail-bar-ayna',
    type: 'appointment',
    date: '2026-09-20',
    from: '12:00',
    status: 'completed',
    service: 'nb1',
    staff: 'maral-n',
    review: 5,
  },
  {
    code: 'YR-44987',
    business: 'rahat-spa',
    type: 'appointment',
    date: '2026-09-12',
    from: '16:00',
    status: 'cancelled',
    cancelledBy: 'client',
    service: 'rs1',
    staff: 'leyli-r',
  },
  {
    code: 'YR-44650',
    business: 'ojak',
    type: 'table',
    date: '2026-09-05',
    from: '19:30',
    status: 'cancelled',
    cancelledBy: 'business',
    reason: 'Şol gün ýapyk',
    partySize: 2,
    area: 'hall',
  },
  {
    code: 'YR-43108',
    business: 'pamyk',
    type: 'appointment',
    date: '2026-08-28',
    from: '11:00',
    status: 'noshow',
    service: 'pm1',
    staff: 'leyla',
  },
]

/** "Nirede?" suggestions near the demo businesses. */
export const PLACES: { label: Localized; distanceKm: number; bearing: number }[] = [
  { label: L('Bitarap Türkmenistan şaýoly', 'проспект Битарап Туркменистан', 'Bitarap Turkmenistan avenue'), distanceKm: 2.5, bearing: 0 },
  { label: L('Magtymguly şaýoly', 'проспект Махтумкули', 'Magtymguly avenue'), distanceKm: 1.5, bearing: 45 },
  { label: L('Atatürk köçesi', 'улица Ататюрка', 'Atatürk street'), distanceKm: 2.6, bearing: 300 },
  { label: L('Görogly köçesi', 'улица Гёроглы', 'Görogly street'), distanceKm: 2.1, bearing: 150 },
  { label: L('Garaşsyzlyk şaýoly', 'проспект Гарашсызлык', 'Garashsyzlyk avenue'), distanceKm: 2.8, bearing: 80 },
  { label: L('Parahat', 'Парахат', 'Parahat'), distanceKm: 3.5, bearing: 205 },
  { label: L('Arçabil şaýoly', 'проспект Арчабиль', 'Archabil avenue'), distanceKm: 4.2, bearing: 170 },
]

export { NO_BREAKS }
