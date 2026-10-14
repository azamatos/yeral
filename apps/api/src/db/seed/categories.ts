/**
 * The 13 launch categories (design: `screens/system/DS-Booking.dc.html` "Categories", Home tiles). They belong to the
 * CMS catalogue (M6); until then this seed is the catalogue, in production too. RU/EN of the hints and the specialist
 * words are drafts for the native review; SEO intros are CMS content and start empty.
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
const svc = (name: Localized, durationMin: number, type: StarterService['price']['type'], amount: number): StarterService => ({
  name,
  durationMin,
  price: { type, amount },
})

export const CATEGORIES: CategorySeed[] = [
  {
    id: 'beauty',
    icon: 'sparkles',
    name: L('Gözellik', 'Красота', 'Beauty'),
    hint: L('Saç, kosmetolog', 'Волосы, косметолог', 'Hair, beautician'),
    bookingTypes: ['appointment'],
    specialistWord: L('hünärmen', 'мастер', 'specialist'),
    starterServices: [
      svc(L('Saç kesimi', 'Стрижка', 'Haircut'), 60, 'fixed', 80),
      svc(L('Saç reňklemek', 'Окрашивание', 'Hair colouring'), 120, 'from', 250),
      svc(L('Ýüz arassalamak', 'Чистка лица', 'Facial cleansing'), 60, 'fixed', 150),
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
      svc(L('Erkek saç kesimi', 'Мужская стрижка', "Men's haircut"), 45, 'from', 40),
      svc(L('Sakgal düzediş', 'Оформление бороды', 'Beard trim'), 30, 'fixed', 30),
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
      svc(L('Manikýur', 'Маникюр', 'Manicure'), 60, 'fixed', 70),
      svc(L('Pedikýur', 'Педикюр', 'Pedicure'), 75, 'fixed', 90),
      svc(L('Gel-lak', 'Гель-лак', 'Gel polish'), 90, 'fixed', 110),
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
      svc(L('Arka massažy', 'Массаж спины', 'Back massage'), 30, 'fixed', 90),
      svc(L('Doly beden massažy', 'Массаж всего тела', 'Full body massage'), 60, 'fixed', 160),
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
      svc(L('Barlag', 'Осмотр', 'Check-up'), 30, 'fixed', 50),
      svc(L('Arassalamak', 'Чистка', 'Cleaning'), 60, 'fixed', 200),
      svc(L('Plomba', 'Пломба', 'Filling'), 60, 'from', 250),
    ],
  },
  {
    id: 'health',
    icon: 'stethoscope',
    name: L('Saglyk', 'Здоровье', 'Health'),
    hint: L('Fizioterapiýa, psiholog', 'Физиотерапия, психолог', 'Physio, psychologist'),
    bookingTypes: ['appointment'],
    specialistWord: L('lukman', 'врач', 'doctor'),
    starterServices: [
      svc(L('Fizioterapiýa', 'Физиотерапия', 'Physiotherapy'), 45, 'from', 120),
      svc(L('Psiholog bilen söhbet', 'Консультация психолога', 'Psychologist session'), 50, 'fixed', 200),
    ],
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
    starterServices: [svc(L('Şahsy türgenleşik', 'Персональная тренировка', 'Personal training'), 60, 'fixed', 100)],
  },
  {
    id: 'education',
    icon: 'graduation-cap',
    name: L('Okuw', 'Обучение', 'Lessons'),
    hint: L('Repetitor, dil kursy', 'Репетитор, языки', 'Tutor, languages'),
    bookingTypes: ['appointment', 'class'],
    specialistWord: L('mugallym', 'преподаватель', 'teacher'),
    starterServices: [svc(L('Repetitor sapagy', 'Занятие с репетитором', 'Tutoring lesson'), 60, 'fixed', 80)],
  },
  {
    id: 'auto',
    icon: 'car',
    name: L('Awtoulag', 'Авто', 'Auto'),
    hint: L('Ýuwmak, diagnostika', 'Мойка, диагностика', 'Wash, diagnostics'),
    bookingTypes: ['appointment'],
    specialistWord: L('ussa', 'мастер', 'mechanic'),
    starterServices: [
      svc(L('Awtoulag ýuwmak', 'Мойка', 'Car wash'), 45, 'from', 60),
      svc(L('Tigir çalyşmak', 'Шиномонтаж', 'Tyre change'), 60, 'fixed', 120),
      svc(L('Diagnostika', 'Диагностика', 'Diagnostics'), 60, 'from', 150),
    ],
  },
  {
    id: 'pets',
    icon: 'paw-print',
    name: L('Öý haýwanlary', 'Питомцы', 'Pets'),
    hint: L('Groming, weterinar', 'Груминг, ветеринар', 'Grooming, vet'),
    bookingTypes: ['appointment'],
    specialistWord: L('hünärmen', 'мастер', 'groomer'),
    starterServices: [svc(L('Groming', 'Груминг', 'Grooming'), 90, 'from', 80)],
  },
  {
    id: 'home',
    icon: 'house',
    name: L('Öý hyzmatlary', 'Услуги на дому', 'Home services'),
    hint: L('Arassaçylyk, santehnik', 'Уборка, сантехник', 'Cleaning, plumber'),
    bookingTypes: ['appointment'],
    specialistWord: L('ussa', 'мастер', 'pro'),
    starterServices: [
      svc(L('Öý arassaçylygy', 'Уборка квартиры', 'Home cleaning'), 180, 'from', 200),
      svc(L('Santehnik', 'Сантехник', 'Plumber'), 60, 'from', 100),
    ],
  },
]
