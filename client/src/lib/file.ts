export function scanFiles(entry: FileSystemEntry): Promise<File[]> {
  return new Promise((resolve) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file(
        (file) => {
          resolve([file]);
        },
        (err) => {
          console.error("Error reading file:", err);
          resolve([]);
        },
      );
    } else if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader();
      const readEntries = () => {
        dirReader.readEntries(
          async (entries) => {
            if (entries.length === 0) {
              resolve([]);
            } else {
              // 递归读取子目录
              const promises = entries.map((e) => scanFiles(e));
              const results = await Promise.all(promises);
              resolve(results.flat());
            }
          },
          (err) => {
            console.error("Error reading directory:", err);
            resolve([]);
          },
        );
      };
      readEntries();
    } else {
      resolve([]);
    }
  });
}
