const fs = require('fs');
const path = require('path');

// --- 1. Fix home.page.ts ---
let homeFile = path.join(__dirname, 'src/app/home/home.page.ts');
let homeContent = fs.readFileSync(homeFile, 'utf8');

if (!homeContent.includes('ActionSheetController')) {
  homeContent = homeContent.replace(
    `import { IonContent, IonFooter, IonHeader, IonToolbar, AlertController } from '@ionic/angular/standalone';`,
    `import { IonContent, IonFooter, IonHeader, IonToolbar, AlertController, ActionSheetController } from '@ionic/angular/standalone';`
  );
  homeContent = homeContent.replace(
    `import { imagesOutline, images, chatbubblesOutline, chatbubbles, add, hourglassOutline, mapOutline, map, ellipsisHorizontalOutline, ellipsisHorizontal, heart, happyOutline, sadOutline, flameOutline, bedOutline } from 'ionicons/icons';`,
    `import { imagesOutline, images, chatbubblesOutline, chatbubbles, add, hourglassOutline, mapOutline, map, ellipsisHorizontalOutline, ellipsisHorizontal, heart, happyOutline, sadOutline, flameOutline, bedOutline, camera, image, close } from 'ionicons/icons';`
  );
  homeContent = homeContent.replace(
    `addIcons({ imagesOutline, images, chatbubblesOutline, chatbubbles, add, hourglassOutline, mapOutline, map, ellipsisHorizontalOutline, ellipsisHorizontal, heart, happyOutline, sadOutline, flameOutline, bedOutline });`,
    `addIcons({ imagesOutline, images, chatbubblesOutline, chatbubbles, add, hourglassOutline, mapOutline, map, ellipsisHorizontalOutline, ellipsisHorizontal, heart, happyOutline, sadOutline, flameOutline, bedOutline, camera, image, close });`
  );
  homeContent = homeContent.replace(
    `  private alertController = inject(AlertController);`,
    `  private alertController = inject(AlertController);\n  private actionSheetCtrl = inject(ActionSheetController);`
  );
}

const homePhotoOptionsMethod = `  async presentPhotoOptions(callback: (source: CameraSource) => void) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Añadir Foto',
      cssClass: 'premium-action-sheet',
      buttons: [
        {
          text: 'Tomar Foto',
          icon: 'camera',
          handler: () => {
            callback(CameraSource.Camera);
          }
        },
        {
          text: 'De la Galería',
          icon: 'image',
          handler: () => {
            callback(CameraSource.Photos);
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async takePicture() {`;

homeContent = homeContent.replace(`  async takePicture() {`, homePhotoOptionsMethod);

const oldHomeTakePicture = `    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        direction: CameraDirection.Front, // Usar la cámara delantera por defecto
        promptLabelHeader: 'Añadir Foto',
        promptLabelCancel: 'Cancelar',
        promptLabelPhoto: 'De la Galería',
        promptLabelPicture: 'Tomar Foto'
      });

      if (image.webPath) {
        // Convert webPath to File object
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        this.pendingPhotoFile = new File([blob], "camera_photo.jpg", { type: blob.type });
        this.pendingPhotoPreview = URL.createObjectURL(this.pendingPhotoFile);
        this.pendingPhotoText = '';
      }
    } catch (e: any) {
      if (e.message && e.message.includes('User cancelled')) {
        console.log('User cancelled camera');
      } else {
        console.error(e);
      }
    }`;

const newHomeTakePicture = `    this.presentPhotoOptions(async (source) => {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: source,
          direction: CameraDirection.Front // Usar la cámara delantera por defecto
        });

        if (image.webPath) {
          // Convert webPath to File object
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          this.pendingPhotoFile = new File([blob], "camera_photo.jpg", { type: blob.type });
          this.pendingPhotoPreview = URL.createObjectURL(this.pendingPhotoFile);
          this.pendingPhotoText = '';
        }
      } catch (e: any) {
        if (e.message && e.message.includes('User cancelled')) {
          console.log('User cancelled camera');
        } else {
          console.error(e);
        }
      }
    });`;

