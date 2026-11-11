import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'elapsedTime', pure: false })
export class ElapsedTimePipe implements PipeTransform {
  transform(createdAt: number): string {
    const m = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
    if (m < 1) return 'עכשיו';
    if (m < 60) return `${m} דק׳`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}ש ${mm}ד`;
  }

  elapsedMin(createdAt: number): number {
    return Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
  }
}
