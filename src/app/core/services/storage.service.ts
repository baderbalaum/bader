import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private storage = inject(Storage);

  async uploadItemImage(catKey: string, itemId: number, file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const fileRef = ref(this.storage, `menu-images/${catKey}/${itemId}.${ext}`);
    const snapshot = await uploadBytes(fileRef, file);
    return getDownloadURL(snapshot.ref);
  }

  async deleteItemImage(catKey: string, itemId: number): Promise<void> {
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      try {
        await deleteObject(ref(this.storage, `menu-images/${catKey}/${itemId}.${ext}`));
        return;
      } catch {
        // try next extension
      }
    }
  }
}
