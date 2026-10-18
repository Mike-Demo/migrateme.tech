import JSZip from 'jszip';
import type { DestinationOutput } from './canonical';

export async function buildZip(output: DestinationOutput): Promise<Blob> {
  const zip = new JSZip();
  for (const file of output.files) {
    zip.file(file.path, file.content);
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
