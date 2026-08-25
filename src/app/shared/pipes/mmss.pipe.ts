import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a number of seconds as `mm:ss`, zero-padded.
 * Used by every countdown readout so they stay identical.
 */
@Pipe({ name: 'mmss', standalone: false })
export class MmssPipe implements PipeTransform {
  transform(totalSeconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
