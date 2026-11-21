import { currencyFromCode } from '../src/core/currency';
import { parseBankSms } from '../src/domain/smsParse';

const OMR = currencyFromCode('OMR');
const SAR = currencyFromCode('SAR');

test('Omani purchase alert in Arabic: amount in baisa, merchant and card', () => {
  const r = parseBankSms('عزيزي العميل، تم خصم OMR 18.750 من حسابك لدى LULU HYPERMARKET بالبطاقة المنتهية 1234 بتاريخ 21/11/2026', OMR);
  expect(r).toMatchObject({ kind: 'purchase', amountMinor: 18750, currencyCode: 'OMR', merchant: 'LULU HYPERMARKET', cardLast4: '1234', isCredit: false, foreignCurrency: false });
});

test('English purchase alert', () => {
  const r = parseBankSms('Purchase of SAR 120.50 at ALDREES STATION with card ending 4321', SAR);
  expect(r).toMatchObject({ kind: 'purchase', amountMinor: 12050, currencyCode: 'SAR', merchant: 'ALDREES STATION', cardLast4: '4321' });
});

test('Arabic-Indic digits and the Arabic decimal separator', () => {
  expect(parseBankSms('شراء بقيمة ٤٥٫٥٠ ر.س من كارفور', SAR)).toMatchObject({ amountMinor: 4550, currencyCode: 'SAR', merchant: 'كارفور' });
});

test('ATM withdrawal and transfer are their own kinds', () => {
  expect(parseBankSms('سحب نقدي بمبلغ OMR 50.000 من الصراف الآلي', OMR)).toMatchObject({ kind: 'withdrawal', amountMinor: 50000 });
  expect(parseBankSms('تم تحويل مبلغ OMR 100.000 إلى حساب آخر', OMR)).toMatchObject({ kind: 'transfer', amountMinor: 100000 });
});

test('a salary or refund is flagged as money coming in, never as spending', () => {
  const r = parseBankSms('تم إيداع راتب بمبلغ OMR 1,200.000 في حسابك', OMR);
  expect(r).toMatchObject({ kind: 'credit', isCredit: true, amountMinor: 1200000 });
});

test('the balance in the same message is not mistaken for the amount', () => {
  expect(parseBankSms('تم خصم OMR 12.000 لدى SHELL، الرصيد المتاح OMR 430.500', OMR)).toMatchObject({ amountMinor: 12000, merchant: 'SHELL' });
});

test('a foreign currency is reported as-is and never converted', () => {
  const r = parseBankSms('Purchase of SAR 300.00 at JARIR', OMR);
  expect(r).toMatchObject({ currencyCode: 'SAR', amountMinor: 30000, foreignCurrency: true });
});

test('nothing is invented: OTP, adverts and balance notices return null', () => {
  expect(parseBankSms('رمز التحقق الخاص بك هو 548213 لا تشاركه مع أحد. OMR', OMR)).toBeNull();
  expect(parseBankSms('Your OTP is 123456 for OMR 50.000 transaction. Do not share.', OMR)).toBeNull();
  expect(parseBankSms('الرصيد المتاح في حسابك OMR 430.500', OMR)).toBeNull();
  expect(parseBankSms('اربح سيارة مع بنكك! اتصل الآن', OMR)).toBeNull();
  expect(parseBankSms('تم خصم مبلغ من حسابك', OMR)).toBeNull();
  expect(parseBankSms('', OMR)).toBeNull();
});

test('no merchant in the message leaves the field empty rather than guessing', () => {
  expect(parseBankSms('تم خصم OMR 7.500 بالبطاقة المنتهية 9876', OMR)).toMatchObject({ amountMinor: 7500, merchant: null, cardLast4: '9876' });
});
