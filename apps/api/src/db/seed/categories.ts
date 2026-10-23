/**
 * The 13 launch categories (design: `screens/system/DS-Booking.dc.html` "Categories", Home tiles). They belong to the
 * CMS catalogue (M6); until then this seed is the catalogue, in production too. RU/EN of the hints and the specialist
 * words are drafts for the native review; SEO intros are CMS content and start empty. The starter services are the
 * setup wizard's step 5 (`screens/business/B-Onboarding.dc.html`, `starter(cat)`: groups, names, minutes, TMT, "from");
 * their TK/RU are drafts for the native review too.
 */
import type { BookingType, Localized } from '@yeral/domain/model'
import type { StarterService } from '../schema'

export interface CategorySeed {
  id: string
  icon: string
  name: Localized
  hint: Localized
  bookingTypes: BookingType[]
  specialistWord: Localized
  starterServices: StarterService[]
}

const L = (tk: string, ru: string, en: string): Localized => ({ tk, ru, en })
type Starter = [name: Localized, durationMin: number, amount: number, from?: 'from']
/** One group of starter services: `[name, minutes, TMT]`, with `'from'` for a price that starts there. */
const group = (name: Localized, ...rows: Starter[]): StarterService[] =>
  rows.map(([svc, durationMin, amount, from]) => ({ group: name, name: svc, durationMin, price: { type: from ?? 'fixed', amount } }))

