import { toPng } from 'html-to-image';

export async function exportChartAsPng(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await toPng(element, {
    backgroundColor: '#1D1D1D',
    pixelRatio: 2,
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}
