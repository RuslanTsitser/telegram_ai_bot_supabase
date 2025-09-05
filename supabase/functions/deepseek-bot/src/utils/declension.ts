/**
 * Утилита для склонения русских слов с числительными
 *
 * @param count - число
 * @param forms - массив из трех форм слова: [форма для 1, форма для 2-4, форма для 5+]
 * @returns правильно склоненное слово
 *
 * @example
 * declension(1, ['день', 'дня', 'дней']) // "1 день"
 * declension(2, ['день', 'дня', 'дней']) // "2 дня"
 * declension(5, ['день', 'дня', 'дней']) // "5 дней"
 * declension(21, ['день', 'дня', 'дней']) // "21 день"
 */
export function declension(
  count: number,
  forms: [string, string, string],
): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  // Исключения для чисел от 11 до 19
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return forms[2]; // форма для 5+
  }

  // Для остальных чисел используем последнюю цифру
  if (lastDigit === 1) {
    return forms[0]; // форма для 1
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    return forms[1]; // форма для 2-4
  } else {
    return forms[2]; // форма для 5+
  }
}

/**
 * Форматирует число с правильно склоненным словом
 *
 * @param count - число
 * @param forms - массив из трех форм слова
 * @returns строка вида "X слово"
 *
 * @example
 * formatWithDeclension(3, ['день', 'дня', 'дней']) // "3 дня"
 */
export function formatWithDeclension(
  count: number,
  forms: [string, string, string],
): string {
  return `${count} ${declension(count, forms)}`;
}