homeContent = homeContent.replace(oldHomeTakePicture, newHomeTakePicture);
fs.writeFileSync(homeFile, homeContent, 'utf8');


// --- 2. Fix location-widget.component.ts ---
let locFile = path.join(__dirname, 'src/app/widgets/location-widget/location-widget.component.ts');
let locContent = fs.readFileSync(locFile, 'utf8');

if (!locContent.includes('ActionSheetController')) {
  locContent = locContent.replace(
    `import { IonIcon } from '@ionic/angular/standalone';`,
    `import { IonIcon, ActionSheetController } from '@ionic/angular/standalone';`
  );
  locContent = locContent.replace(
    `import { locateOutline, flagOutline } from 'ionicons/icons';`,
    `import { locateOutline, flagOutline, camera, image, close } from 'ionicons/icons';`
  );
  locContent = locContent.replace(
    `    addIcons({ locateOutline, flagOutline });`,
    `    addIcons({ locateOutline, flagOutline, camera, image, close });`
  );
  locContent = locContent.replace(
    `  private api = inject(LoveApiService);`,
    `  private api = inject(LoveApiService);\n  private actionSheetCtrl = inject(ActionSheetController);`
  );
}

const locPhotoOptionsMethod = `  async presentPhotoOptions(callback: (source: CameraSource) => void) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Cambiar Mi Foto',
      cssClass: 'premium-action-sheet',
      buttons: [
        { text: 'Tomar Foto', icon: 'camera', handler: () => callback(CameraSource.Camera) },
        { text: 'De la Galería', icon: 'image', handler: () => callback(CameraSource.Photos) },
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async changeMyAvatar() {`;

locContent = locContent.replace(`  async changeMyAvatar() {`, locPhotoOptionsMethod);

const oldLocAvatar = `    try {
      const image = await Camera.getPhoto({
        quality: 60, width: 300, height: 300, allowEditing: true, resultType: CameraResultType.DataUrl, source: CameraSource.Prompt,
        promptLabelHeader: 'Cambiar Mi Foto',
        promptLabelCancel: 'Cancelar',
        promptLabelPhoto: 'De la Galería',
        promptLabelPicture: 'Tomar Foto'
      });
      if (image.dataUrl) {
        this.uploadingAvatar = true;
        await this.locationService.uploadAvatar(this.myUserId, image.dataUrl);
        this.uploadingAvatar = false;
      }
    } catch (e) {
      this.uploadingAvatar = false;
    }`;

const newLocAvatar = `    this.presentPhotoOptions(async (source) => {
      try {
        const image = await Camera.getPhoto({
          quality: 60, width: 300, height: 300, allowEditing: true, resultType: CameraResultType.DataUrl, source: source
        });
        if (image.dataUrl) {
          this.uploadingAvatar = true;
          await this.locationService.uploadAvatar(this.myUserId, image.dataUrl);
          this.uploadingAvatar = false;
        }
      } catch (e) {
        this.uploadingAvatar = false;
      }
    });`;

locContent = locContent.replace(oldLocAvatar, newLocAvatar);
fs.writeFileSync(locFile, locContent, 'utf8');


// --- 3. Fix photo-widget.component.ts ---
let photoFile = path.join(__dirname, 'src/app/widgets/photo-widget/photo-widget.component.ts');
let photoContent = fs.readFileSync(photoFile, 'utf8');

const oldChangeCover = `  async changeAlbumCover(albumId: number, event: Event) {
    event.stopPropagation();
    
    try {
      const source = Capacitor.getPlatform() === 'web' ? CameraSource.Photos : CameraSource.Prompt;
      const image = await Camera.getPhoto({
        quality: 60, width: 600, height: 600, allowEditing: true, resultType: CameraResultType.DataUrl, source: source,
        promptLabelHeader: 'Cambiar Portada',
        promptLabelCancel: 'Cancelar',
        promptLabelPhoto: 'De la Galería',
        promptLabelPicture: 'Tomar Foto'
      });
      
      if (image.dataUrl) {
        // @ts-ignore
        await this.api.updateAlbumCover(albumId, image.dataUrl);
        this.loadData();
        this.showSuccess('Portada actualizada');
      }
    } catch (e) {
      console.log('User cancelled or error', e);
    }
  }`;

