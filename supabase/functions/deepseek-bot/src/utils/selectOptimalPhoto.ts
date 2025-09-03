// Утилита для выбора оптимального PhotoSize: выбираем версию с max(width, height) ближайшим к 320 сверху.
// Если есть несколько с размером ≥ 320, выбираем ту, у которой max(width, height) минимален.
// Если ни одной ≥ 320 нет, выбираем самую большую из доступных.
export function selectOptimalPhoto(
  photos: Array<{ file_id: string; width: number; height: number }>,
) {
  console.log("photos", photos);
  // Вычислим массив объектов с полем size = max(width, height)
  const withSize = photos.map((p) => ({
    file_id: p.file_id,
    width: p.width,
    height: p.height,
    size: Math.max(p.width, p.height),
  }));

  // Фильтруем те, у которых size >= 320
  const aboveThreshold = withSize.filter((p) => p.size >= 320);

  if (aboveThreshold.length > 0) {
    // Из тех, что ≥ 320, берём с минимальным size
    aboveThreshold.sort((a, b) => a.size - b.size);
    console.log("result", aboveThreshold[0]);
    return {
      file_id: aboveThreshold[0].file_id,
      width: aboveThreshold[0].width,
      height: aboveThreshold[0].height,
    };
  }

  // Если ни одного ≥ 320, выбираем максимальный по size
  withSize.sort((a, b) => b.size - a.size);
  console.log("result", withSize[0]);
  return {
    file_id: withSize[0].file_id,
    width: withSize[0].width,
    height: withSize[0].height,
  };
}
