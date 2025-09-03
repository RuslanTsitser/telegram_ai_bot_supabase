export async function getImageUrlFromTelegram(
  fileId: string,
  botToken: string,
): Promise<string | null> {
  const fileResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`,
  );
  const fileData = await fileResponse.json();

  if (!fileData.ok) {
    return null;
  }

  const filePath = fileData.result.file_path;
  const imageUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  return imageUrl;
}