const newChangeCover = `  async changeAlbumCover(albumId: number, event: Event) {
    event.stopPropagation();
    
    this.presentPhotoOptions(async (source) => {
      try {
        const image = await Camera.getPhoto({
          quality: 60, width: 600, height: 600, allowEditing: true, resultType: CameraResultType.DataUrl, source: source
        });
        
        if (image.dataUrl) {
          // @ts-ignore
          await this.api.updateAlbumCover(albumId, image.dataUrl);
          this.loadData();
          this.showSuccess('Portada actualizada');
        }
      } catch (e) {
        console.log('User cancelled or error', e);
      }
    });
  }`;

photoContent = photoContent.replace(oldChangeCover, newChangeCover);

const oldUploadPhoto = `  async uploadNewPhoto() {
    if (this.currentAlbum) {
      // Preguntar si quiere tomar/subir foto o elegir de la app
      const actionSheet = await this.actionSheetCtrl.create({
        header: 'Añadir al álbum',
        cssClass: 'premium-action-sheet',
        buttons: [
          {
            text: 'Fotos de la app',
            icon: 'images',
            handler: () => {
              this.startAddingToAlbum();
            }
          },
          {
            text: 'Subir nueva',
            icon: 'cloud-upload',
            handler: () => {
              this.takeAndUploadPhoto();
            }
          },
          {
            text: 'Cancelar',
            icon: 'close',
            role: 'cancel'
          }
        ]
      });
      await actionSheet.present();
    } else {
      this.takeAndUploadPhoto();
    }
  }

  async takeAndUploadPhoto() {
    try {
      const source = Capacitor.getPlatform() === 'web' ? CameraSource.Photos : CameraSource.Prompt;
      const image = await Camera.getPhoto({
        quality: 70, width: 800, height: 800, allowEditing: false, resultType: CameraResultType.Uri, source: source,
        promptLabelHeader: 'Añadir Foto',
        promptLabelCancel: 'Cancelar',
        promptLabelPhoto: 'De la Galería',
        promptLabelPicture: 'Tomar Foto'
      });
      
      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        this.pendingPhotoFile = new File([blob], \`photo_\${new Date().getTime()}.jpg\`, { type: blob.type });
        this.pendingPhotoPreview = URL.createObjectURL(this.pendingPhotoFile);
        this.pendingPhotoText = '';
      }
    } catch (e) {
      console.log('User cancelled or error', e);
    }
  }`;

const newUploadPhoto = `  async uploadNewPhoto() {
    if (this.currentAlbum) {
      const actionSheet = await this.actionSheetCtrl.create({
        header: 'Añadir al álbum',
        cssClass: 'premium-action-sheet',
        buttons: [
          {
            text: 'Fotos de la app',
            icon: 'images',
            handler: () => {
              this.startAddingToAlbum();
            }
          },
          {
            text: 'Tomar Foto',
            icon: 'camera',
            handler: () => {
              this.takeAndUploadPhoto(CameraSource.Camera);
            }
          },
          {
            text: 'De la Galería',
            icon: 'image',
            handler: () => {
              this.takeAndUploadPhoto(CameraSource.Photos);
            }
          },
          {
            text: 'Cancelar',
            icon: 'close',
            role: 'cancel'
          }
        ]
      });
      await actionSheet.present();
    } else {
      this.presentPhotoOptions((source) => {
        this.takeAndUploadPhoto(source);
      });
    }
  }

  async takeAndUploadPhoto(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 70, width: 800, height: 800, allowEditing: false, resultType: CameraResultType.Uri, source: source
      });
      
      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        this.pendingPhotoFile = new File([blob], \`photo_\${new Date().getTime()}.jpg\`, { type: blob.type });
        this.pendingPhotoPreview = URL.createObjectURL(this.pendingPhotoFile);
        this.pendingPhotoText = '';
      }
    } catch (e) {
      console.log('User cancelled or error', e);
    }
  }`;

photoContent = photoContent.replace(oldUploadPhoto, newUploadPhoto);
fs.writeFileSync(photoFile, photoContent, 'utf8');

console.log('All 3 files patched successfully!');