export const CATEGORIES: CategorySeed[] = [
  {
    id: 'beauty',
    icon: 'sparkles',
    name: L('Gözellik', 'Красота', 'Beauty'),
    hint: L('Saç, kosmetolog', 'Волосы, косметолог', 'Hair, beautician'),
    bookingTypes: ['appointment'],
    specialistWord: L('hünärmen', 'мастер', 'specialist'),
    starterServices: [
      ...group(
        L('Saç', 'Волосы', 'Hair'),
        [L('Aýal saç kesimi', 'Женская стрижка', 'Women’s haircut'), 60, 80],
        [L('Saç düzmek', 'Укладка', 'Hair styling'), 45, 60],
        [L('Saç reňklemek', 'Окрашивание', 'Hair colouring'), 120, 250, 'from'],
        [L('Çaga saç kesimi', 'Детская стрижка', 'Children’s haircut'), 30, 40],
      ),
      ...group(
        L('Dyrnak', 'Ногти', 'Nails'),
        [L('Manikýur', 'Маникюр', 'Manicure'), 60, 70],
        [L('Gel manikýur', 'Гель-маникюр', 'Gel manicure'), 90, 110],
        [L('Pedikýur', 'Педикюр', 'Pedicure'), 75, 90],
      ),
      ...group(
        L('Ýüz', 'Лицо', 'Face'),
        [L('Ýüz arassalamak', 'Чистка лица', 'Facial cleansing'), 60, 150],
        [L('Gaş we kirpik', 'Брови и ресницы', 'Brows and lashes'), 30, 50],
      ),
      ...group(
        L('Massaž', 'Массаж', 'Massage'),
        [L('Arka massažy', 'Массаж спины', 'Back massage'), 30, 90],
        [L('Doly beden massažy', 'Массаж всего тела', 'Full body massage'), 60, 160],
      ),
    ],
  },
  {
    id: 'barber',
    icon: 'scissors',
    name: L('Dellekhana', 'Барбершоп', 'Barbershop'),
    hint: L('Saç, sakgal', 'Стрижка, борода', 'Hair, beard'),
    bookingTypes: ['appointment'],
    specialistWord: L('dellek', 'барбер', 'barber'),
    starterServices: [
      ...group(
        L('Saç kesimi', 'Стрижки', 'Haircuts'),
        [L('Erkek saç kesimi', 'Мужская стрижка', 'Men’s haircut'), 45, 60],
        [L('Çaga saç kesimi', 'Детская стрижка', 'Children’s haircut'), 30, 40],
      ),
      ...group(
        L('Sakgal', 'Борода', 'Beard'),
        [L('Sakgal düzediş', 'Оформление бороды', 'Beard trim'), 30, 40],
        [L('Saç we sakgal', 'Стрижка и борода', 'Haircut and beard'), 60, 90],
      ),
    ],
  },
  {
    id: 'nails',
    icon: 'hand',
    name: L('Dyrnak', 'Ногти', 'Nails'),
    hint: L('Manikýur, pedikýur', 'Маникюр, педикюр', 'Manicure, pedicure'),
    bookingTypes: ['appointment'],
    specialistWord: L('ussa', 'мастер', 'nail technician'),
    starterServices: [
      ...group(
        L('Eller', 'Руки', 'Hands'),
        [L('Manikýur', 'Маникюр', 'Manicure'), 60, 70],
        [L('Gel manikýur', 'Гель-маникюр', 'Gel manicure'), 90, 110],
      ),
      ...group(
        L('Aýaklar', 'Ноги', 'Feet'),
        [L('Pedikýur', 'Педикюр', 'Pedicure'), 75, 90],
        [L('Gel pedikýur', 'Гель-педикюр', 'Gel pedicure'), 90, 120],
      ),
    ],
  },
  {
    id: 'spa',
    icon: 'flower-2',
    name: L('Spa we massaž', 'Спа и массаж', 'Spa & massage'),
    hint: L('Massaž, ýüz ideg', 'Массаж, уход за лицом', 'Massage, facials'),
    bookingTypes: ['appointment'],
    specialistWord: L('hünärmen', 'мастер', 'therapist'),
    starterServices: [
      ...group(
        L('Massaž', 'Массаж', 'Massage'),
        [L('Arka massažy', 'Массаж спины', 'Back massage'), 30, 90],
        [L('Doly beden massažy', 'Массаж всего тела', 'Full body massage'), 60, 160],
      ),
      ...group(
        L('Spa', 'Спа', 'Spa'),
        [L('Ýüz arassalamak', 'Чистка лица', 'Facial cleansing'), 60, 150],
        [L('Spa dessury', 'Спа-ритуал', 'Spa ritual'), 90, 250],
      ),
    ],
  },
  {
    id: 'dental',
    icon: 'smile',
    name: L('Diş lukmany', 'Стоматология', 'Dentist'),
    hint: L('Barlag, arassalamak', 'Осмотр, чистка', 'Check-up, cleaning'),
    bookingTypes: ['appointment'],
    specialistWord: L('lukman', 'врач', 'dentist'),
    starterServices: [
      ...group(
        L('Kabul', 'Приём', 'Visits'),
        [L('Barlag', 'Осмотр', 'Check-up'), 30, 100],
        [L('Diş arassalamak', 'Чистка зубов', 'Teeth cleaning'), 60, 250],
      ),
      ...group(
        L('Bejergi', 'Лечение', 'Treatment'),
        [L('Plomba', 'Пломба', 'Filling'), 60, 300, 'from'],
        [L('Diş agartmak', 'Отбеливание', 'Whitening'), 90, 600],
      ),
    ],
  },
  {
    id: 'health',
    icon: 'stethoscope',
    name: L('Saglyk', 'Здоровье', 'Health'),
    hint: L('Fizioterapiýa, psiholog', 'Физиотерапия, психолог', 'Physio, psychologist'),
    bookingTypes: ['appointment'],
    specialistWord: L('lukman', 'врач', 'doctor'),
    starterServices: group(
      L('Kabul', 'Приём', 'Appointments'),
      [L('Lukman kabuly', 'Приём врача', 'Doctor’s appointment'), 30, 150],
      [L('Fizioterapiýa', 'Сеанс физиотерапии', 'Physiotherapy session'), 45, 200],
      [L('Psiholog bilen söhbet', 'Консультация психолога', 'Psychologist session'), 60, 250],
    ),
  },
  {
    id: 'restaurant',
    icon: 'utensils',
    name: L('Restoran', 'Ресторан', 'Restaurant'),
    hint: L('Stol, banket', 'Столик, банкет', 'Table, banquet'),
    bookingTypes: ['table'],
    specialistWord: L('hünärmen', 'сотрудник', 'staff'),
    starterServices: [],
  },
  {
    id: 'cafe',
    icon: 'coffee',
    name: L('Kafe we çaýhana', 'Кафе и чайхана', 'Café & tea house'),
    hint: L('Stol, terrasa', 'Столик, терраса', 'Table, terrace'),
    bookingTypes: ['table'],
    specialistWord: L('hünärmen', 'сотрудник', 'staff'),
    starterServices: [],
  },
  {
    id: 'sport',
    icon: 'dumbbell',
    name: L('Sport', 'Спорт', 'Fitness'),
    hint: L('Topar, tälimçi', 'Группы, тренер', 'Classes, trainer'),
    bookingTypes: ['class', 'appointment'],
    specialistWord: L('tälimçi', 'тренер', 'trainer'),
    starterServices: group(
      L('Türgenleşik', 'Тренировки', 'Training'),
      [L('Şahsy türgenleşik', 'Персональная тренировка', 'Personal training'), 60, 150],
      [L('Synag türgenleşigi', 'Пробное занятие', 'Trial session'), 30, 50],
      [L('Stretçing', 'Растяжка', 'Stretching session'), 60, 120],
    ),
  },
  {
    id: 'education',
    icon: 'graduation-cap',
    name: L('Okuw', 'Обучение', 'Lessons'),
    hint: L('Repetitor, dil kursy', 'Репетитор, языки', 'Tutor, languages'),
    bookingTypes: ['appointment', 'class'],
    specialistWord: L('mugallym', 'преподаватель', 'teacher'),
    starterServices: group(
      L('Sapaklar', 'Занятия', 'Lessons'),
      [L('Sapak', 'Занятие', 'Lesson'), 60, 100],
      [L('Synag sapagy', 'Пробное занятие', 'Trial lesson'), 30, 50],
      [L('Ekzamene taýýarlyk', 'Подготовка к экзамену', 'Exam preparation'), 90, 150],
    ),
  },
  {
    id: 'auto',
    icon: 'car',
    name: L('Awtoulag', 'Авто', 'Auto'),
    hint: L('Ýuwmak, diagnostika', 'Мойка, диагностика', 'Wash, diagnostics'),
    bookingTypes: ['appointment'],
    specialistWord: L('ussa', 'мастер', 'mechanic'),
    starterServices: [
      ...group(
        L('Ýuwmak', 'Мойка', 'Wash'),
        [L('Awtoulag ýuwmak', 'Мойка', 'Car wash'), 30, 60],
        [L('Salon arassalamak', 'Химчистка салона', 'Interior cleaning'), 60, 120],
      ),
      ...group(
        L('Hyzmat', 'Сервис', 'Service'),
        [L('Tigir çalyşmak', 'Шиномонтаж', 'Tyre change'), 45, 150],
        [L('Ýag çalyşmak', 'Замена масла', 'Oil change'), 30, 100, 'from'],
      ),
    ],
  },
  {
    id: 'pets',
    icon: 'paw-print',
    name: L('Öý haýwanlary', 'Питомцы', 'Pets'),
    hint: L('Groming, weterinar', 'Груминг, ветеринар', 'Grooming, vet'),
    bookingTypes: ['appointment'],
    specialistWord: L('hünärmen', 'мастер', 'groomer'),
    starterServices: group(
      L('Groming', 'Груминг', 'Grooming'),
      [L('It groming', 'Груминг собак', 'Dog grooming'), 90, 200, 'from'],
      [L('Pişik groming', 'Груминг кошек', 'Cat grooming'), 60, 180],
      [L('Ýuwmak we guratmak', 'Мытьё и сушка', 'Bath and dry'), 45, 120],
      [L('Dyrnak kesmek', 'Стрижка когтей', 'Nail trim'), 15, 40],
    ),
  },
  {
    id: 'home',
    icon: 'house',
    name: L('Öý hyzmatlary', 'Услуги на дому', 'Home services'),
    hint: L('Arassaçylyk, santehnik', 'Уборка, сантехник', 'Cleaning, plumber'),
    bookingTypes: ['appointment'],
    specialistWord: L('ussa', 'мастер', 'pro'),
    starterServices: group(
      L('Öýde', 'На дому', 'Home'),
      [L('Arassaçylyk', 'Уборка', 'Cleaning'), 120, 300, 'from'],
      [L('Abatlaýyş', 'Выезд мастера', 'Repair visit'), 60, 150, 'from'],
      [L('Enjam oturtmak', 'Установка техники', 'Appliance installation'), 60, 200],
    ),
  },
]
