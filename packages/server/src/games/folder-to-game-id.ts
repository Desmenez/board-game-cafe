/**
 * แปลงชื่อโฟลเดอร์แรกใต้ `packages/{client|server}/src/games/<folder>/` เป็น `GameDefinition.id`
 * เพิ่ม mapping เฉพาะเมื่อชื่อโฟลเดอร์ไม่ตรงกับ id (เช่น server ใช้โฟลเดอร์ `sheriff` แต่ id เป็น `sheriff-of-nottingham`)
 */
export function folderSegmentToGameId(folder: string, source: 'client' | 'server'): string {
  if (source === 'server' && folder === 'sheriff') {
    return 'sheriff-of-nottingham';
  }
  return folder;
}
